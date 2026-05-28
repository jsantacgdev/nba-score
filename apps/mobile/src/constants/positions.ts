export const POSITION_NAMES: Record<string, string> = {
  G: 'Base / Escolta',
  F: 'Alero / Ala-Pívot',
  C: 'Pívot',
  'G-F': 'Escolta-Alero',
  'F-G': 'Alero-Escolta',
  'F-C': 'Ala-Pívot',
  'C-F': 'Pívot-Ala',
  PG: 'Base',
  SG: 'Escolta',
  SF: 'Alero',
  PF: 'Ala-Pívot',
};

export function getPositionName(position?: string): string {
  if (!position) return 'Sin posición';
  return POSITION_NAMES[position] ?? position;
}
