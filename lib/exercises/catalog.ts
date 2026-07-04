// Catálogo estático de ejercicios para ayuda visual.
// Los nombres ya están normalizados: minúsculas, sin acentos, sin artículos
// innecesarios. El lookup hace matching por substring.

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export interface ExerciseCatalogEntry {
  names: string[];           // variantes normalizadas del nombre
  label: string;             // nombre a mostrar en la UI
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tip: string;               // consejo breve de técnica
}

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  // ─── PECHO ────────────────────────────────────────────────────────────────
  {
    names: ['press banca', 'bench press', 'press de banca'],
    label: 'Press de banca',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps'],
    tip: 'Escápulas retraídas y pies apoyados en el suelo. Bajá la barra al pecho inferior y empujá en línea recta.',
  },
  {
    names: ['press banca inclinado', 'press inclinado', 'incline bench press', 'press incline'],
    label: 'Press de banca inclinado',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps'],
    tip: 'Inclinación de 30-45°. Enfoca la porción clavicular del pectoral. Codos a 45° del cuerpo.',
  },
  {
    names: ['press banca declinado', 'press declinado', 'decline bench press'],
    label: 'Press de banca declinado',
    primary: ['chest'],
    secondary: ['triceps'],
    tip: 'Mayor activación del pectoral inferior. Cuidá que los pies estén bien anclados.',
  },
  {
    names: ['aperturas', 'fly', 'flies', 'pec deck', 'aperturas mancuernas'],
    label: 'Aperturas con mancuernas',
    primary: ['chest'],
    secondary: ['shoulders'],
    tip: 'Mantené una leve flexión de codo durante todo el movimiento. Sentí el estiramiento en la fase excéntrica.',
  },
  {
    names: ['crossover', 'cables cruce', 'cruce poleas', 'cable fly'],
    label: 'Cruce de poleas',
    primary: ['chest'],
    secondary: [],
    tip: 'Inclinación leve hacia adelante. Cruzá las manos al final para máxima contracción.',
  },
  {
    names: ['fondos paralelas', 'dips pecho', 'dips', 'paralelas'],
    label: 'Fondos en paralelas',
    primary: ['chest', 'triceps'],
    secondary: ['shoulders'],
    tip: 'Inclinación hacia adelante para énfasis en pecho. Bajá hasta que el codo llegue a 90°.',
  },
  {
    names: ['push up', 'pushup', 'flexiones', 'lagartijas', 'flexiones piso'],
    label: 'Flexiones de piso',
    primary: ['chest'],
    secondary: ['triceps', 'shoulders', 'core'],
    tip: 'Cuerpo en línea recta. Manos a la altura de los hombros o algo más abiertas.',
  },
  {
    names: ['press pecho maquina', 'press maquina pecho', 'chest press'],
    label: 'Press de pecho en máquina',
    primary: ['chest'],
    secondary: ['triceps', 'shoulders'],
    tip: 'Ajustá el asiento para que las manijas queden a la altura del pecho. Empujá de forma controlada.',
  },

  // ─── ESPALDA ─────────────────────────────────────────────────────────────
  {
    names: ['dominadas', 'pull up', 'pullup', 'chin up', 'barra fija'],
    label: 'Dominadas',
    primary: ['back'],
    secondary: ['biceps'],
    tip: 'Empezá con los brazos extendidos. Llevá el pecho a la barra y bajaáis de forma controlada.',
  },
  {
    names: ['remo barra', 'remo con barra', 'barbell row', 'bent over row'],
    label: 'Remo con barra',
    primary: ['back'],
    secondary: ['biceps', 'traps', 'core'],
    tip: 'Espalda recta a 45°. Llevá la barra al abdomen bajo, no al pecho. Codos cerca del cuerpo.',
  },
  {
    names: ['remo mancuerna', 'remo mancuernas', 'dumbbell row', 'remo 1 brazo'],
    label: 'Remo con mancuerna',
    primary: ['back'],
    secondary: ['biceps'],
    tip: 'Apoyá rodilla y mano en el banco. Llevá la mancuerna al costado de la cadera, no al pecho.',
  },
  {
    names: ['jalones polea', 'lat pulldown', 'jalones', 'polea alta'],
    label: 'Jalones en polea alta',
    primary: ['back'],
    secondary: ['biceps'],
    tip: 'Inclinación leve del torso. Llevá la barra al pecho superior, no tras la nuca.',
  },
  {
    names: ['remo polea', 'remo sentado', 'seated row', 'cable row', 'polea baja'],
    label: 'Remo en polea baja',
    primary: ['back'],
    secondary: ['biceps', 'traps'],
    tip: 'Mantené la espalda erguida. Llevá los codos hacia atrás apretando las escápulas al final.',
  },
  {
    names: ['pull over', 'pullover', 'pullover mancuerna'],
    label: 'Pullover',
    primary: ['back'],
    secondary: ['chest', 'triceps'],
    tip: 'Brazos casi extendidos. Sentí el estiramiento del dorsal al bajar la mancuerna por detrás de la cabeza.',
  },
  {
    names: ['remo en maquina', 'remo maquina', 'machine row'],
    label: 'Remo en máquina',
    primary: ['back'],
    secondary: ['biceps'],
    tip: 'Ajustá el pecho al apoyo. Llevá los codos hacia atrás y apretá el dorsal al final.',
  },
  {
    names: ['face pull', 'facepull'],
    label: 'Face pull',
    primary: ['traps', 'shoulders'],
    secondary: ['back'],
    tip: 'Polea a la altura de los ojos. Llevá las manos hacia las orejas con los codos altos.',
  },

  // ─── HOMBROS ──────────────────────────────────────────────────────────────
  {
    names: ['press militar', 'overhead press', 'press hombro', 'press hombros', 'ohp'],
    label: 'Press militar',
    primary: ['shoulders'],
    secondary: ['triceps', 'traps', 'core'],
    tip: 'De pie o sentado. Llevá la barra en línea recta sobre la cabeza. No arquées la lumbar.',
  },
  {
    names: ['press arnold', 'arnold press'],
    label: 'Press Arnold',
    primary: ['shoulders'],
    secondary: ['triceps'],
    tip: 'Comenzá con palmas hacia vos y rotá al subir. Cubre las tres cabezas del deltoides.',
  },
  {
    names: ['elevaciones laterales', 'lateral raise', 'laterales', 'elevaciones laterales mancuernas'],
    label: 'Elevaciones laterales',
    primary: ['shoulders'],
    secondary: [],
    tip: 'Codos levemente flexionados. Subí hasta la altura del hombro. No uses inercia.',
  },
  {
    names: ['elevaciones frontales', 'front raise', 'frontales'],
    label: 'Elevaciones frontales',
    primary: ['shoulders'],
    secondary: [],
    tip: 'Subí el brazo hasta la horizontal. Controlá la bajada para mayor activación.',
  },
  {
    names: ['remo al menton', 'remo al mentón', 'upright row'],
    label: 'Remo al mentón',
    primary: ['traps', 'shoulders'],
    secondary: [],
    tip: 'Agarre estrecho. Llevá los codos altos, por encima de las manos. Cuidado con el agarre muy cerrado.',
  },
  {
    names: ['pajaros', 'pájaros', 'rear delt fly', 'reverse fly', 'patras mancuernas'],
    label: 'Pájaros (deltoides posterior)',
    primary: ['shoulders'],
    secondary: ['back', 'traps'],
    tip: 'Torso paralelo al piso. Abrí los brazos hasta la altura del hombro con codos levemente flexionados.',
  },

  // ─── BÍCEPS ───────────────────────────────────────────────────────────────
  {
    names: ['curl biceps', 'curl con barra', 'barbell curl', 'curl barra'],
    label: 'Curl con barra',
    primary: ['biceps'],
    secondary: ['forearms'],
    tip: 'Codos pegados al cuerpo. Sube hasta casi tocarte el hombro y bajá de forma controlada.',
  },
  {
    names: ['curl mancuernas', 'curl mancuerna', 'dumbbell curl'],
    label: 'Curl con mancuernas',
    primary: ['biceps'],
    secondary: ['forearms'],
    tip: 'Podés rotar la muñeca al subir (supinación) para mayor contracción del bíceps.',
  },
  {
    names: ['curl martillo', 'hammer curl', 'curl neutro'],
    label: 'Curl martillo',
    primary: ['biceps', 'forearms'],
    secondary: [],
    tip: 'Palmas enfrentadas durante todo el movimiento. Activa el braquial y el braquiorradial.',
  },
  {
    names: ['curl concentrado', 'concentration curl'],
    label: 'Curl concentrado',
    primary: ['biceps'],
    secondary: [],
    tip: 'Codo apoyado en el muslo. Gran aislamiento del bíceps. Apretá al tope del recorrido.',
  },
  {
    names: ['curl predicador', 'preacher curl', 'scott curl'],
    label: 'Curl en predicador',
    primary: ['biceps'],
    secondary: [],
    tip: 'No extiendas del todo el codo al bajar para no dañar la articulación. Enfoca el bíceps corto.',
  },

  // ─── TRÍCEPS ──────────────────────────────────────────────────────────────
  {
    names: ['press frances', 'press francés', 'skull crusher', 'tumbado triceps'],
    label: 'Press francés',
    primary: ['triceps'],
    secondary: [],
    tip: 'Codos apuntando al techo. Bajá la barra a la frente o detrás de la cabeza. Codos estables.',
  },
  {
    names: ['extension triceps polea', 'pushdown', 'jalones triceps', 'polea triceps', 'triceps polea'],
    label: 'Jalones de tríceps en polea',
    primary: ['triceps'],
    secondary: [],
    tip: 'Codos fijos al cuerpo. Extendé completamente el codo al final del recorrido.',
  },
  {
    names: ['triceps cuerda', 'cuerda triceps', 'rope pushdown'],
    label: 'Jalones de tríceps con cuerda',
    primary: ['triceps'],
    secondary: [],
    tip: 'Abrí la cuerda al final para mayor activación de la cabeza lateral del tríceps.',
  },
  {
    names: ['patada triceps', 'kickback', 'patada mancuerna'],
    label: 'Patada de tríceps',
    primary: ['triceps'],
    secondary: [],
    tip: 'Torso paralelo al piso. Fijá el codo y solo mové el antebrazo. Extendé completamente.',
  },
  {
    names: ['dips triceps', 'fondos banco', 'bench dip'],
    label: 'Fondos para tríceps',
    primary: ['triceps'],
    secondary: ['shoulders'],
    tip: 'Mantenés el cuerpo cerca del banco y bajá hasta que el codo llegue a 90°.',
  },
  {
    names: ['extension overhead triceps', 'extension triceps cabeza', 'overhead extension'],
    label: 'Extensión de tríceps overhead',
    primary: ['triceps'],
    secondary: [],
    tip: 'Codos apuntando hacia arriba. Especialmente efectivo para la cabeza larga del tríceps.',
  },

  // ─── CUÁDRICEPS ───────────────────────────────────────────────────────────
  {
    names: ['sentadilla', 'squat', 'sentadillas', 'squats'],
    label: 'Sentadilla',
    primary: ['quads'],
    secondary: ['glutes', 'hamstrings', 'core'],
    tip: 'Pies a la anchura de hombros. Bajá con la espalda recta. Las rodillas siguen la dirección de los pies.',
  },
  {
    names: ['sentadilla frontal', 'front squat'],
    label: 'Sentadilla frontal',
    primary: ['quads'],
    secondary: ['core', 'glutes'],
    tip: 'Mayor demanda de movilidad. Codos altos y espalda erguida para no tirar la barra hacia adelante.',
  },
  {
    names: ['prensa', 'leg press', 'prensa pierna'],
    label: 'Prensa de piernas',
    primary: ['quads'],
    secondary: ['glutes', 'hamstrings'],
    tip: 'No bloquees las rodillas al extender. Posición de pies cambia el énfasis muscular.',
  },
  {
    names: ['extension cuadriceps', 'extensiones cuadriceps', 'leg extension', 'extension pierna'],
    label: 'Extensiones de cuádriceps',
    primary: ['quads'],
    secondary: [],
    tip: 'Aislamiento del cuádriceps. Apretá al tope y bajá de forma controlada. No uses mucho peso.',
  },
  {
    names: ['zancada', 'lunge', 'estocada', 'zancadas'],
    label: 'Zancadas',
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings'],
    tip: 'Paso largo. La rodilla trasera casi toca el piso. Mantené el torso erguido.',
  },
  {
    names: ['sentadilla bulgara', 'sentadilla búlgara', 'bulgarian split squat', 'split squat'],
    label: 'Sentadilla búlgara',
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings'],
    tip: 'Pie trasero elevado en banco. Gran trabajo unilateral. Controlá el equilibrio.',
  },
  {
    names: ['hack squat', 'sentadilla hack'],
    label: 'Hack squat',
    primary: ['quads'],
    secondary: ['glutes'],
    tip: 'Pies adelantados en la plataforma para mayor énfasis en cuádriceps. Bajá hasta 90°.',
  },

  // ─── ISQUIOTIBIALES / GLÚTEOS ─────────────────────────────────────────────
  {
    names: ['peso muerto rumano', 'rdl', 'romanian deadlift', 'peso muerto pierna rigida'],
    label: 'Peso muerto rumano',
    primary: ['hamstrings', 'glutes'],
    secondary: ['back', 'core'],
    tip: 'Espalda recta y rodillas casi extendidas. Siento el tirón en los isquiotibiales al bajar la barra.',
  },
  {
    names: ['peso muerto', 'deadlift'],
    label: 'Peso muerto',
    primary: ['back', 'hamstrings', 'glutes'],
    secondary: ['traps', 'core', 'forearms'],
    tip: 'Barra cerca del cuerpo. Empujá el piso con los pies, no tires con la espalda. Bloqueo de cadera arriba.',
  },
  {
    names: ['curl femoral', 'leg curl', 'curl isquiotibiales', 'femoral acostado'],
    label: 'Curl de isquiotibiales',
    primary: ['hamstrings'],
    secondary: ['glutes'],
    tip: 'Caderas apoyadas en el banco. Contraé al máximo y controlá la fase excéntrica.',
  },
  {
    names: ['hip thrust', 'empuje cadera', 'puente gluteo', 'puente de gluteo'],
    label: 'Hip thrust',
    primary: ['glutes'],
    secondary: ['hamstrings', 'core'],
    tip: 'Espalda en banco, barra en las caderas. Subí hasta que muslos y torso formen una línea recta.',
  },
  {
    names: ['buenos dias', 'good morning'],
    label: 'Buenos días',
    primary: ['hamstrings', 'glutes'],
    secondary: ['back', 'core'],
    tip: 'Barra en trapecios. Bisagra de cadera con espalda neutra. Controlá la bajada.',
  },
  {
    names: ['glute bridge', 'puente', 'bridge'],
    label: 'Puente de glúteos',
    primary: ['glutes'],
    secondary: ['hamstrings', 'core'],
    tip: 'Pies apoyados en el suelo. Apretá el glúteo al llegar arriba. Opción sin barra para iniciantes.',
  },
  {
    names: ['abductores', 'abductor', 'abduccion cadera'],
    label: 'Abductores',
    primary: ['glutes'],
    secondary: [],
    tip: 'En máquina o con cable. Movimiento controlado hacia afuera. Evita compensar con la cadera.',
  },

  // ─── GEMELOS ──────────────────────────────────────────────────────────────
  {
    names: ['elevacion talon', 'elevaciones talon', 'calf raise', 'gemelos de pie'],
    label: 'Elevaciones de talón de pie',
    primary: ['calves'],
    secondary: [],
    tip: 'Subí hasta el tope y bajá lo más que puedas para gran rango. Mantené el control todo el tiempo.',
  },
  {
    names: ['gemelos sentado', 'seated calf raise', 'calf raise sentado'],
    label: 'Elevaciones de talón sentado',
    primary: ['calves'],
    secondary: [],
    tip: 'Activa principalmente el sóleo (músculo profundo). Ideal complementar con la variante de pie.',
  },

  // ─── CORE / ABDOMEN ───────────────────────────────────────────────────────
  {
    names: ['plancha', 'plank', 'plancha abdominal'],
    label: 'Plancha',
    primary: ['core'],
    secondary: ['shoulders'],
    tip: 'Cuerpo en línea recta. No dejes caer las caderas ni las subas demasiado. Respirá de forma continua.',
  },
  {
    names: ['crunch', 'abdominales', 'abdominal crunch'],
    label: 'Crunch abdominal',
    primary: ['core'],
    secondary: [],
    tip: 'No jalés el cuello. Contraé el abdomen al subir. El movimiento es pequeño y controlado.',
  },
  {
    names: ['crunch inverso', 'reverse crunch', 'crunch piernas'],
    label: 'Crunch inverso',
    primary: ['core'],
    secondary: [],
    tip: 'Llevá las rodillas hacia el pecho contrayendo el abdomen. Evita el impulso.',
  },
  {
    names: ['rueda abdominales', 'ab wheel', 'rueda abdominal'],
    label: 'Rueda abdominal',
    primary: ['core'],
    secondary: ['shoulders', 'triceps'],
    tip: 'Avanzá solo hasta donde mantengas la espalda neutra. Muy efectiva pero exigente.',
  },
  {
    names: ['dragon flag'],
    label: 'Dragon flag',
    primary: ['core'],
    secondary: [],
    tip: 'Cuerpo rígido. Controlá la bajada excéntrica. Ejercicio avanzado.',
  },
  {
    names: ['plancha lateral', 'side plank'],
    label: 'Plancha lateral',
    primary: ['core'],
    secondary: ['shoulders'],
    tip: 'Cuerpo alineado de cabeza a pies. Activa el oblicuo. Mantén las caderas elevadas.',
  },
  {
    names: ['mountain climber', 'escalador'],
    label: 'Mountain climbers',
    primary: ['core'],
    secondary: ['shoulders', 'quads'],
    tip: 'Posición de plancha, alterná rodillas hacia el pecho rápidamente. Combina core y cardio.',
  },
  {
    names: ['hollow body', 'hollow hold'],
    label: 'Hollow body',
    primary: ['core'],
    secondary: [],
    tip: 'Espalda baja pegada al piso, brazos y piernas extendidos. Base de la gimnasia.',
  },
  {
    names: ['leg raise', 'elevacion piernas', 'elevaciones piernas colgado'],
    label: 'Elevación de piernas',
    primary: ['core'],
    secondary: [],
    tip: 'Piernas rectas o flexionadas. Controlá la bajada. En barra: más rango de movimiento.',
  },

  // ─── FUNCIONAL / CROSSFIT ─────────────────────────────────────────────────
  {
    names: ['thruster'],
    label: 'Thruster',
    primary: ['quads', 'shoulders'],
    secondary: ['glutes', 'core', 'triceps'],
    tip: 'Sentadilla + press overhead en un movimiento continuo. Usá el impulso de las piernas para el press.',
  },
  {
    names: ['clean', 'cargada', 'power clean'],
    label: 'Clean (cargada)',
    primary: ['back', 'quads', 'glutes'],
    secondary: ['shoulders', 'core', 'traps'],
    tip: 'Triple extensión (tobillo, rodilla, cadera). Recibí la barra en rack position con los codos altos.',
  },
  {
    names: ['snatch', 'arranque'],
    label: 'Snatch (arranque)',
    primary: ['back', 'quads', 'glutes'],
    secondary: ['shoulders', 'core'],
    tip: 'Movimiento técnico. Agarre ancho. La barra sube pegada al cuerpo hasta overhead en un solo movimiento.',
  },
  {
    names: ['burpee', 'burpees'],
    label: 'Burpees',
    primary: ['core', 'chest'],
    secondary: ['shoulders', 'quads'],
    tip: 'Flexión, plancha, salto. Mantené el ritmo y la forma aunque vayas rápido.',
  },
  {
    names: ['kettlebell swing', 'swing'],
    label: 'Kettlebell swing',
    primary: ['glutes', 'hamstrings'],
    secondary: ['back', 'core', 'shoulders'],
    tip: 'Bisagra de cadera, no sentadilla. La fuerza viene de las caderas, no de los brazos.',
  },
  {
    names: ['box jump', 'salto caja', 'saltos caja'],
    label: 'Box jump',
    primary: ['quads', 'glutes'],
    secondary: ['calves', 'core'],
    tip: 'Aterrizá con las rodillas flexionadas para amortiguar. Bajá caminando, no saltando.',
  },
  {
    names: ['wall ball', 'balón al muro'],
    label: 'Wall ball',
    primary: ['quads', 'shoulders'],
    secondary: ['glutes', 'core'],
    tip: 'Sentadilla profunda y lanzá la pelota al target con los brazos extendidos. Ritmo continuo.',
  },
  {
    names: ['turkish get up', 'tgu'],
    label: 'Turkish get up',
    primary: ['shoulders', 'core'],
    secondary: ['glutes', 'quads'],
    tip: 'Movimiento lento y controlado. La vista siempre hacia la kettlebell. Trabaja la estabilidad total.',
  },
  {
    names: ['deadlift sumo', 'peso muerto sumo', 'sumo deadlift'],
    label: 'Peso muerto sumo',
    primary: ['glutes', 'hamstrings', 'quads'],
    secondary: ['back', 'core'],
    tip: 'Pies muy abiertos, manos dentro de las piernas. Mayor énfasis en glúteos y aductores.',
  },

  // ─── TRAPECIOS ────────────────────────────────────────────────────────────
  {
    names: ['encogimientos', 'shrugs', 'encogimiento hombros'],
    label: 'Encogimientos de hombros',
    primary: ['traps'],
    secondary: [],
    tip: 'Sube los hombros directamente hacia las orejas. No rotés. Mantenés un segundo arriba.',
  },
];
