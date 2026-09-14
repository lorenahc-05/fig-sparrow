// ============================================================
// DATOS ESTÁTICOS — Guía nutricional + Programa de entrenamiento
// (contenido inicial extraído de los PDFs; editable luego en la app
// para las ideas de comida, no para la estructura del programa de gym)
// ============================================================

const MEAL_DEFS = {
  cafe:      { label: "Café",          kcal: "50-100",  protein: "1-3",   order: 1 },
  almuerzo:  { label: "Almuerzo",      kcal: "250-350", protein: "15-25", order: 2 },
  comida:    { label: "Comida",        kcal: "400-550", protein: "30-40", order: 3, flex: "LA MÁS FLEXIBLE" },
  merienda:  { label: "Merienda",      kcal: "200-300", protein: "15-22", order: 4, flex: "PRE-ENTRENO" },
  cena:      { label: "Cena",          kcal: "350-450", protein: "30-35", order: 5 },
  margen:    { label: "Margen libre",  kcal: "150-250", protein: null,    order: 6, flex: "ACEITE, CAPRICHO, RACIÓN" },
};

const MEAL_TOTAL = "1400-1850 KCAL";
const MEAL_TOTAL_TARGET = "~1800 KCAL";
const PROTEIN_TARGET = "~150 G PROTEÍNA";

// Cada idea: id, nombre, kcal, proteina (g), ingredientes[{name, amount}], nota de ajuste
const DEFAULT_IDEAS = {
  cafe: [],
  almuerzo: [
    {
      id: "brunch",
      name: "Plato brunch",
      kcal: 266,
      protein: 15,
      tag: "HUEVO · AGUACATE · VERDURA",
      ingredients: [
        { name: "Huevos cocidos", amount: "2 ud" },
        { name: "Tortita de arroz", amount: "1 ud" },
        { name: "Tomate + espinacas", amount: "100 g" },
        { name: "Aguacate", amount: "35 g" },
      ],
      note: "Para bajar kcal manteniendo volumen: cambia el aguacate por champiñones salteados + 1 clara extra (~30 kcal, sube proteína).",
    },
    {
      id: "dos-platitos",
      name: "Dos platitos",
      kcal: 215,
      protein: 24,
      tag: "BOCATA · YOGUR",
      ingredients: [
        { name: "Panecillo integral", amount: "1/2 ud" },
        { name: "Claras de huevo", amount: "2 ud" },
        { name: "Jamón serrano", amount: "1 loncha" },
        { name: "Yogur (0% o proteico)", amount: "1 ud" },
        { name: "Kiwi", amount: "1/2 ud" },
      ],
      note: "Queda margen de hasta 50 kcal extra si quieres añadir avena o una loncha más de jamón.",
    },
    {
      id: "overnight-oats",
      name: "Overnight oats",
      kcal: 258,
      protein: 10.6,
      tag: "AVENA · CHÍA · KIWI · JAMÓN",
      ingredients: [
        { name: "Copos de avena", amount: "25 g" },
        { name: "Semillas de chía", amount: "8 g" },
        { name: "Leche de avena", amount: "100 ml" },
        { name: "Kiwi", amount: "1 ud" },
        { name: "Jamón serrano", amount: "1 loncha" },
      ],
      note: "Proteína más baja que las otras opciones. Para igualarla: añade proteína en polvo neutra a la mezcla nocturna o sube a 2 lonchas de jamón. Reposar toda la noche.",
    },
  ],
  comida: [],
  merienda: [
    {
      id: "yogur-avena-kiwi",
      name: "Yogur proteico + avena + kiwi",
      kcal: 238,
      protein: 17.7,
      tag: "YOGUR · AVENA · CACAO",
      ingredients: [
        { name: "Yogur proteico Hacendado 0%", amount: "120 g" },
        { name: "Avena", amount: "30 g" },
        { name: "Kiwi", amount: "1 ud" },
        { name: "Cacao 100% en polvo", amount: "1 cda (~5 g)" },
      ],
      note: "",
    },
    {
      id: "bizcocho-huevo-avena",
      name: "Bizcocho individual de huevo y avena",
      kcal: 258,
      protein: 10.7,
      tag: "HUEVO · AVENA · MANZANA",
      ingredients: [
        { name: "Huevo", amount: "1 ud" },
        { name: "Harina de avena", amount: "2 cda (~20 g)" },
        { name: "Manzana", amount: "1 ud" },
        { name: "Natillas +Proteínas Hacendado", amount: "1 cda (~15 g)" },
      ],
      note: "Buena opción para variar textura respecto al yogur. Ideal en días donde el almuerzo o la comida fueron más ligeros de lo normal. El resto del bote de natillas se guarda para otro día.",
    },
  ],
  cena: [],
  margen: [],
};

const COMPENSATION_NOTE =
  "Si la comida de mediodía sale más calórica de lo normal, resta ese exceso de la merienda o la cena eligiendo la opción más ligera. Si tienes mucha hambre en el almuerzo o la merienda, elige la opción más alta del rango en vez de forzarte a la más baja.";

// ============================================================
// GYM — ejercicios (slug compartido = carga compartida/heredada)
// ============================================================

const EXERCISES = {
  "prensa-unilateral":        { name: "Prensa unilateral", detail: "45°, pies altos/abiertos" },
  "hip-thrust":                { name: "Hip thrust", detail: "barra o máquina" },
  "jalon-pecho":                { name: "Jalón al pecho", detail: "agarre neutro/cerrado" },
  "press-pecho":                { name: "Press pecho en máquina", detail: "" },
  "plancha":                    { name: "Plancha", detail: "", bodyweight: true },
  "hack-squat":                { name: "Hack squat", detail: "o sentadilla guiada en multipower" },
  "pull-through":                { name: "Cable pull-through", detail: "bisagra de cadera, sin carga lumbar" },
  "remo-maquina":                { name: "Remo en máquina", detail: "con apoyo en pecho" },
  "curl-femoral":                { name: "Curl femoral", detail: "tumbado o sentado" },
  "plancha-lateral":            { name: "Plancha lateral", detail: "", bodyweight: true },
  "extension-cuadriceps":        { name: "Extensión de cuádriceps", detail: "" },
  "plancha-deadbug":            { name: "Plancha / dead bug", detail: "", bodyweight: true },
  "press-hombro-mancuernas":    { name: "Press hombro con mancuernas", detail: "sentada, controlado, sin buscar fallo" },
  "face-pull":                    { name: "Face pull", detail: "" },
  "hip-thrust-unilateral":        { name: "Hip thrust a una pierna", detail: "o con banda" },
  "abductores":                { name: "Abductores en máquina", detail: "" },
};

function ex(slug, sets, reps, rir, rest, opts) {
  opts = opts || {};
  return Object.assign({ slug, sets, reps, rir, rest, trackWeight: !EXERCISES[slug].bodyweight }, opts);
}

const WORKOUTS = {
  "pierna-a": {
    id: "pierna-a",
    group: "base",
    name: "Pierna A",
    subtitle: "Cuádriceps / glúteo · sin peso muerto",
    warmup: "5 min bici suave + movilidad de cadera y tobillo",
    note: "Evitar peso muerto convencional (carga lumbar).",
    exercises: [
      ex("prensa-unilateral", 3, "10-12 / pierna", "2-3", "90 s"),
      ex("hip-thrust", 3, "8-10", "2", "120 s"),
      ex("hack-squat", 3, "10-12", "2-3", "90 s"),
      ex("extension-cuadriceps", 3, "12-15", "2", "60 s"),
      ex("plancha-deadbug", 3, "30-40 s", "—", "45 s"),
    ],
  },
  "tren-superior": {
    id: "tren-superior",
    group: "base",
    name: "Tren superior",
    subtitle: "Densidad, no amplitud",
    warmup: "5 min remo o bici + movilidad de hombro (sin forzar rango cervical)",
    note: "Evitar agarre ancho en jalón/remo y remo en multipower inclinado. Sin encogimientos ni press militar pesado (carga cervical, bruxismo).",
    exercises: [
      ex("jalon-pecho", 3, "10-12", "2-3", "90 s"),
      ex("remo-maquina", 3, "10-12", "2", "90 s"),
      ex("press-hombro-mancuernas", 3, "10-12", "3", "75 s"),
      ex("press-pecho", 2, "10-12", "3", "75 s"),
      ex("face-pull", 2, "15", "—", "60 s"),
    ],
  },
  "pierna-b": {
    id: "pierna-b",
    group: "base",
    name: "Pierna B",
    subtitle: "Glúteo / isquios · sin peso muerto",
    warmup: "5 min bici + movilidad de cadera",
    note: "Sin patada de glúteo en máquina (baja conexión mente-músculo). Nunca peso muerto convencional.",
    exercises: [
      ex("pull-through", 3, "10-12", "2-3", "90 s"),
      ex("curl-femoral", 3, "10-12", "2", "75 s"),
      ex("hip-thrust-unilateral", 3, "10 / pierna", "2", "90 s"),
      ex("abductores", 3, "12-15", "2", "60 s"),
      ex("plancha-lateral", 2, "30 s / lado", "—", "45 s"),
    ],
  },
  "natacion": {
    id: "natacion",
    group: "base",
    name: "Natación",
    subtitle: "1x semana · 50 min aprox.",
  },
  "full-body-a": {
    id: "full-body-a",
    group: "extension",
    name: "Full body A",
    subtitle: "Prensa · hip thrust · jalón · press · plancha",
    warmup: "5 min bici suave + movilidad de cadera y tobillo",
    exercises: [
      ex("prensa-unilateral", 3, "10-12 / pierna", "2-3", "90 s"),
      ex("hip-thrust", 3, "8-10", "2", "120 s"),
      ex("jalon-pecho", 3, "10-12", "2-3", "90 s"),
      ex("press-pecho", 2, "10-12", "3", "75 s"),
      ex("plancha", 3, "30-40 s", "—", "45 s"),
    ],
  },
  "full-body-b": {
    id: "full-body-b",
    group: "extension",
    name: "Full body B",
    subtitle: "Hack · pull-through · remo · femoral · lateral",
    warmup: "5 min bici + movilidad de cadera y hombro",
    note: "Sin peso muerto convencional (carga lumbar).",
    exercises: [
      ex("hack-squat", 3, "10-12", "2-3", "90 s"),
      ex("pull-through", 3, "10-12", "2-3", "90 s"),
      ex("remo-maquina", 3, "10-12", "2", "90 s"),
      ex("curl-femoral", 3, "10-12", "2", "75 s"),
      ex("plancha-lateral", 2, "30 s / lado", "—", "45 s"),
    ],
  },
};

const WORKOUT_ORDER_BASE = ["pierna-a", "tren-superior", "pierna-b", "natacion"];
const WORKOUT_ORDER_EXT = ["full-body-a", "full-body-b"];

const PROGRESSION_NOTE =
  "Progresión doble: al llegar al límite superior del rango de reps en todas las series con el RIR objetivo y buena técnica, sube la carga y vuelve al límite inferior del rango.";

// ============================================================
// NATACIÓN — entrenos posibles (editable) + registros (log)
// ============================================================

const DEFAULT_SWIM_IDEAS = [
  {
    id: "tecnica-mixta",
    name: "Técnica mixta",
    detail: "Alternar crol, braza y espalda, ~50 min, ~1,3 km. Trabajo de técnica y actividad de base, no se trata como cardio de alta intensidad.",
  },
];
