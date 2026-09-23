// ============================================================
// STORE — persistencia local (localStorage), sin cuentas, offline
// ============================================================

const STORAGE_KEY = "kcalgym_state_v1";

// Añade a los datos ya guardados cualquier receta nueva de DEFAULT_IDEAS que
// todavía no exista (por id) y rellena campos nuevos (days/steps) en las que
// ya existían pero se guardaron antes de que esos campos existieran. Nunca
// toca ideas creadas o editadas a mano por el usuario más allá de eso.
function seedMeals(savedMeals) {
  const meals = savedMeals || {};
  Object.keys(DEFAULT_IDEAS).forEach((mealKey) => {
    if (!Array.isArray(meals[mealKey])) meals[mealKey] = [];
    const list = meals[mealKey];
    const byId = {};
    list.forEach((idea) => {
      byId[idea.id] = idea;
    });
    DEFAULT_IDEAS[mealKey].forEach((defIdea) => {
      const existing = byId[defIdea.id];
      if (!existing) {
        list.push(JSON.parse(JSON.stringify(defIdea)));
      } else {
        if (existing.days === undefined && defIdea.days) existing.days = defIdea.days.slice();
        if (existing.steps === undefined && defIdea.steps) existing.steps = defIdea.steps.slice();
      }
    });
  });
  return meals;
}

// Igual que seedMeals pero para la lista de ingredientes de la calculadora:
// añade los ingredientes base que falten por id, sin tocar los que el
// usuario ya haya creado o editado.
function seedIngredients(savedIngredients) {
  const list = Array.isArray(savedIngredients) ? savedIngredients : [];
  const byId = {};
  list.forEach((ing) => {
    byId[ing.id] = ing;
  });
  DEFAULT_INGREDIENTS.forEach((defIng) => {
    if (!byId[defIng.id]) list.push(JSON.parse(JSON.stringify(defIng)));
  });
  return list;
}

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    raw = null;
  }
  let saved = {};
  if (raw) {
    try {
      saved = JSON.parse(raw);
    } catch (e) {
      saved = {};
    }
  }

  const state = {
    headline: saved.headline !== undefined ? saved.headline : "CERRAR LAS 3 SESIONES Y NADAR EL SÁBADO",
    meals: seedMeals(saved.meals),
    exerciseLogs: saved.exerciseLogs || {},
    swimIdeas: saved.swimIdeas || JSON.parse(JSON.stringify(DEFAULT_SWIM_IDEAS)),
    swimLogs: saved.swimLogs || [],
    ingredients: seedIngredients(saved.ingredients),
    dayLogs: saved.dayLogs || {},
    mercadonaCorrecciones: saved.mercadonaCorrecciones || {},
    updatedAt: saved.updatedAt || 0,
  };
  return state;
}

const Store = {
  state: loadState(),

  save(fromRemote) {
    if (!fromRemote) {
      this.state.updatedAt = Date.now();
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      /* almacenamiento no disponible: continuar solo en memoria */
    }
    if (!fromRemote && typeof Sync !== "undefined") {
      Sync.schedulePush(this.state);
    }
  },

  // ---------- Comidas ----------
  getIdeas(mealKey) {
    return this.state.meals[mealKey] || [];
  },
  getIdea(mealKey, ideaId) {
    return this.getIdeas(mealKey).find((i) => i.id === ideaId);
  },
  saveIdea(mealKey, idea) {
    const list = this.state.meals[mealKey] || (this.state.meals[mealKey] = []);
    const idx = list.findIndex((i) => i.id === idea.id);
    if (idx >= 0) list[idx] = idea;
    else list.push(idea);
    this.save();
  },
  deleteIdea(mealKey, ideaId) {
    const list = this.state.meals[mealKey] || [];
    this.state.meals[mealKey] = list.filter((i) => i.id !== ideaId);
    this.save();
  },
  setIdeaPhoto(mealKey, ideaId, dataUrl) {
    const idea = this.getIdea(mealKey, ideaId);
    if (!idea) return;
    idea.photo = dataUrl;
    this.save();
  },
  removeIdeaPhoto(mealKey, ideaId) {
    const idea = this.getIdea(mealKey, ideaId);
    if (!idea) return;
    delete idea.photo;
    this.save();
  },

  // ---------- Headline ----------
  setHeadline(text) {
    this.state.headline = text;
    this.save();
  },

  // ---------- Gym: logs de ejercicio (registro directo, sin sesión) ----------
  getLog(slug) {
    return this.state.exerciseLogs[slug] || { lastWeight: null, lastReps: null, history: [] };
  },

  logWeight(slug, weight, reps) {
    const today = new Date().toISOString().slice(0, 10);
    const log = this.state.exerciseLogs[slug] || { lastWeight: null, lastReps: null, history: [] };
    log.history = log.history || [];
    log.history.push({ date: today, weight, reps });
    if (log.history.length > 30) log.history = log.history.slice(-30);
    log.lastWeight = weight;
    log.lastReps = reps;
    this.state.exerciseLogs[slug] = log;
    this.save();
  },

  deleteLastEntry(slug) {
    const log = this.state.exerciseLogs[slug];
    if (!log || !log.history.length) return;
    log.history.pop();
    const last = log.history[log.history.length - 1];
    log.lastWeight = last ? last.weight : null;
    log.lastReps = last ? last.reps : null;
    this.save();
  },

  // ---------- Natación: entrenos posibles ----------
  getSwimIdeas() {
    return this.state.swimIdeas || [];
  },
  getSwimIdea(id) {
    return this.getSwimIdeas().find((i) => i.id === id);
  },
  saveSwimIdea(idea) {
    const list = this.state.swimIdeas || (this.state.swimIdeas = []);
    const idx = list.findIndex((i) => i.id === idea.id);
    if (idx >= 0) list[idx] = idea;
    else list.push(idea);
    this.save();
  },
  deleteSwimIdea(id) {
    this.state.swimIdeas = (this.state.swimIdeas || []).filter((i) => i.id !== id);
    this.save();
  },

  // ---------- Natación: registros ----------
  getSwimLogs() {
    return (this.state.swimLogs || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  addSwimLog(entry) {
    const today = new Date().toISOString().slice(0, 10);
    const list = this.state.swimLogs || (this.state.swimLogs = []);
    list.push(Object.assign({ id: "swim_" + Date.now().toString(36), date: today }, entry));
    this.save();
  },
  deleteSwimLog(id) {
    this.state.swimLogs = (this.state.swimLogs || []).filter((l) => l.id !== id);
    this.save();
  },

  // ---------- Calculadora de kcal: ingredientes ----------
  getIngredients() {
    return (this.state.ingredients || []).slice().sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
  getIngredient(id) {
    return (this.state.ingredients || []).find((i) => i.id === id);
  },
  findIngredientByName(name) {
    const norm = name.trim().toLowerCase();
    return (this.state.ingredients || []).find((i) => i.name.trim().toLowerCase() === norm);
  },
  saveIngredient(ing) {
    const list = this.state.ingredients || (this.state.ingredients = []);
    const idx = list.findIndex((i) => i.id === ing.id);
    if (idx >= 0) list[idx] = ing;
    else list.push(ing);
    this.save();
    return ing;
  },
  deleteIngredient(id) {
    this.state.ingredients = (this.state.ingredients || []).filter((i) => i.id !== id);
    this.save();
  },

  // ---------- Correcciones de macros de Mercadona (por EAN) ----------
  // Cuando el dato de Open Food Facts no coincide con la foto real de la
  // etiqueta, el usuario puede corregirlo aquí; la corrección se guarda para
  // siempre (y se sincroniza) y gana siempre a lo que devuelva Open Food Facts.
  getNutritionCorrection(ean) {
    if (!ean) return null;
    return (this.state.mercadonaCorrecciones || {})[ean] || null;
  },
  saveNutritionCorrection(ean, info) {
    if (!ean) return;
    const map = this.state.mercadonaCorrecciones || (this.state.mercadonaCorrecciones = {});
    map[ean] = {
      kcalPer100: info.kcalPer100,
      proteinPer100: info.proteinPer100,
      correctedAt: Date.now(),
    };
    this.save();
  },

  // ---------- Calculadora de kcal: registro diario ----------
  getDayLog(dateKey) {
    return this.state.dayLogs[dateKey] || [];
  },
  addDayEntry(dateKey, entry) {
    const list = this.state.dayLogs[dateKey] || (this.state.dayLogs[dateKey] = []);
    list.push(Object.assign({ id: "log_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, entry));
    this.save();
  },
  deleteDayEntry(dateKey, entryId) {
    const list = this.state.dayLogs[dateKey];
    if (!list) return;
    this.state.dayLogs[dateKey] = list.filter((e) => e.id !== entryId);
    this.save();
  },
};