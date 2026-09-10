
type Zona = {
  es: string;
  f?: boolean;
  pl?: boolean;
};

const ESTADOS: Record<string, string> = {
  'Day-To-Day': 'Día a día',
  Out: 'Baja',
  'Out For Season': 'Baja toda la temporada',
  'Out For Year': 'Baja todo el año',
  Doubtful: 'Duda',
  Questionable: 'En duda',
  Probable: 'Probable',
  Available: 'Disponible',
  'Game Time Decision': 'Decisión a última hora',
};

const ZONAS: Record<string, Zona> = {
  Knee: { es: 'Rodilla', f: true },
  Ankle: { es: 'Tobillo' },
  Foot: { es: 'Pie' },
  Achilles: { es: 'Tendón de Aquiles' },
  Toe: { es: 'Dedo del pie' },
  Finger: { es: 'Dedo' },
  Hip: { es: 'Cadera', f: true },
  Wrist: { es: 'Muñeca', f: true },
  Calf: { es: 'Gemelo' },
  Hamstring: { es: 'Isquiotibial' },
  Shoulder: { es: 'Hombro' },
  Back: { es: 'Espalda', f: true },
  'Lower Leg': { es: 'Pierna', f: true },
  'Lower Back': { es: 'Lumbares', f: true, pl: true },
  Elbow: { es: 'Codo' },
  Hand: { es: 'Mano', f: true },
  Eye: { es: 'Ojo' },
  Ribs: { es: 'Costillas', f: true, pl: true },
  Quadriceps: { es: 'Cuádriceps' },
  Groin: { es: 'Aductor' },
  Thumb: { es: 'Pulgar' },
  Neck: { es: 'Cuello' },
  Head: { es: 'Cabeza', f: true },
  Concussion: { es: 'Conmoción cerebral', f: true },
  Illness: { es: 'Enfermedad', f: true },
  Abdomen: { es: 'Abdomen' },
  Chest: { es: 'Pecho' },
  Nose: { es: 'Nariz', f: true },
  Face: { es: 'Cara', f: true },
  Leg: { es: 'Pierna', f: true },
  Arm: { es: 'Brazo' },
  Undisclosed: { es: 'Sin especificar' },
  'Not Specified': { es: 'Sin especificar' },
};

export function estadoLesion(valor?: string): string | undefined {
  if (!valor) return undefined;
  return ESTADOS[valor] ?? valor;
}

export function zonaLesion(valor?: string): string | undefined {
  if (!valor) return undefined;
  return ZONAS[valor]?.es ?? valor;
}

export function tituloLesion(zona?: string, lado?: string): string {
  const info = zona ? ZONAS[zona] : undefined;
  const nombre = info?.es ?? zona;
  if (!nombre) return 'Lesión';

  if (!lado || lado === 'None' || lado === 'Not Specified' || lado === 'Bilateral') {
    return lado === 'Bilateral' ? `${nombre} (ambos lados)` : nombre;
  }

  const raiz = lado === 'Left' ? 'izquierd' : lado === 'Right' ? 'derech' : null;
  if (!raiz) return `${nombre} ${lado}`;

  const terminacion = `${info?.f ? 'a' : 'o'}${info?.pl ? 's' : ''}`;
  return `${nombre} ${raiz}${terminacion}`;
}
