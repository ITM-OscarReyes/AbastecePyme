"""Representación propia del grafo del catálogo (F1).

Estructura definida en ``docs/graph-model.md`` sección 3.2: un mapa de
elementos por ``id`` y dos índices de adyacencia (salida y entrada) que se
mantienen en la misma operación de registro. No se usa ninguna biblioteca de
grafos: F1 solo inserta aristas, consulta adyacencia y lista (RNF-F1-03).

El catálogo vacío es un estado válido (invariante 6): todas las consultas
responden con colecciones vacías, nunca con error.
"""

from app.dominio.dependencia import Dependencia
from app.dominio.elemento import Elemento
from app.dominio.errores import (
    DependenciaDuplicada,
    DependenciaInvalida,
    DetalleError,
    ElementoDuplicado,
    ElementoNoEncontrado,
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
        # Todo elemento tiene entrada de adyacencia, aunque esté vacía
        # (invariante 5): un elemento sin dependencias es válido.
        self._adyacencia_salida[elemento.id] = set()
        self._adyacencia_entrada[elemento.id] = set()
        return elemento

    def registrar_dependencia(self, origen: str, destino: str) -> Dependencia:
        """Inserta la arista ``origen habilita destino``.

        Valida en orden: existencia de ambos extremos, arista no reflexiva y
        no duplicada. Ninguna de las validaciones modifica el catálogo antes
        de confirmarse todas. F1 no rechaza ciclos (RF-F1-16).
        """
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
        if origen == destino:
            raise DependenciaInvalida(
                "El origen y el destino de una dependencia no pueden ser el mismo elemento.",
                [DetalleError("destino", "Debe ser distinto de 'origen'.")],
            )
        if destino in self._adyacencia_salida[origen]:
            raise DependenciaDuplicada(
                f"Ya existe una dependencia con origen {origen} y destino {destino}.",
                [
                    DetalleError("origen", origen),
                    DetalleError("destino", destino),
                ],
            )
        self._adyacencia_salida[origen].add(destino)
        self._adyacencia_entrada[destino].add(origen)
        return Dependencia(origen=origen, destino=destino)

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
