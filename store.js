// ============================================================
// STORE — persistencia local (localStorage), sin cuentas, offline
// ============================================================

const STORAGE_KEY = "kcalgym_state_v1";

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
    meals: saved.meals || JSON.parse(JSON.stringify(DEFAULT_IDEAS)),
    exerciseLogs: saved.exerciseLogs || {},
    swimIdeas: saved.swimIdeas || JSON.parse(JSON.stringify(DEFAULT_SWIM_IDEAS)),
    swimLogs: saved.swimLogs || [],
  };
  return state;
}

const Store = {
  state: loadState(),

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      /* almacenamiento no disponible: continuar solo en memoria */
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
};
