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
    activeSessions: saved.activeSessions || {},
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

  // ---------- Gym: logs de ejercicio ----------
  getLog(slug) {
    return this.state.exerciseLogs[slug] || { lastWeight: null, lastReps: null, history: [] };
  },

  // ---------- Gym: sesión activa ----------
  getActiveSession(workoutId) {
    let s = this.state.activeSessions[workoutId];
    if (!s) {
      s = { startedAt: Date.now(), entries: {} };
      this.state.activeSessions[workoutId] = s;
      this.save();
    }
    return s;
  },

  saveSet(workoutId, slug, setIndex, weight, reps) {
    const session = this.getActiveSession(workoutId);
    if (!session.entries[slug]) session.entries[slug] = [];
    session.entries[slug][setIndex] = { weight, reps };
    this.save();
  },

  finishSession(workoutId) {
    const session = this.state.activeSessions[workoutId];
    if (!session) return;
    const today = new Date().toISOString().slice(0, 10);

    Object.keys(session.entries).forEach((slug) => {
      const sets = (session.entries[slug] || []).filter(Boolean);
      if (!sets.length) return;
      const log = this.state.exerciseLogs[slug] || { lastWeight: null, lastReps: null, history: [] };
      const last = sets[sets.length - 1];
      log.lastWeight = last.weight;
      log.lastReps = last.reps;
      log.history = log.history || [];
      log.history.push({ date: today, sets });
      // conservar como máximo las últimas 20 sesiones por ejercicio
      if (log.history.length > 20) log.history = log.history.slice(-20);
      this.state.exerciseLogs[slug] = log;
    });

    delete this.state.activeSessions[workoutId];
    this.save();
  },

  discardSession(workoutId) {
    delete this.state.activeSessions[workoutId];
    this.save();
  },
};
