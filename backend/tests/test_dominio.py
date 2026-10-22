"""Pruebas de la capa de dominio de F1, sin HTTP ni infraestructura.

Verifican directamente el agregado `Catalogo`: invariantes de `graph-model.md`
sección 3.3, orden estable, códigos de error de dominio y normalización.
"""

import pytest

from app.dominio.catalogo import Catalogo
from app.dominio.elemento import Elemento
from app.dominio.errores import (
    CampoNoPermitido,
    DependenciaDuplicada,
    DependenciaInvalida,
    ElementoDuplicado,
    ElementoNoEncontrado,
    IdentificadorInvalido,
    ValidacionFallida,
)
from app.dominio.tipo_elemento import TipoElemento


@pytest.fixture
def catalogo() -> Catalogo:
    agreg = Catalogo()
    agreg.registrar_elemento(Elemento.crear("INS-A1", "INSUMO", "Insumo A"))
    agreg.registrar_elemento(Elemento.crear("INS-A2", "INSUMO", "Insumo B"))
    agreg.registrar_elemento(Elemento.crear("PROD-B1", "PRODUCTO", "Producto C"))
    return agreg


def test_invariante_5_todo_elemento_tiene_adyacencia_de_salida_aunque_vacia() -> None:
    catalogo = Catalogo()
    catalogo.registrar_elemento(Elemento.crear("INS-A1", "INSUMO", "Insumo A"))

    assert catalogo.adyacencia_salida("INS-A1") == set()
    assert catalogo.adyacencia_entrada("INS-A1") == set()


def test_invariante_1_y_3_las_adyacencias_se_actualizan_en_la_misma_operacion(
    catalogo: Catalogo,
) -> None:
    catalogo.registrar_dependencia("INS-A1", "PROD-B1")

    assert catalogo.adyacencia_salida("INS-A1") == {"PROD-B1"}
    assert catalogo.adyacencia_entrada("PROD-B1") == {"INS-A1"}
    assert catalogo.adyacencia_salida("PROD-B1") == set()


def test_invariante_2_no_hay_aristas_reflexivas(catalogo: Catalogo) -> None:
    with pytest.raises(DependenciaInvalida) as excepcion:
        catalogo.registrar_dependencia("INS-A1", "INS-A1")

    assert excepcion.value.codigo == "DEPENDENCIA_INVALIDA"
    assert catalogo.listar_dependencias() == []


def test_invariante_3_no_hay_aristas_paralelas(catalogo: Catalogo) -> None:
    catalogo.registrar_dependencia("INS-A1", "PROD-B1")

    with pytest.raises(DependenciaDuplicada) as excepcion:
        catalogo.registrar_dependencia("INS-A1", "PROD-B1")

    assert excepcion.value.codigo == "DEPENDENCIA_DUPLICADA"
    assert catalogo.total_dependencias() == 1


def test_invariante_4_las_aristas_inversas_son_validas(catalogo: Catalogo) -> None:
    catalogo.registrar_dependencia("INS-A1", "PROD-B1")
    catalogo.registrar_dependencia("PROD-B1", "INS-A1")

    assert catalogo.total_dependencias() == 2
    assert {(d.origen, d.destino) for d in catalogo.listar_dependencias()} == {
        ("INS-A1", "PROD-B1"),
        ("PROD-B1", "INS-A1"),
    }


def test_invariante_6_el_grafo_vacio_es_un_estado_valido() -> None:
    catalogo = Catalogo()

    assert catalogo.listar_elementos() == []
    assert catalogo.listar_dependencias() == []
    assert catalogo.total_elementos() == 0
    assert catalogo.total_dependencias() == 0


def test_invariante_1_consultar_adyacencia_de_un_id_inexistente_falla(catalogo: Catalogo) -> None:
    with pytest.raises(ElementoNoEncontrado):
        catalogo.adyacencia_salida("INS-FANTASMA")


def test_orden_de_elementos_ascendente_por_id() -> None:
    catalogo = Catalogo()
    for id_valor in ("PROD-Z9", "INS-A1", "PROC-M5"):
        catalogo.registrar_elemento(Elemento.crear(id_valor, "INSUMO", f"Elemento {id_valor}"))

    assert [e.id for e in catalogo.listar_elementos()] == ["INS-A1", "PROC-M5", "PROD-Z9"]


def test_orden_de_dependencias_por_origen_y_destino(catalogo: Catalogo) -> None:
    catalogo.registrar_dependencia("INS-A2", "INS-A1")
    catalogo.registrar_dependencia("INS-A1", "PROD-B1")
    catalogo.registrar_dependencia("INS-A1", "INS-A2")

    assert [(d.origen, d.destino) for d in catalogo.listar_dependencias()] == [
        ("INS-A1", "INS-A2"),
        ("INS-A1", "PROD-B1"),
        ("INS-A2", "INS-A1"),
    ]


def test_filtros_de_dependencias_por_extremo_se_combinan(catalogo: Catalogo) -> None:
    catalogo.registrar_dependencia("INS-A1", "PROD-B1")
    catalogo.registrar_dependencia("INS-A2", "PROD-B1")
    catalogo.registrar_dependencia("INS-A2", "INS-A1")

    solo_origen = catalogo.listar_dependencias(origen="INS-A2")
    solo_destino = catalogo.listar_dependencias(destino="PROD-B1")
    ambos = catalogo.listar_dependencias(origen="INS-A2", destino="PROD-B1")

    assert [(d.origen, d.destino) for d in solo_origen] == [("INS-A2", "INS-A1"), ("INS-A2", "PROD-B1")]
    assert [(d.origen, d.destino) for d in solo_destino] == [("INS-A1", "PROD-B1"), ("INS-A2", "PROD-B1")]
    assert [(d.origen, d.destino) for d in ambos] == [("INS-A2", "PROD-B1")]


def test_listar_por_tipo_filtra_y_mantiene_el_orden(catalogo: Catalogo) -> None:
    catalogo.registrar_elemento(Elemento.crear("INS-A0", "INSUMO", "Insumo inicial"))

    productos = catalogo.listar_elementos(tipo=TipoElemento.PRODUCTO)

    assert [e.id for e in productos] == ["PROD-B1"]


def test_el_tipo_de_relacion_del_dominio_es_habilita(catalogo: Catalogo) -> None:
    dependencia = catalogo.registrar_dependencia("INS-A1", "PROD-B1")

    assert dependencia.tipo_relacion == "habilita"


def test_existencia_de_elemento_consultada_por_el_dominio(catalogo: Catalogo) -> None:
    assert catalogo.existe_elemento("INS-A1")
    assert not catalogo.existe_elemento("INS-FANTASMA")


def test_obtener_elemento_inexistente_lanza_err02(catalogo: Catalogo) -> None:
    with pytest.raises(ElementoNoEncontrado) as excepcion:
        catalogo.obtener_elemento("INS-FANTASMA")

    assert excepcion.value.codigo == "ELEMENTO_NO_ENCONTRADO"
    assert [d.campo for d in excepcion.value.detalles] == ["id"]


def test_registrar_elemento_duplicado_lanza_err01(catalogo: Catalogo) -> None:
    with pytest.raises(ElementoDuplicado) as excepcion:
        catalogo.registrar_elemento(Elemento.crear("INS-A1", "PRODUCTO", "Otro nombre"))

    assert excepcion.value.codigo == "ELEMENTO_DUPLICADO"
    assert [d.campo for d in excepcion.value.detalles] == ["id"]
    assert catalogo.obtener_elemento("INS-A1").nombre == "Insumo A"
    assert catalogo.obtener_elemento("INS-A1").tipo is TipoElemento.INSUMO


def test_dependencia_con_extremo_inexistente_lanza_err02_con_el_campo(catalogo: Catalogo) -> None:
    with pytest.raises(ElementoNoEncontrado) as por_origen:
        catalogo.registrar_dependencia("INS-FANTASMA", "PROD-B1")
    with pytest.raises(ElementoNoEncontrado) as por_destino:
        catalogo.registrar_dependencia("INS-A1", "PROD-FANTASMA")

    assert [d.campo for d in por_origen.value.detalles] == ["origen"]
    assert [d.campo for d in por_destino.value.detalles] == ["destino"]
    assert catalogo.total_dependencias() == 0


def test_normalizacion_de_identificador_recorta_y_pasa_a_mayusculas() -> None:
    elemento = Elemento.crear("  ins-a1  ", " insumo ", "  Barra de acero  ")

    assert elemento.id == "INS-A1"
    assert elemento.tipo is TipoElemento.INSUMO
    assert elemento.nombre == "Barra de acero"
    assert elemento.descripcion is None


def test_id_no_texto_lanza_err04_con_campo_id() -> None:
    with pytest.raises(ValidacionFallida) as excepcion:
        Elemento.crear(42, "INSUMO", "Barra de acero")

    assert excepcion.value.codigo == "VALIDACION_FALLIDA"
    assert [d.campo for d in excepcion.value.detalles] == ["id"]


def test_descripcion_de_301_caracteres_lanza_err04_con_campo_descripcion() -> None:
    with pytest.raises(ValidacionFallida) as excepcion:
        Elemento.crear("INS-A1", "INSUMO", "Barra de acero", "d" * 301)

    assert [d.campo for d in excepcion.value.detalles] == ["descripcion"]


def test_identificador_invalido_para_consulta_lanza_err05() -> None:
    from app.dominio.validacion import validar_identificador_consulta

    with pytest.raises(IdentificadorInvalido) as excepcion:
        validar_identificador_consulta("xx", "id")

    assert excepcion.value.codigo == "IDENTIFICADOR_INVALIDO"
    assert [d.campo for d in excepcion.value.detalles] == ["id"]


def test_campo_no_permitido_expone_el_nombre_del_campo() -> None:
    error = CampoNoPermitido("La petición incluye campos no admitidos.")

    assert error.codigo == "CAMPO_NO_PERMITIDO"
    assert error.detalles == []
