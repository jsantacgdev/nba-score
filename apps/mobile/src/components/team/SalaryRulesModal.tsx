import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { TeamSalary } from '@/types/domain';

/**
 * Que implica cada umbral salarial.
 *
 * El sistema de la NBA no es un tope duro: se puede superar, pero cada
 * linea que se cruza quita herramientas para fichar. Esto lo explica,
 * marcando las que el equipo ya ha rebasado.
 *
 * Las restricciones son las del convenio de 2023, el que introdujo los dos
 * aprons.
 */

type Tramo = {
  clave: keyof Pick<
    TeamSalary,
    'salaryFloor' | 'salaryCap' | 'luxuryTax' | 'firstApron' | 'secondApron'
  >;
  nombre: string;
  resumen: string;
  penas: string[];
  /** El suelo penaliza por quedarse corto, no por pasarse. */
  porDebajo?: boolean;
};

const TRAMOS: Tramo[] = [
  {
    clave: 'salaryFloor',
    nombre: 'Suelo salarial',
    resumen: 'Lo mínimo que un equipo está obligado a gastar.',
    penas: [
      'Quien termine la temporada por debajo paga la diferencia y se reparte entre sus propios jugadores.',
      'No hay límite a fichar: la penalización es solo económica.',
    ],
    porDebajo: true,
  },
  {
    clave: 'salaryCap',
    nombre: 'Tope salarial',
    resumen: 'Es un tope blando: pasarlo no está penalizado.',
    penas: [
      'La mayoría de equipos lo superan con normalidad.',
      'A partir de aquí ya no se puede fichar libremente: solo con excepciones, como los derechos Bird para renovar a los propios o la excepción de nivel medio.',
    ],
  },
  {
    clave: 'luxuryTax',
    nombre: 'Impuesto de lujo',
    resumen: 'Primera línea con coste real, y solo en dinero.',
    penas: [
      'Se paga por cada dólar de exceso, en tramos con tipos crecientes: 1,50 dólares en el primero, 1,75 en el segundo, 2,50 en el tercero, 3,25 en el cuarto, y 0,50 más por cada tramo adicional.',
      'Los reincidentes, los que han pagado en tres de las cuatro temporadas anteriores, pagan casi el doble: en torno a 3,00, 3,25, 5,50 y 6,75.',
      'Se calcula con la plantilla al final de la temporada regular, así que un equipo puede esquivarlo traspasando antes del cierre del mercado.',
    ],
  },
  {
    clave: 'firstApron',
    nombre: 'Primer apron',
    resumen: 'Aquí empiezan las restricciones deportivas.',
    penas: [
      'No puede recibir a un jugador en un traspaso con firma previa.',
      'No puede usar la excepción bianual.',
      'No puede usar la excepción de nivel medio completa, solo la reducida para pagadores del impuesto.',
      'No puede quedarse con jugadores cortados cuyo salario anterior superara el nivel medio.',
    ],
  },
  {
    clave: 'secondApron',
    nombre: 'Segundo apron',
    resumen: 'El tramo más restrictivo del convenio.',
    penas: [
      'No puede usar ninguna excepción de nivel medio, ni siquiera la reducida.',
      'No puede juntar los salarios de varios jugadores en un traspaso para encajar uno grande, que es la vía habitual para fichar estrellas.',
      'No puede incluir dinero en un traspaso.',
      'Si termina la temporada por encima, se le congela su primera ronda del draft de siete años después: queda intraspasable.',
      'Repetirlo puede hacer que esa elección caiga al final de la primera ronda.',
    ],
  },
];

function millones(valor: number): string {
  return `${(valor / 1_000_000).toFixed(1).replace('.', ',')} M`;
}

export function SalaryRulesModal({
  visible,
  onClose,
  datos,
}: {
  visible: boolean;
  onClose: () => void;
  datos: TeamSalary;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.cabecera}>
            <Text style={styles.titulo}>Límites salariales</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.intro}>
            Nómina actual: {millones(datos.payroll)}. Cada línea que se cruza no cuesta solo
            dinero, también quita herramientas para fichar.
          </Text>

          <ScrollView contentContainerStyle={styles.lista}>
            {TRAMOS.map((tramo) => {
              const valor = datos[tramo.clave];
              if (!valor) return null;

              const afectado = tramo.porDebajo
                ? datos.payroll < valor
                : datos.payroll >= valor;

              return (
                <View
                  key={tramo.clave}
                  style={[styles.tramo, afectado && styles.tramoActivo]}
                >
                  <View style={styles.tramoCabecera}>
                    <Text style={[styles.tramoNombre, afectado && styles.tramoNombreActivo]}>
                      {tramo.nombre}
                    </Text>
                    <Text style={styles.tramoValor}>{millones(valor)}</Text>
                  </View>

                  {afectado && (
                    <View style={styles.marca}>
                      <Ionicons name="alert-circle" size={13} color={colors.primary} />
                      <Text style={styles.marcaTexto}>
                        {tramo.porDebajo ? 'El equipo está por debajo' : 'El equipo lo supera'}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.tramoResumen}>{tramo.resumen}</Text>

                  {tramo.penas.map((pena) => (
                    <View key={pena} style={styles.pena}>
                      <Text style={styles.penaPunto}>·</Text>
                      <Text style={styles.penaTexto}>{pena}</Text>
                    </View>
                  ))}
                </View>
              );
            })}

            <Text style={styles.nota}>
              Reglas del convenio colectivo de 2023, el que introdujo los dos aprons.
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  titulo: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.displayBold,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  tramo: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  // El que afecta al equipo se destaca del resto
  tramoActivo: { borderColor: colors.primary },
  tramoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tramoNombre: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
  },
  tramoNombreActivo: { color: colors.primary },
  tramoValor: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  marcaTexto: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  tramoResumen: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pena: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  penaPunto: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  penaTexto: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    lineHeight: 18,
  },
  nota: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
