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

/**
 * De donde sale y a donde llega el jugador.
 *
 * El feed anota un solo equipo por movimiento y siempre en la misma
 * columna, pero no significa lo mismo en los tres casos: en un fichaje es
 * el destino y en un corte es el equipo que lo deja libre. Sin esta
 * distincion un corte se pintaba igual que un fichaje, con la flecha
 * apuntando al equipo que en realidad acababa de soltarlo.
 */
export function sentidoMovimiento<T>(
  tipo: string,
  equipo?: T,
  origen?: T,
): { desde?: T; hasta?: T } {
  if (tipo === 'Waive') return { desde: equipo, hasta: undefined };
  return { desde: origen, hasta: equipo };
}
