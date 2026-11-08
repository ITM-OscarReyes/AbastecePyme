"""Representación propia del grafo del catálogo.

Estructura definida en ``docs/graph-model.md``: un mapa de elementos por
``id`` y dos índices de adyacencia (salida y entrada) que se mantienen en la
misma operación de registro.

Además del catálogo, el agregado aplica las reglas de dependencia permitidas
entre tipos de elemento y mantiene la integridad de la red cuando se edita o
elimina un elemento o una relación. El catálogo vacío es un estado válido.

F3 añade sobre esta representación el cálculo del orden de preparación
(ordenamiento topológico determinista de Kahn) y la detección y reporte
estructurado de ciclos (búsqueda en profundidad con colores), todo propio del
proyecto y sin bibliotecas de terceros (RNF-F3-01, AC-F3-08).
"""

import bisect
from dataclasses import dataclass

from app.dominio.dependencia import Dependencia
from app.dominio.elemento import Elemento
from app.dominio.errores import (
    DependenciaDuplicada,
    DependenciaInvalida,
    DependenciaNoEncontrada,
    DetalleError,
    ElementoDuplicado,
    ElementoNoEncontrado,
)
from app.dominio.reglas_dependencia import (
    TIPOS_QUE_ASOCIAN_SUMINISTRO,
    es_relacion_permitida,
    motivo_no_permitida,
)
from app.dominio.tipo_elemento import TipoElemento


@dataclass(frozen=True)
class CicloDetectado:
    """Secuencia cerrada de identificadores que forman un ciclo dirigido."""

    secuencia: list[str]


@dataclass(frozen=True)
class ProductoEntrega:
    """Estado de planificación de un producto solicitado."""

    id: str
    tipo: str
    nombre: str
    estado: str  # "PLANIFICABLE" | "BLOQUEADO"


@dataclass(frozen=True)
class ResultadoOrdenProduccion:
    """Resultado del diagnóstico global de planta (F3)."""

    es_dag: bool
    orden: list[Elemento]
    total_pasos: int
    ciclos: list[CicloDetectado]
    elementos_bloqueados: list[str]
    productos_bloqueados: list[str]
    productos_planificables: list[str]


@dataclass(frozen=True)
class ResultadoPlanEntrega:
    """Resultado del plan de entrega por producto (F3)."""

    productos: list[ProductoEntrega]
    es_planificable: bool
    pasos: list[Elemento]
    total_pasos: int
    ciclos: list[CicloDetectado]
    elementos_bloqueados: list[str]


class Catalogo:
    """Agregado raíz del dominio: elementos, dependencias y sus adyacencias."""

    def __init__(self) -> None:
        self._elementos: dict[str, Elemento] = {}
        self._adyacencia_salida: dict[str, set[str]] = {}
        self._adyacencia_entrada: dict[str, set[str]] = {}

    def registrar_elemento(self, elemento: Elemento) -> Elemento:
        """Inserta un elemento; rechaza identificadores duplicados (RF-F1-02)."""
        if elemento.id in self._elementos:
            raise ElementoDuplicado(
                f"Ya existe un elemento con el identificador {elemento.id}.",
                [DetalleError("id", "Identificador ya registrado.")],
            )
        self._elementos[elemento.id] = elemento
        self._adyacencia_salida[elemento.id] = set()
        self._adyacencia_entrada[elemento.id] = set()
        return elemento

    def reemplazar_elemento(self, elemento: Elemento) -> Elemento:
        """Actualiza los datos de un elemento existente conservando su id."""
        if elemento.id not in self._elementos:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {elemento.id}.",
                [DetalleError("id", f"El elemento '{elemento.id}' no existe en el catálogo.")],
            )
        self._elementos[elemento.id] = elemento
        return elemento

    def registrar_dependencia(self, origen: str, destino: str) -> Dependencia:
        """Inserta la arista ``origen habilita destino``.

        Valida en orden: existencia de ambos extremos, arista no reflexiva,
        no duplicada y reglas de dependencia entre tipos. Ninguna validación
        modifica el catálogo antes de confirmarse todas.
        """
        self._validar_extremos(origen, destino)
        if origen == destino:
            raise DependenciaInvalida(
                "El origen y el destino de una dependencia no pueden ser el mismo elemento.",
                [DetalleError("destino", "Debe ser distinto de 'origen'.")],
            )
        if destino in self._adyacencia_salida[origen]:
            raise DependenciaDuplicada(
                f"Ya existe una dependencia con origen {origen} y destino {destino}.",
                [DetalleError("origen", origen), DetalleError("destino", destino)],
            )
        self._validar_reglas_dependencia(origen, destino)
        self._agregar_arista(origen, destino)
        return Dependencia(origen=origen, destino=destino)

    def actualizar_dependencia(
        self,
        origen_actual: str,
        destino_actual: str,
        origen_nuevo: str,
        destino_nuevo: str,
    ) -> Dependencia:
        """Cambia los extremos de una dependencia existente.

        La modificación es atómica: si la nueva relación no cumple las reglas,
        la relación original permanece intacta.
        """
        self._validar_extremos(origen_actual, destino_actual)
        if destino_actual not in self._adyacencia_salida[origen_actual]:
            raise DependenciaNoEncontrada(
                f"No existe una dependencia con origen {origen_actual} y destino {destino_actual}.",
                [
                    DetalleError("origen", origen_actual),
                    DetalleError("destino", destino_actual),
                ],
            )
        if (origen_actual, destino_actual) == (origen_nuevo, destino_nuevo):
            return Dependencia(origen=origen_nuevo, destino=destino_nuevo)

        self._validar_extremos(origen_nuevo, destino_nuevo)
        if origen_nuevo == destino_nuevo:
            raise DependenciaInvalida(
                "El origen y el destino de una dependencia no pueden ser el mismo elemento.",
                [DetalleError("destino", "Debe ser distinto de 'origen'.")],
            )
        if destino_nuevo in self._adyacencia_salida[origen_nuevo]:
            raise DependenciaDuplicada(
                f"Ya existe una dependencia con origen {origen_nuevo} y destino {destino_nuevo}.",
                [DetalleError("origen", origen_nuevo), DetalleError("destino", destino_nuevo)],
            )
        self._validar_reglas_dependencia(origen_nuevo, destino_nuevo)

        self._quitar_arista(origen_actual, destino_actual)
        self._agregar_arista(origen_nuevo, destino_nuevo)
        return Dependencia(origen=origen_nuevo, destino=destino_nuevo)

    def eliminar_dependencia(self, origen: str, destino: str) -> Dependencia:
        """Elimina una arista existente y devuelve la relación eliminada."""
        self._validar_extremos(origen, destino)
        if destino not in self._adyacencia_salida[origen]:
            raise DependenciaNoEncontrada(
                f"No existe una dependencia con origen {origen} y destino {destino}.",
                [DetalleError("origen", origen), DetalleError("destino", destino)],
            )
        self._quitar_arista(origen, destino)
        return Dependencia(origen=origen, destino=destino)

    def eliminar_elemento(self, identificador: str) -> Elemento:
        """Elimina un elemento y todas las relaciones que lo tocan.

        La operación deja el grafo íntegro: no quedan aristas colgantes.
        """
        elemento = self.obtener_elemento(identificador)
        for origen in sorted(self._adyacencia_entrada[identificador]):
            self._quitar_arista(origen, identificador)
        for destino in sorted(self._adyacencia_salida[identificador]):
            self._quitar_arista(identificador, destino)
        del self._adyacencia_salida[identificador]
        del self._adyacencia_entrada[identificador]
        del self._elementos[identificador]
        return elemento

    def obtener_elemento(self, identificador: str) -> Elemento:
        """Devuelve el elemento o lanza ``ElementoNoEncontrado`` (ERR-02)."""
        try:
            return self._elementos[identificador]
        except KeyError:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {identificador}.",
                [DetalleError("id", f"El elemento '{identificador}' no existe en el catálogo.")],
            ) from None

    def existe_elemento(self, identificador: str) -> bool:
        """Indica si hay un elemento registrado con ese identificador."""
        return identificador in self._elementos

    def listar_elementos(self, tipo: TipoElemento | None = None) -> list[Elemento]:
        """Lista los elementos ordenados por ``id`` ascendente (determinista)."""
        elementos = self._elementos.values()
        if tipo is not None:
            elementos = [elemento for elemento in elementos if elemento.tipo == tipo]
        return sorted(elementos, key=lambda elemento: elemento.id)

    def listar_dependencias(
        self, origen: str | None = None, destino: str | None = None
    ) -> list[Dependencia]:
        """Lista las dependencias por ``origen`` y luego ``destino`` ascendentes."""
        dependencias = [
            Dependencia(origen=o, destino=d)
            for o in sorted(self._adyacencia_salida)
            for d in sorted(self._adyacencia_salida[o])
        ]
        if origen is not None:
            dependencias = [dep for dep in dependencias if dep.origen == origen]
        if destino is not None:
            dependencias = [dep for dep in dependencias if dep.destino == destino]
        return dependencias

    def adyacencia_salida(self, identificador: str) -> set[str]:
        """Identificadores de los elementos que ``identificador`` habilita."""
        if identificador not in self._adyacencia_salida:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {identificador}.",
                [DetalleError("id", f"El elemento '{identificador}' no existe en el catálogo.")],
            )
        return set(self._adyacencia_salida[identificador])

    def adyacencia_entrada(self, identificador: str) -> set[str]:
        """Identificadores de los elementos que habilitan a ``identificador``."""
        if identificador not in self._adyacencia_entrada:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {identificador}.",
                [DetalleError("id", f"El elemento '{identificador}' no existe en el catálogo.")],
            )
        return set(self._adyacencia_entrada[identificador])

    def total_elementos(self) -> int:
        """Número de elementos registrados."""
        return len(self._elementos)

    def total_dependencias(self) -> int:
        """Número de dependencias registradas."""
        return sum(len(destinos) for destinos in self._adyacencia_salida.values())

    def obtener_impacto(self, identificador: str) -> list[Elemento]:
        """Devuelve los elementos afectados por la indisponibilidad de ``identificador``.

        El impacto es el conjunto de elementos alcanzables desde ``identificador``
        siguiendo aristas en sentido hacia adelante (``origen habilita destino``).
        No incluye al propio elemento consultado.

        Lanza ``ElementoNoEncontrado`` si el elemento no existe (ERR-02).
        El recorrido usa un conjunto de visitados para terminar en grafos con
        ciclos y devuelve los afectados ordenados por ``id`` ascendente.
        """
        if identificador not in self._elementos:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {identificador}.",
                [DetalleError("id", f"El elemento '{identificador}' no existe en el catálogo.")],
            )

        visitados: set[str] = set()
        afectados_ids: set[str] = set()
        pila: list[str] = [identificador]

        while pila:
            actual = pila.pop()
            if actual in visitados:
                continue
            visitados.add(actual)

            for destino in self._adyacencia_salida[actual]:
                if destino not in visitados and destino != identificador:
                    afectados_ids.add(destino)
                    pila.append(destino)

        afectados_ordenados = sorted(afectados_ids)
        return [self._elementos[id_elem] for id_elem in afectados_ordenados]

    def suministros_bajo_minimo(self) -> list[Elemento]:
        """Suministros cuyo stock disponible está por debajo del mínimo."""
        return [
            elemento
            for elemento in self.listar_elementos(TipoElemento.INSUMO)
            if elemento.alerta_stock
        ]

    def _validar_extremos(self, origen: str, destino: str) -> None:
        if origen not in self._elementos:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {origen}.",
                [DetalleError("origen", f"El elemento '{origen}' no existe en el catálogo.")],
            )
        if destino not in self._elementos:
            raise ElementoNoEncontrado(
                f"No existe un elemento con el identificador {destino}.",
                [DetalleError("destino", f"El elemento '{destino}' no existe en el catálogo.")],
            )

    def _validar_reglas_dependencia(self, origen: str, destino: str) -> None:
        elemento_origen = self._elementos[origen]
        elemento_destino = self._elementos[destino]
        if not es_relacion_permitida(elemento_origen.tipo, elemento_destino.tipo):
            raise DependenciaInvalida(
                "La relación no está permitida entre estos tipos de elemento.",
                [
                    DetalleError(
                        "destino",
                        motivo_no_permitida(elemento_origen.tipo, elemento_destino.tipo),
                    )
                ],
            )
        if elemento_origen.tipo is not TipoElemento.INSUMO:
            return
        if elemento_destino.tipo not in {TipoElemento.PROCESO, TipoElemento.PRODUCTO}:
            return
        asociado = any(
            self._elementos[predecesor].tipo in TIPOS_QUE_ASOCIAN_SUMINISTRO
            for predecesor in self._adyacencia_entrada[origen]
        )
        if not asociado:
            raise DependenciaInvalida(
                "El suministro no está asociado a un proveedor ni a un proceso.",
                [
                    DetalleError(
                        "origen",
                        "Asocia primero el suministro a un proveedor o proceso antes de enlazarlo con un proceso o producto.",
                    )
                ],
            )

    def _agregar_arista(self, origen: str, destino: str) -> None:
        self._adyacencia_salida[origen].add(destino)
        self._adyacencia_entrada[destino].add(origen)

    def _quitar_arista(self, origen: str, destino: str) -> None:
        self._adyacencia_salida[origen].discard(destino)
        self._adyacencia_entrada[destino].discard(origen)

    # ------------------------------------------------------------------
    # F3 — Orden de producción, diagnóstico global y plan de entrega
    # ------------------------------------------------------------------

    def orden_produccion(self) -> ResultadoOrdenProduccion:
        """Diagnóstico global de planta (F3).

        Evalúa la red completa como DAG:
        - Si es acíclico, devuelve el orden completo (Kahn) desempatado por id,
          con es_dag=True, total_pasos=|V|, ciclos=[], elementos_bloqueados=[],
          productos_bloqueados=[] y todos los productos en productos_planificables.
        - Si contiene ciclos, devuelve es_dag=False, orden=[], total_pasos=0,
          ciclos con un ciclo representativo por SCC cíclica ordenados por el
          menor id de cada SCC, elementos_bloqueados (elementos de regiones
          cíclicas y sus alcanzables hacia adelante), productos_bloqueados y
          productos_planificables (productos no bloqueados).
        """
        ids = sorted(self._elementos)
        todos_los_productos = sorted(
            [e.id for e in self._elementos.values() if e.tipo is TipoElemento.PRODUCTO]
        )
        if not ids:
            return ResultadoOrdenProduccion(
                es_dag=True,
                orden=[],
                total_pasos=0,
                ciclos=[],
                elementos_bloqueados=[],
                productos_bloqueados=[],
                productos_planificables=[],
            )

        # Kahn sobre el grafo completo
        in_grado = {id_elem: len(self._adyacencia_entrada[id_elem]) for id_elem in ids}
        listos: list[str] = sorted(id_elem for id_elem in ids if in_grado[id_elem] == 0)
        orden: list[Elemento] = []
        while listos:
            id_actual = listos.pop(0)
            orden.append(self._elementos[id_actual])
            for destino in self._adyacencia_salida[id_actual]:
                in_grado[destino] -= 1
                if in_grado[destino] == 0:
                    _insertar_ordenado(listos, destino)

        if len(orden) == len(ids):
            return ResultadoOrdenProduccion(
                es_dag=True,
                orden=orden,
                total_pasos=len(orden),
                ciclos=[],
                elementos_bloqueados=[],
                productos_bloqueados=[],
                productos_planificables=todos_los_productos,
            )

        # Hay ciclo en el grafo completo
        # Obtener SCCs cíclicas y ciclos representativos
        sccs = self._tarjan_scc(ids)
        sccs_ciclicas = [
            scc for scc in sccs
            if len(scc) > 1 or (len(scc) == 1 and scc[0] in self._adyacencia_salida[scc[0]])
        ]
        # Ordenar SCCs cíclicas por su menor id
        sccs_ciclicas.sort(key=lambda scc: min(scc))

        ciclos: list[CicloDetectado] = []
        nodos_en_sccs_ciclicas: set[str] = set()
        for scc in sccs_ciclicas:
            nodos_en_sccs_ciclicas.update(scc)
            ciclo_seq = self._encontrar_ciclo_en_scc(scc)
            if ciclo_seq:
                ciclos.append(CicloDetectado(secuencia=ciclo_seq))

        # elementos_bloqueados: los nodos de las SCCs cíclicas + todos los alcanzables desde ellos hacia adelante
        bloqueados_set: set[str] = set(nodos_en_sccs_ciclicas)
        pila = list(nodos_en_sccs_ciclicas)
        while pila:
            curr = pila.pop()
            for nxt in self._adyacencia_salida[curr]:
                if nxt not in bloqueados_set:
                    bloqueados_set.add(nxt)
                    pila.append(nxt)

        elementos_bloqueados = sorted(bloqueados_set)
        productos_bloqueados = sorted([
            pid for pid in elementos_bloqueados
            if self._elementos[pid].tipo is TipoElemento.PRODUCTO
        ])
        productos_planificables = sorted([
            pid for pid in todos_los_productos
            if pid not in bloqueados_set
        ])

        return ResultadoOrdenProduccion(
            es_dag=False,
            orden=[],
            total_pasos=0,
            ciclos=ciclos,
            elementos_bloqueados=elementos_bloqueados,
            productos_bloqueados=productos_bloqueados,
            productos_planificables=productos_planificables,
        )

    def plan_entrega(self, productos_ids: list[str]) -> ResultadoPlanEntrega:
        """Calcula el plan de preparación para uno o varios productos (F3).

        - Calcula los ancestros de los productos solicitados (requisitos hacia atrás).
        - Si los requisitos de un producto tocan una SCC cíclica, queda BLOQUEADO.
        - Si no tocan ningún ciclo, queda PLANIFICABLE.
        - Los pasos contienen el orden topológico (Kahn) de la unión de requisitos
          de los productos PLANIFICABLES.
        - ciclos y elementos_bloqueados reportan únicamente los ciclos y bloqueos
          dentro del subgrafo de los productos solicitados.
        """
        # Deduplicar preservando tipo producto
        p_ids = sorted(set(productos_ids))
        info_productos: list[ProductoEntrega] = []

        # Determinar ancestros de cada producto
        ancestros_por_prod: dict[str, set[str]] = {}
        for pid in p_ids:
            ancestros = self._obtener_ancestros(pid)
            ancestros_por_prod[pid] = ancestros

        subgrafo_total = set().union(*ancestros_por_prod.values()) if ancestros_por_prod else set()

        # Encontrar ciclos dentro de subgrafo_total
        sccs_sub = self._tarjan_scc(sorted(subgrafo_total))
        sccs_ciclicas_sub = [
            scc for scc in sccs_sub
            if len(scc) > 1 or (len(scc) == 1 and scc[0] in self._adyacencia_salida[scc[0]])
        ]
        sccs_ciclicas_sub.sort(key=lambda scc: min(scc))

        ciclos_sub: list[CicloDetectado] = []
        nodos_scc_ciclicas_sub: set[str] = set()
        for scc in sccs_ciclicas_sub:
            nodos_scc_ciclicas_sub.update(scc)
            c_seq = self._encontrar_ciclo_en_scc(scc)
            if c_seq:
                ciclos_sub.append(CicloDetectado(secuencia=c_seq))

        # Calcular elementos bloqueados dentro del subgrafo_total
        bloqueados_en_subgrafo: set[str] = set(nodos_scc_ciclicas_sub)
        pila_b = list(nodos_scc_ciclicas_sub)
        while pila_b:
            curr = pila_b.pop()
            for nxt in self._adyacencia_salida[curr]:
                if nxt in subgrafo_total and nxt not in bloqueados_en_subgrafo:
                    bloqueados_en_subgrafo.add(nxt)
                    pila_b.append(nxt)

        # Determinar estado de cada producto solicitado
        productos_planificables_ids: list[str] = []
        for pid in p_ids:
            elem = self._elementos[pid]
            # Si el producto o alguno de sus ancestros está en una región cíclica
            ancestros_prod = ancestros_por_prod[pid]
            if any(anc in nodos_scc_ciclicas_sub for anc in ancestros_prod):
                estado = "BLOQUEADO"
            else:
                estado = "PLANIFICABLE"
                productos_planificables_ids.append(pid)

            info_productos.append(
                ProductoEntrega(
                    id=elem.id,
                    tipo=elem.tipo.value,
                    nombre=elem.nombre,
                    estado=estado,
                )
            )

        es_planificable = (len(productos_planificables_ids) == len(p_ids)) and len(p_ids) > 0

        # Subgrafo para los pasos: unión de ancestros de productos PLANIFICABLES
        if productos_planificables_ids:
            subgrafo_plan = set().union(
                *(ancestros_por_prod[pid] for pid in productos_planificables_ids)
            )
            # Aplicar Kahn sobre subgrafo_plan
            pasos = self._ordenar_subgrafo_kahn(subgrafo_plan)
        else:
            pasos = []

        return ResultadoPlanEntrega(
            productos=info_productos,
            es_planificable=es_planificable,
            pasos=pasos,
            total_pasos=len(pasos),
            ciclos=ciclos_sub,
            elementos_bloqueados=sorted(bloqueados_en_subgrafo),
        )

    def _obtener_ancestros(self, id_elemento: str) -> set[str]:
        """Obtiene el conjunto de ancestros (hacia atrás por adyacencia_entrada) incluyendo id_elemento."""
        ancestros: set[str] = {id_elemento}
        pila = [id_elemento]
        while pila:
            actual = pila.pop()
            for predecesor in self._adyacencia_entrada[actual]:
                if predecesor not in ancestros:
                    ancestros.add(predecesor)
                    pila.append(predecesor)
        return ancestros

    def _ordenar_subgrafo_kahn(self, nodos_subgrafo: set[str]) -> list[Elemento]:
        """Aplica Kahn determinista sobre el subgrafo inducido por nodos_subgrafo."""
        nodos_ordenados = sorted(nodos_subgrafo)
        in_grado = {
            n: sum(1 for p in self._adyacencia_entrada[n] if p in nodos_subgrafo)
            for n in nodos_ordenados
        }
        listos: list[str] = sorted(n for n in nodos_ordenados if in_grado[n] == 0)
        resultado: list[Elemento] = []

        while listos:
            actual = listos.pop(0)
            resultado.append(self._elementos[actual])
            for sucesor in sorted(self._adyacencia_salida[actual]):
                if sucesor in nodos_subgrafo:
                    in_grado[sucesor] -= 1
                    if in_grado[sucesor] == 0:
                        _insertar_ordenado(listos, sucesor)

        return resultado

    def _tarjan_scc(self, nodos_considerados: list[str]) -> list[list[str]]:
        """Algoritmo de Tarjan para encontrar componentes fuertemente conexas (SCCs)."""
        idx = 0
        indices: dict[str, int] = {}
        lowlinks: dict[str, int] = {}
        en_pila: dict[str, bool] = {n: False for n in nodos_considerados}
        pila: list[str] = []
        sccs: list[list[str]] = []
        nodos_set = set(nodos_considerados)

        def strongconnect(v: str) -> None:
            nonlocal idx
            indices[v] = idx
            lowlinks[v] = idx
            idx += 1
            pila.append(v)
            en_pila[v] = True

            for w in sorted(self._adyacencia_salida[v]):
                if w not in nodos_set:
                    continue
                if w not in indices:
                    strongconnect(w)
                    lowlinks[v] = min(lowlinks[v], lowlinks[w])
                elif en_pila[w]:
                    lowlinks[v] = min(lowlinks[v], indices[w])

            if lowlinks[v] == indices[v]:
                scc: list[str] = []
                while True:
                    w = pila.pop()
                    en_pila[w] = False
                    scc.append(w)
                    if w == v:
                        break
                sccs.append(sorted(scc))

        for n in sorted(nodos_considerados):
            if n not in indices:
                strongconnect(n)

        return sccs

    def _encontrar_ciclo_en_scc(self, scc: list[str]) -> list[str] | None:
        """Encuentra un ciclo cerrado elemental representativo en la SCC."""
        scc_set = set(scc)
        if len(scc) == 1:
            nodo = scc[0]
            if nodo in self._adyacencia_salida[nodo]:
                return [nodo, nodo]
            return None

        # DFS buscando arista de retroceso dentro de la SCC comenzando por el menor id
        nodo_inicio = min(scc)
        camino: list[str] = []
        visitados_en_camino: set[str] = set()

        def dfs(u: str) -> list[str] | None:
            camino.append(u)
            visitados_en_camino.add(u)
            for v in sorted(self._adyacencia_salida[u]):
                if v not in scc_set:
                    continue
                if v in visitados_en_camino:
                    idx = camino.index(v)
                    return camino[idx:] + [v]
                res = dfs(v)
                if res is not None:
                    return res
            visitados_en_camino.remove(u)
            camino.pop()
            return None

        return dfs(nodo_inicio)


def _insertar_ordenado(lista: list[str], valor: str) -> None:
    """Inserta ``valor`` en ``lista`` manteniéndola ordenada ascendentemente."""
    bisect.insort(lista, valor)
