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

// Días de la semana: 0=Lunes … 6=Domingo
const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_ABBR = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

// Cada idea: id, nombre, kcal, proteina (g), ingredientes[{name, amount}],
// steps (elaboración paso a paso), days (índices de días en los que cae en
// el menú semanal — opcional, las alternativas sueltas no llevan days),
// nota de ajuste, photo (dataURL, se añade desde la app)
const DEFAULT_IDEAS = {
  cafe: [],
  almuerzo: [
    {
      id: "brunch",
      name: "Plato brunch",
      kcal: 266,
      protein: 15,
      tag: "HUEVO · AGUACATE · VERDURA",
      days: [0, 6],
      ingredients: [
        { name: "Huevos cocidos", amount: "2 ud (106 g)" },
        { name: "Tortita de arroz", amount: "1 ud (~9 g)" },
        { name: "Tomate + espinacas", amount: "100 g" },
        { name: "Aguacate", amount: "1/4 ud (35 g)" },
      ],
      steps: [
        "Cocer los huevos 10-12 min, enfriar y pelar.",
        "Trocear el tomate y las espinacas frescas.",
        "Montar el plato: huevos, tortita de arroz, tomate/espinacas y el cuarto de aguacate en láminas.",
      ],
      note: "Para bajar kcal manteniendo volumen: cambia el aguacate por champiñones salteados + 1 clara extra (~30 kcal, sube proteína).",
    },
    {
      id: "dos-platitos",
      name: "Dos platitos",
      kcal: 215,
      protein: 24,
      tag: "BOCATA · YOGUR",
      days: [1, 4],
      ingredients: [
        { name: "Panecillo integral", amount: "1/2 ud (~22 g)" },
        { name: "Claras de huevo", amount: "2 ud (66 g)" },
        { name: "Jamón serrano", amount: "1 loncha (~13 g)" },
        { name: "Yogur (0% o proteico)", amount: "1 ud pequeño (~120 g)" },
        { name: "Kiwi", amount: "1/2 ud (~35 g)" },
      ],
      steps: [
        "Tostar el medio panecillo.",
        "Cuajar las 2 claras a la plancha o en el micro.",
        "Servir en dos platitos: pan con jamón por un lado, claras con el yogur y el kiwi por otro.",
      ],
      note: "Queda margen de hasta 50 kcal extra si quieres añadir avena o una loncha más de jamón.",
    },
    {
      id: "overnight-oats",
      name: "Overnight oats",
      kcal: 258,
      protein: 10.6,
      tag: "AVENA · CHÍA · KIWI · JAMÓN",
      days: [2, 5],
      ingredients: [
        { name: "Copos de avena", amount: "25 g" },
        { name: "Semillas de chía", amount: "8 g" },
        { name: "Leche de avena", amount: "100 ml" },
        { name: "Kiwi", amount: "1 ud (~70 g)" },
        { name: "Jamón serrano", amount: "1 loncha (~13 g)" },
      ],
      steps: [
        "Mezclar la avena, la chía y la leche de avena en un tarro.",
        "Dejar reposar en la nevera toda la noche.",
        "Por la mañana añadir el kiwi troceado y comer con la loncha de jamón aparte.",
      ],
      note: "Proteína más baja que las otras opciones. Para igualarla: añade proteína en polvo neutra a la mezcla nocturna o sube a 2 lonchas de jamón.",
    },
    {
      id: "pan-integral-cottage",
      name: "Pan integral, huevo, claras, lomo y cottage",
      kcal: 324,
      protein: 33,
      tag: "PAN · HUEVO · LOMO · COTTAGE",
      days: [3],
      ingredients: [
        { name: "Pan integral sin corteza", amount: "2 rebanadas (56 g)" },
        { name: "Huevo", amount: "1 ud (53 g)" },
        { name: "Claras líquidas", amount: "99 g (~3 claras)" },
        { name: "Fiambre de lomo cocido", amount: "2 lonchas (30 g)" },
        { name: "Queso cottage", amount: "50 g" },
      ],
      steps: [
        "Tostar el pan.",
        "Cuajar el huevo y las claras juntos a la plancha o en sartén antiadherente.",
        "Montar con el lomo cocido y el cottage aparte o extendido sobre el pan.",
      ],
      note: "",
    },
  ],
  comida: [
    {
      id: "wrap-huevo-yogur",
      name: "Wrap de huevo, yogur, pepino y aguacate",
      kcal: 431,
      protein: 24,
      tag: "WRAP · HUEVO · YOGUR GRIEGO",
      days: [0],
      ingredients: [
        { name: "Huevos duros", amount: "2 ud (106 g)" },
        { name: "Yogur griego", amount: "60 g" },
        { name: "Pepino", amount: "50 g" },
        { name: "Cebolla", amount: "20 g" },
        { name: "Pan de fajita", amount: "1 ud (50 g)" },
        { name: "Tomate cherry", amount: "40 g" },
        { name: "Aguacate", amount: "40 g" },
      ],
      steps: [
        "Cocer los huevos, picarlos junto con el pepino y la cebolla.",
        "Mezclar con el yogur griego hasta ligar.",
        "Calentar el pan de fajita, rellenar con la mezcla, el tomate cherry en mitades y el aguacate en láminas.",
        "Enrollar y servir.",
      ],
      note: "",
    },
    {
      id: "hamburguesa-pollo-brocoli",
      name: "Hamburguesa de pollo, brócoli, huevo y mozzarella",
      kcal: 444,
      protein: 60,
      tag: "POLLO · BRÓCOLI · MOZZARELLA",
      days: [1],
      ingredients: [
        { name: "Pechuga de pollo triturada", amount: "200 g" },
        { name: "Brócoli picado", amount: "80 g" },
        { name: "Huevo", amount: "1 ud" },
        { name: "Mozzarella rallada", amount: "40 g" },
        { name: "Especias", amount: "al gusto" },
        { name: "Aceite de oliva (sartén)", amount: "5 g" },
      ],
      steps: [
        "Picar el pollo y el brócoli muy fino.",
        "Mezclar con el huevo, la mozzarella y las especias hasta ligar.",
        "Formar la hamburguesa y cocinar en sartén con el aceite, 4-5 min por lado.",
      ],
      note: "Proteína muy alta para ser una sola comida — no es un problema, ya cubre gran parte del mínimo diario tú sola.",
    },
    {
      id: "graten-patata-pollo",
      name: "Gratén de patata y pollo",
      kcal: 438,
      protein: 42,
      tag: "PATATA · POLLO · QUESO CREMA",
      days: [2],
      ingredients: [
        { name: "Patata en láminas", amount: "180 g" },
        { name: "Pollo troceado", amount: "150 g" },
        { name: "Queso crema", amount: "40 g" },
        { name: "Leche", amount: "50 ml" },
        { name: "Ajo en polvo, nuez moscada y pimienta", amount: "al gusto" },
      ],
      steps: [
        "Mezclar la leche con el queso crema, ajo en polvo, nuez moscada y pimienta.",
        "Colocar en una fuente capas de patata y pollo, cubrir con la mezcla de queso crema.",
        "Hornear/airfryer a 180°C hasta que la patata esté tierna y dorado por encima (~25-30 min).",
      ],
      note: "",
    },
    {
      id: "bowl-carne-bigmac",
      name: "Bowl de carne, patata y salsa Big Mac fit",
      kcal: 530,
      protein: 44,
      tag: "CARNE · PATATA · SALSA",
      days: [3],
      ingredients: [
        { name: "Carne picada", amount: "150 g" },
        { name: "Tomate concentrado (en la carne)", amount: "1 cda (16 g)" },
        { name: "Patata en cubos", amount: "150 g" },
        { name: "Lechuga", amount: "al gusto" },
        { name: "Yogur griego (salsa)", amount: "100 g" },
        { name: "Tomate triturado (salsa)", amount: "16 g" },
        { name: "Mostaza (salsa)", amount: "15 g" },
        { name: "Cebolla picada (salsa)", amount: "40 g" },
        { name: "Pepinillo picado (salsa)", amount: "20 g" },
      ],
      steps: [
        "Cocinar la patata en cubos en el airfryer hasta dorar.",
        "Saltear la carne picada con el tomate concentrado y especias.",
        "Preparar la salsa mezclando yogur, tomate, mostaza, cebolla y pepinillo picados.",
        "Montar el bowl: base de lechuga, carne, patata y la salsa por encima.",
      ],
      note: "≈2,1 g sal — moderada por la mostaza y el pepinillo, no es excesiva.",
    },
    {
      id: "tortita-zanahoria-pollo",
      name: "Tortita de zanahoria rellena de hamburguesa de pollo",
      kcal: 425,
      protein: 43,
      tag: "ZANAHORIA · POLLO · PATATA",
      days: [4],
      ingredients: [
        { name: "Zanahoria rallada (tortita)", amount: "100 g" },
        { name: "Huevo (tortita)", amount: "1 ud" },
        { name: "Mozzarella rallada (tortita)", amount: "30 g" },
        { name: "Hamburguesa de pollo puro triturado (relleno)", amount: "120 g" },
        { name: "Lechuga", amount: "al gusto" },
        { name: "Patatas asadas", amount: "150 g" },
      ],
      steps: [
        "Mezclar la zanahoria rallada con el huevo y la mozzarella, extender fina en el airfryer hasta que cuaje y quede tipo fajita.",
        "Formar y cocinar la hamburguesa de pollo a la plancha.",
        "Asar las patatas en el airfryer.",
        "Rellenar la tortita con la hamburguesa y lechuga, servir con las patatas al lado.",
      ],
      note: "La tortita de zanahoria es reutilizable como sustituto de una fajita normal en otras recetas.",
    },
    {
      id: "tupper-carne-patata",
      name: "Tupper de carne y patata al horno",
      kcal: 441,
      protein: 37,
      tag: "CARNE · CALABACÍN · PATATA",
      days: [5],
      ingredients: [
        { name: "Carne picada", amount: "150 g" },
        { name: "Calabacín en dados", amount: "80 g" },
        { name: "Zanahoria en dados", amount: "60 g" },
        { name: "Tomate triturado natural", amount: "50 g" },
        { name: "Patata en láminas", amount: "150 g" },
        { name: "Leche (chorrito)", amount: "30 ml" },
      ],
      steps: [
        "Saltear la carne picada con el calabacín, la zanahoria y el tomate triturado.",
        "Montar en un tupper de cristal: la carne con verduras primero, la patata en láminas encima con el chorrito de leche.",
        "Hornear hasta que la patata esté tierna (~30-35 min a 180°C).",
      ],
      note: "",
    },
    {
      id: "medallones-garbanzos",
      name: "Medallones de garbanzos con dip de yogur",
      kcal: 548,
      protein: 23,
      tag: "GARBANZOS · DIP YOGUR · LOTE 7 UDS",
      days: [6],
      ingredients: [
        { name: "Garbanzos cocidos", amount: "200 g" },
        { name: "Cebolla blanca picada", amount: "1/2 ud" },
        { name: "Zumo de limón", amount: "1/2 limón" },
        { name: "Ajo rallado", amount: "1 diente" },
        { name: "Aceite de oliva (masa)", amount: "1 cda" },
        { name: "Comino en polvo", amount: "1 cdta" },
        { name: "Avena", amount: "1 cda" },
        { name: "Perejil fresco picado", amount: "1 puñado" },
        { name: "Yogur griego + perejil (dip)", amount: "60 g" },
        { name: "Aceite (sartén)", amount: "5 g" },
      ],
      steps: [
        "Triturar los garbanzos en un bol.",
        "Añadir la cebolla picada muy fina, el zumo de limón y el ajo rallado.",
        "Incorporar el aceite, el comino, la avena y la mitad del perejil, mezclar bien.",
        "Formar 7 bolas iguales y darles forma de mini hamburguesa.",
        "Cocinar en sartén a fuego medio-alto con muy poco aceite hasta que doren por ambos lados.",
        "Mezclar el yogur con el resto del perejil y servir como dip.",
      ],
      note: "Receta de @lolaacuina. Total del lote completo (7 uds + dip) ≈548 kcal — ≈78 kcal/unidad si se reparte en varios días. Con una cucharada entera de aceite en vez de spray sube a ~610-618 kcal.",
    },
  ],
  merienda: [
    {
      id: "yogur-avena-kiwi",
      name: "Yogur proteico + avena + kiwi",
      kcal: 238,
      protein: 17.7,
      tag: "YOGUR · AVENA · CACAO",
      days: [0, 4, 6],
      ingredients: [
        { name: "Yogur proteico Hacendado 0%", amount: "120 g" },
        { name: "Avena", amount: "30 g" },
        { name: "Kiwi", amount: "1 ud" },
        { name: "Cacao 100% en polvo", amount: "1 cda (~5 g)" },
      ],
      steps: [
        "Mezclar el yogur proteico con la avena.",
        "Añadir el kiwi troceado y el cacao puro por encima.",
      ],
      note: "",
    },
    {
      id: "bizcocho-huevo-avena",
      name: "Bizcocho individual de huevo y avena",
      kcal: 258,
      protein: 10.7,
      tag: "HUEVO · AVENA · MANZANA",
      days: [1, 3, 5],
      ingredients: [
        { name: "Huevo", amount: "1 ud" },
        { name: "Harina de avena", amount: "2 cda (~20 g)" },
        { name: "Manzana", amount: "1 ud (~150 g)" },
        { name: "Natillas choco proteicas Hacendado", amount: "1 cda (~15 g)" },
      ],
      steps: [
        "Batir el huevo con la harina de avena y media manzana rallada o troceada muy fina.",
        "Cocinar 2 min en el microondas, en un molde o taza.",
        "Servir con la cucharada de natillas de chocolate proteicas por encima y el resto de la manzana.",
      ],
      note: "Buena opción para variar textura respecto al yogur. Ideal en días donde el almuerzo o la comida fueron más ligeros de lo normal. El resto del bote de natillas se guarda para otro día.",
    },
    {
      id: "pan-cottage-recortada",
      name: "Pan integral, huevo, claras, lomo y cottage (recortada)",
      kcal: 285,
      protein: 34,
      tag: "PAN · HUEVO · LOMO · COTTAGE",
      days: [2],
      ingredients: [
        { name: "Pan integral sin corteza", amount: "1 rebanada (28 g)" },
        { name: "Huevo", amount: "1 ud (53 g)" },
        { name: "Claras líquidas", amount: "99 g (~3 claras)" },
        { name: "Fiambre de lomo cocido", amount: "2 lonchas (30 g)" },
        { name: "Queso cottage", amount: "80 g" },
      ],
      steps: ["Igual que la versión de almuerzo pero con 1 rebanada de pan y más cantidad de cottage."],
      note: "",
    },
    {
      id: "snack-pepino-atun",
      name: "Snack de pepino, atún y sriracha mayo",
      kcal: 215,
      protein: 28,
      tag: "PEPINO · ATÚN · SRIRACHA",
      ingredients: [
        { name: "Pepino", amount: "200 g" },
        { name: "Atún al natural escurrido", amount: "100 g" },
        { name: "Sriracha mayo", amount: "15 g" },
        { name: "Salsa de soja", amount: "10 g" },
      ],
      steps: [
        "Cortar el pepino en bastones o rodajas.",
        "Escurrir el atún y mezclar con la sriracha mayo y la salsa de soja.",
        "Servir el pepino con el atún aliñado por encima.",
      ],
      note: "≈2 g sal — sriracha mayo y soja juntas duplican el salado; si lo repites a menudo usa solo una de las dos.",
    },
  ],
  cena: [
    {
      id: "calabacin-jamon-mozzarella",
      name: "Calabacín laminado, jamón serrano y mozzarella",
      kcal: 360,
      protein: 36.6,
      tag: "CALABACÍN · JAMÓN · MOZZARELLA",
      days: [0],
      ingredients: [
        { name: "Calabacín laminado", amount: "250 g" },
        { name: "Jamón serrano", amount: "60 g (4-5 lonchas)" },
        { name: "Mozzarella fresca en perlas", amount: "90 g (~15 perlas)" },
      ],
      steps: [
        "Laminar el calabacín con el pelador.",
        "Colocar en el airfryer y cocinar hasta que esté casi hecho.",
        "Añadir el jamón serrano y la mozzarella, dejar unos minutos más hasta que el queso funda.",
      ],
      note: "≈2,7 g sal. Con feta (65 g) en vez de mozzarella: 366 kcal / 3,6 g sal. Opcional +1 huevo frito sin aceite sube a ≈405 kcal / ≈43 g proteína.",
    },
    {
      id: "tortilla-boniato-cebolla",
      name: "Tortilla de boniato y cebolla",
      kcal: 357,
      protein: 17,
      tag: "BONIATO · CEBOLLA · HUEVO",
      days: [1],
      ingredients: [
        { name: "Boniato", amount: "220 g" },
        { name: "Cebolla", amount: "50 g" },
        { name: "Huevos", amount: "2 ud (106 g)" },
        { name: "Aceite para la sartén", amount: "al gusto (no incluido en el cálculo)" },
      ],
      steps: [
        "Pelar y cortar el boniato en láminas finas o dados pequeños.",
        "Pochar la cebolla y el boniato en la sartén hasta que estén tiernos.",
        "Batir los huevos, añadir a la sartén y cuajar la tortilla por ambos lados.",
      ],
      note: "Proteína más baja que otras cenas — opcional +1 huevo o 2 claras para subirla. El aceite se computa en el margen libre, no aquí.",
    },
    {
      id: "pizza-proteica-cottage",
      name: "Pizza proteica de cottage",
      kcal: 410,
      protein: 31,
      tag: "COTTAGE · AVENA · MOZZARELLA",
      days: [2],
      ingredients: [
        { name: "Queso cottage (masa)", amount: "56 g" },
        { name: "Claras líquidas (masa)", amount: "80 g" },
        { name: "Avena molida (masa)", amount: "52 g" },
        { name: "Salsa de tomate/marinara (cobertura)", amount: "60 g" },
        { name: "Mozzarella en perlas (cobertura)", amount: "56 g" },
      ],
      steps: [
        "Precalentar el horno a 175°C.",
        "Mezclar el cottage, las claras y la avena hasta formar una masa espesa.",
        "Extender sobre papel de horno en forma de pizza (~0,5 cm) y hornear 10 min.",
        "Retirar el papel de debajo con cuidado.",
        "Cubrir con el tomate y la mozzarella, hornear 12-15 min más hasta que el queso esté dorado.",
      ],
      note: "≈1,6 g sal. Versión mínima solo con cottage+huevo (90 g cottage + 2 huevos, sin avena) → 352 kcal / 33 g proteína.",
    },
    {
      id: "hamburguesa-pollo-guarnicion",
      name: "Hamburguesa de pollo puro con guarnición",
      kcal: 427,
      protein: 40,
      tag: "POLLO · VERDURAS · MANZANA",
      days: [3],
      ingredients: [
        { name: "Pechuga de pollo triturada", amount: "150 g" },
        { name: "Patata", amount: "150 g" },
        { name: "Calabacín", amount: "100 g" },
        { name: "Zanahoria", amount: "80 g" },
        { name: "Manzana", amount: "100 g" },
        { name: "Aceite (si es a la sartén)", amount: "5 g" },
      ],
      steps: [
        "Formar la hamburguesa con el pollo triturado, sin nada más.",
        "Cocinar a la sartén con el aceite o al horno.",
        "Asar o saltear la patata, el calabacín, la zanahoria y la manzana como guarnición.",
      ],
      note: "",
    },
    {
      id: "espaguetis-calabacin-gambas",
      name: "Espaguetis de calabacín con gambas",
      kcal: 370,
      protein: 34.5,
      tag: "CALABACÍN · GAMBAS · QUESO CREMA",
      days: [4],
      ingredients: [
        { name: "Calabacín en espiral", amount: "300 g" },
        { name: "Gambas", amount: "200 g" },
        { name: "Tomate cherry", amount: "100 g" },
        { name: "Queso crema", amount: "65 g" },
      ],
      steps: [
        "Hacer espaguetis de calabacín con un rallador/espiralizador.",
        "Saltear las gambas y los tomates cherry partidos por la mitad.",
        "Añadir el calabacín y el queso crema, saltear junto hasta que el queso se funda en salsa.",
      ],
      note: "",
    },
    {
      id: "tortita-zanahoria-atun",
      name: "Tortita de zanahoria rellena de atún, aguacate y cottage",
      kcal: 387,
      protein: 40,
      tag: "ZANAHORIA · ATÚN · AGUACATE",
      days: [5],
      ingredients: [
        { name: "Zanahoria rallada (tortita)", amount: "100 g" },
        { name: "Huevo (tortita)", amount: "1 ud" },
        { name: "Mozzarella en perlas (tortita)", amount: "30 g" },
        { name: "Atún al natural escurrido (relleno)", amount: "80 g" },
        { name: "Aguacate (relleno)", amount: "50 g" },
        { name: "Queso cottage (relleno)", amount: "50 g" },
      ],
      steps: [
        "Preparar la tortita de zanahoria igual que en la comida del viernes.",
        "Rellenar con el atún escurrido, el aguacate en láminas y el cottage.",
      ],
      note: "",
    },
    {
      id: "tartar-atun-patata-huevo",
      name: "Tartar de atún con patata y huevo",
      kcal: 398,
      protein: 39,
      tag: "ATÚN · PATATA · HUEVO",
      days: [6],
      ingredients: [
        { name: "Atún fresco en dados", amount: "120 g" },
        { name: "Pimientos en dados", amount: "30 g" },
        { name: "Salsa de soja", amount: "10 g" },
        { name: "Salsa de trufa", amount: "8 g" },
        { name: "Patata en dados", amount: "150 g" },
        { name: "Huevo", amount: "1 ud" },
      ],
      steps: [
        "Cortar el atún en dados, mezclar con los pimientos, la salsa de soja y la salsa de trufa.",
        "Dejar marinar en la nevera.",
        "Cocinar la patata en dados en el airfryer.",
        "Montar el plato: base de patata, el tartar de atún encima y el huevo (frito o a la plancha).",
      ],
      note: "≈0,9 g sal — soja y trufa muy contenidas, no hay que preocuparse.",
    },
    {
      id: "ensalada-langostino-aguacate",
      name: "Ensalada de langostino, aguacate y batata",
      kcal: 346,
      protein: 26,
      tag: "LANGOSTINO · AGUACATE · BATATA",
      ingredients: [
        { name: "Langostino", amount: "100 g" },
        { name: "Aguacate", amount: "60 g" },
        { name: "Boniato cocido", amount: "100 g" },
        { name: "Huevo duro", amount: "1 ud" },
      ],
      steps: [
        "Cocer el boniato en dados.",
        "Saltear o cocer los langostinos.",
        "Montar la ensalada con el aguacate en láminas y el huevo duro en cuartos.",
      ],
      note: "Se queda justo por debajo del suelo de cena (350 kcal) — súmale unos 10g más de boniato si la usas como cena entera.",
    },
  ],
  margen: [],
};

// ============================================================
// CALCULADORA DE KCAL — ingredientes base (kcal/proteína por 100 g)
// Valores estándar de tablas de composición genéricas, de partida —
// se pueden editar o ampliar desde la app con el dato real de cada
// etiqueta en cuanto se registre.
// ============================================================

const DEFAULT_INGREDIENTS = [
  { id: "huevo", name: "Huevo", kcalPer100: 155, proteinPer100: 13 },
  { id: "clara-huevo", name: "Clara de huevo", kcalPer100: 52, proteinPer100: 11 },
  { id: "avena", name: "Avena", kcalPer100: 375, proteinPer100: 13.5 },
  { id: "pan-integral", name: "Pan integral", kcalPer100: 247, proteinPer100: 9 },
  { id: "pan-fajita", name: "Pan de fajita", kcalPer100: 280, proteinPer100: 8 },
  { id: "aguacate", name: "Aguacate", kcalPer100: 160, proteinPer100: 2 },
  { id: "jamon-serrano", name: "Jamón serrano", kcalPer100: 195, proteinPer100: 31 },
  { id: "lomo-cocido", name: "Lomo cocido (fiambre)", kcalPer100: 111, proteinPer100: 20 },
  { id: "yogur-griego", name: "Yogur griego", kcalPer100: 97, proteinPer100: 9 },
  { id: "yogur-proteico", name: "Yogur proteico natural", kcalPer100: 60, proteinPer100: 10 },
  { id: "queso-cottage", name: "Queso cottage", kcalPer100: 98, proteinPer100: 11 },
  { id: "queso-crema", name: "Queso crema", kcalPer100: 245, proteinPer100: 5.5 },
  { id: "mozzarella", name: "Mozzarella", kcalPer100: 250, proteinPer100: 22 },
  { id: "pechuga-pollo", name: "Pechuga de pollo", kcalPer100: 165, proteinPer100: 31 },
  { id: "carne-picada", name: "Carne picada", kcalPer100: 215, proteinPer100: 19 },
  { id: "patata", name: "Patata", kcalPer100: 77, proteinPer100: 2 },
  { id: "boniato", name: "Boniato", kcalPer100: 86, proteinPer100: 1.6 },
  { id: "calabacin", name: "Calabacín", kcalPer100: 17, proteinPer100: 1.2 },
  { id: "zanahoria", name: "Zanahoria", kcalPer100: 41, proteinPer100: 0.9 },
  { id: "brocoli", name: "Brócoli", kcalPer100: 34, proteinPer100: 2.8 },
  { id: "tomate", name: "Tomate", kcalPer100: 18, proteinPer100: 0.9 },
  { id: "tomate-cherry", name: "Tomate cherry", kcalPer100: 18, proteinPer100: 0.9 },
  { id: "tomate-triturado", name: "Tomate triturado", kcalPer100: 24, proteinPer100: 1.2 },
  { id: "pepino", name: "Pepino", kcalPer100: 15, proteinPer100: 0.7 },
  { id: "cebolla", name: "Cebolla", kcalPer100: 40, proteinPer100: 1.1 },
  { id: "kiwi", name: "Kiwi", kcalPer100: 61, proteinPer100: 1.1 },
  { id: "manzana", name: "Manzana", kcalPer100: 52, proteinPer100: 0.3 },
  { id: "garbanzos-cocidos", name: "Garbanzos cocidos", kcalPer100: 164, proteinPer100: 8.9 },
  { id: "atun-natural", name: "Atún al natural", kcalPer100: 116, proteinPer100: 26 },
  { id: "gambas", name: "Gambas", kcalPer100: 85, proteinPer100: 18 },
  { id: "langostino", name: "Langostino", kcalPer100: 71, proteinPer100: 17 },
  { id: "leche", name: "Leche semidesnatada", kcalPer100: 42, proteinPer100: 3.4 },
  { id: "leche-avena", name: "Leche de avena", kcalPer100: 40, proteinPer100: 0.4 },
  { id: "chia", name: "Semillas de chía", kcalPer100: 486, proteinPer100: 17 },
  { id: "natillas-proteicas", name: "Natillas proteicas", kcalPer100: 70, proteinPer100: 8 },
  { id: "mostaza", name: "Mostaza", kcalPer100: 66, proteinPer100: 4 },
  { id: "pepinillo", name: "Pepinillo", kcalPer100: 11, proteinPer100: 0.7 },
  { id: "salsa-soja", name: "Salsa de soja", kcalPer100: 53, proteinPer100: 8 },
  { id: "aceite-oliva", name: "Aceite de oliva", kcalPer100: 884, proteinPer100: 0 },
  { id: "perejil", name: "Perejil", kcalPer100: 36, proteinPer100: 3 },
];

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
  "rdl-mancuernas":                { name: "Peso muerto rumano con mancuernas", detail: "bisagra de cadera, espalda neutra y rango controlado — no es el peso muerto convencional" },
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
      ex("rdl-mancuernas", 3, "10-12", "2-3", "90 s"),
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
