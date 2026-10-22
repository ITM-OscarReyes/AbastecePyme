/**
 * AC-F1-22 / AC-F1-23 · Revisión estática del frontend.
 *
 * Comprueba por análisis del código lo que los criterios de arquitectura exigen
 * y que no puede observarse desde la pantalla:
 *
 * - ninguna regla de negocio del catálogo ni cálculo sobre el grafo en los
 *   componentes, el estado o el cliente de API;
 * - el cliente de API no decide nada sobre la dirección de las relaciones;
 * - no se importan librerías de algoritmos de grafo en el frontend;
 * - no hay datos de ejemplo embebidos (AC-F1-14d);
 * - convenciones de nomenclatura de `AGENTS.md`.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = process.cwd();
const SRC = join(RAIZ, 'src');
const RUTA_CLIENTE = join(SRC, 'services', 'api.ts');

const IGNORAR = new Set(['test', 'node_modules', 'dist']);

function archivosDeCodigo(directorio = SRC): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    if (IGNORAR.has(entrada)) continue;
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...archivosDeCodigo(ruta));
    } else if (/\.(ts|tsx)$/.test(entrada)) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

const ARCHIVOS = archivosDeCodigo();
const lectura = (ruta: string) => readFileSync(ruta, 'utf8');
const componentes = ARCHIVOS.filter((ruta) => ruta !== RUTA_CLIENTE);
const rutasComponentes = ARCHIVOS.filter((ruta) => ruta.includes(`${sep}components${sep}`));

/** Palabras que delatan una regla de F1 redactada dentro del frontend. */
const VOCABULARIO_DE_REGLAS = [
  'autoreferencia',
  'patrón de identificador',
  'debe tener entre'
];

describe('AC-F1-22 · El frontend no implementa reglas de negocio del catálogo', () => {
  it('AC-F1-22 ningún componente declara el patrón de identificador del dominio', () => {
    // El patrón `^[A-Z0-9][A-Z0-9_-]{2,39}$` vive en `app/dominio/validacion.py`
    // (backend/app/dominio/validacion.py:16). Repetirlo en el frontend sería una
    // segunda versión de la regla (docs/architecture.md, sección 2).
    const culpables = componentes.filter((ruta) => /\^\[A-Z0-9\]/.test(lectura(ruta)));

    expect(culpables).toEqual([]);
  });

  it('AC-F1-22 ningún componente implementa la longitud mínima o máxima del nombre', () => {
    // Las longitudes 3..80 las fija `app/dominio/validacion.py`
    // (backend/app/dominio/validacion.py:15-16).
    const culpables = componentes.filter((ruta) =>
      /nombre[\s\S]{0,60}\.length\s*[<>]/.test(lectura(ruta))
    );

    expect(culpables).toEqual([]);
  });

  it('AC-F1-22 ningún componente decide por su cuenta si una dependencia es válida', () => {
    // La autorreferencia es la regla ERR-07 del dominio; el frontend solo debe
    // enviarla y mostrar el error que devuelve la API.
    const culpables = componentes.filter((ruta) =>
      /origen\s*===\s*destino|destino\s*===\s*origen/.test(lectura(ruta))
    );

    expect(culpables).toEqual([]);
  });

  it('AC-F1-22 ningún componente redacta el vocabulario de una regla de F1', () => {
    const culpables = componentes.filter((ruta) =>
      VOCABULARIO_DE_REGLAS.some((palabra) =>
        new RegExp(palabra, 'i').test(lectura(ruta))
      )
    );

    expect(culpables).toEqual([]);
  });

  it('AC-F1-22 el cliente de API solo construye peticiones y traduce el sobre de error', () => {
    const cliente = lectura(RUTA_CLIENTE);

    expect(cliente).toContain('extraerMensajeError');
    expect(cliente).toContain('apiClient');
    expect(cliente).not.toMatch(/REFLEXIVA|AUTOREFERENCIA|\^\[A-Z0-9\]/);
  });

  it('AC-F1-22 el frontend no calcula recorridos, niveles ni ciclos sobre el grafo', () => {
    const culpables = componentes.filter((ruta) =>
      /\b(dfs|bfs|shortestPath|visited|profundidad)\b/i.test(lectura(ruta))
    );

    expect(culpables).toEqual([]);
  });

  it('AC-F1-22 el frontend no importa librerías de algoritmos de grafo', () => {
    const importados = ARCHIVOS.flatMap((ruta) =>
      Array.from(lectura(ruta).matchAll(/from\s+'([^']+)'/g)).map((coincidencia) => coincidencia[1])
    );

    expect(importados.filter((nombre) => /networkx|graphlib/.test(nombre))).toEqual([]);
  });

  it('AC-F1-15 cytoscape se usa solo en el lienzo, y solo para visualizar', () => {
    const usanCytoscape = ARCHIVOS.filter((ruta) => /from\s+'cytoscape/.test(lectura(ruta)));

    expect(usanCytoscape.map((ruta) => relative(RAIZ, ruta).split(sep).join('/'))).toEqual([
      'src/components/GraphCanvas.tsx'
    ]);
  });

  it('AC-F1-14d no hay datos de ejemplo embebidos en el código', () => {
    const identificadoresDemo = [
      'PROV-ACERO',
      'INS-BARRA',
      'INS-TORNILLO',
      'PROC-CORTE',
      'PROD-PANEL',
      'PROD-BANCO'
    ];
    const culpables = ARCHIVOS.filter((ruta) =>
      identificadoresDemo.some((id) => lectura(ruta).includes(`'${id}'`) || lectura(ruta).includes(`"${id}"`))
    );

    expect(culpables).toEqual([]);
  });
});

describe('AC-F1-23 · Convenciones de nomenclatura', () => {
  it('AC-F1-23 los componentes exportados están en PascalCase', () => {
    const infractores = rutasComponentes.flatMap((ruta) =>
      Array.from(
        lectura(ruta).matchAll(/(?:export\s+const|export\s+function)\s+([A-Za-z_][\w]*)/g)
      )
        .map((coincidencia) => coincidencia[1])
        .filter((nombre) => !/^[A-Z]/.test(nombre))
        .map((nombre) => `${relative(RAIZ, ruta)}: ${nombre}`)
    );

    expect(infractores).toEqual([]);
  });

  it('AC-F1-23 los tipos e interfaces están en PascalCase', () => {
    const infractores = ARCHIVOS.flatMap((ruta) =>
      Array.from(lectura(ruta).matchAll(/(?:interface|type)\s+([A-Za-z_][\w]*)/g))
        .map((coincidencia) => coincidencia[1])
        .filter((nombre) => !/^[A-Z]/.test(nombre))
        .map((nombre) => `${relative(RAIZ, ruta)}: ${nombre}`)
    );

    expect(infractores).toEqual([]);
  });

  it('AC-F1-23 ninguna constante ni función del frontend usa snake_case', () => {
    const infractores = ARCHIVOS.flatMap((ruta) =>
      Array.from(
        lectura(ruta).matchAll(/(?:const|let|function)\s+([a-z][A-Za-z0-9]*_[A-Za-z0-9_]*)/g)
      ).map((coincidencia) => `${relative(RAIZ, ruta)}: ${coincidencia[1]}`)
    );

    expect(infractores).toEqual([]);
  });
});