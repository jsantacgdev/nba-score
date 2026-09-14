/**
 * Como se llama en castellano cada tipo de movimiento.
 *
 * Los nombres son los del feed de la NBA. "Signing" cubre tanto el fichaje
 * de un agente libre como la renovacion, y por eso se traduce por el
 * mercado y no por el gesto.
 */
export function tipoMovimiento(tipo: string): string {
  if (tipo === 'Trade') return 'Traspaso';
  if (tipo === 'Signing') return 'Agencia libre';
  if (tipo === 'Waive') return 'Corte';
  if (tipo === 'AwardOnWaivers') return 'Reclamado';
  if (tipo === 'ContractConverted') return 'Contrato convertido';
  return tipo;
}

