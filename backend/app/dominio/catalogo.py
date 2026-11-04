"""Representación propia del grafo del catálogo.

Estructura definida en ``docs/graph-model.md``: un mapa de elementos por
``id`` y dos índices de adyacencia (salida y entrada) que se mantienen en la
misma operación de registro.

Además del catálogo, el agregado aplica las reglas de dependencia permitidas
entre tipos de elemento y mantiene la integridad de la red cuando se edita o
elimina un elemento o una relación. El catálogo vacío es un estado válido.
"""

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
