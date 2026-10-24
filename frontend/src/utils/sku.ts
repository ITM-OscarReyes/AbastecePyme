/**
 * Utilidad de presentación para códigos alfanuméricos de planta (SKU / Part Number).
 * Garantiza que cada componente muestre letras que identifiquen qué es junto a una
 * numeración correlativa técnica (ej: INS-BARRA-01, PROV-ACERO-01).
 */
export function obtenerCodigoSku(id: string): string {
  if (!id) return '';
  // Si el identificador ya posee numeración (ej: INS-0001, PROD-0145), se respeta
  if (/\d/.test(id)) {
    return id;
  }
  // Si es puramente alfabético, se le añade la numeración correlativa de planta
  return `${id}-01`;
}
