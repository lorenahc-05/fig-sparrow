// ============================================================
// APP — router + render + interacciones
// ============================================================

const appEl = document.getElementById("app");
const overlayRoot = document.getElementById("overlay-root");

let formState = null; // estado del formulario de idea en edición
let keypadState = null; // estado del teclado numérico de peso

// ---------------- helpers ----------------

function fmtNum(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = typeof n === "string" ? parseFloat(n.replace(",", ".")) : n;
  if (Number.isNaN(num)) return "";
  const rounded = Math.round(num * 100) / 100;
  let s = String(rounded);
  s = s.replace(".", ",");
  return s;
}

function parseNum(str) {
  if (str === null || str === undefined || str === "") return null;
  const n = parseFloat(String(str).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function ingredientsLine(ingredients) {
  return (ingredients || [])
    .map((i) => (i.amount ? `${i.name} ${i.amount}` : i.name))
    .join(" · ");
}

function mealSubtitle(key, def, ideas) {
  const n = ideas.length;
  if (key === "margen") return def.flex || "";
  if (key === "comida") {
    return n === 0 ? `${def.flex} · ${def.protein} G P` : `${def.flex} · ${n} IDEA${n > 1 ? "S" : ""}`;
  }
  if (n === 0) return "SIN IDEAS AÚN";
  let s = `${n} IDEA${n > 1 ? "S" : ""}`;
  if (def.protein) s += ` · ${def.protein} G P`;
  if (def.flex) s += ` · ${def.flex}`;
  return s;
}

function slugifyId(str) {
  return (
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "idea"
  );
}

function newId(existingIds, base) {
  let id = slugifyId(base);
  if (!existingIds.includes(id)) return id;
  let i = 2;
  while (existingIds.includes(`${id}-${i}`)) i++;
  return `${id}-${i}`;
}

function daysAgoLabel(dateStr) {
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffDays = Math.round((now - then) / 86400000);
  if (diffDays <= 0) return "HOY";
  if (diffDays === 1) return "HACE 1 DÍA";
  return `HACE ${diffDays} DÍAS`;
}

function lastSessionLabel(workoutId) {
  // busca la fecha más reciente entre los ejercicios de este entreno
  const w = WORKOUTS[workoutId];
  if (!w || !w.exercises) return null;
  let latest = null;
  w.exercises.forEach((e) => {
    const log = Store.getLog(e.slug);
    const h = log.history || [];
    if (h.length) {
      const d = h[h.length - 1].date;
      if (!latest || d > latest) latest = d;
    }
  });
  return latest ? daysAgoLabel(latest) : null;
}

// ---------------- router ----------------

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  return raw ? raw.split("/").filter(Boolean).map(decodeURIComponent) : [];
}

function navigate(href) {
  location.hash = href;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function render() {
  clearAllRestTimers();
  overlayRoot.innerHTML = "";
  keypadState = null;
  const seg = parseHash();
  let html = "";

  if (seg.length === 0) {
    html = renderHome();
  } else if (seg[0] === "comidas") {
    html = renderComidas(seg);
  } else if (seg[0] === "gym") {
    html = renderGym(seg);
  } else {
    html = renderHome();
  }

  appEl.innerHTML = html;
  window.scrollTo(0, 0);
}

function refresh() {
  // vuelve a pintar la ruta actual sin disparar hashchange (para updates en vivo)
  const seg = parseHash();
  let html = "";
  if (seg.length === 0) html = renderHome();
  else if (seg[0] === "comidas") html = renderComidas(seg);
  else if (seg[0] === "gym") html = renderGym(seg);
  appEl.innerHTML = html;
}

// ================================================================
// HOME — pantalla de entrada con foto de fondo
// ================================================================

function renderHome() {
  const headline = Store.state.headline || "TOCA PARA ESCRIBIR TU OBJETIVO";
  return `
    <div class="screen-home">
      <div class="home-hero-hint">Foto de fondo — coloca tu imagen en assets/hero.jpg</div>
      <div class="home-content">
        <button class="home-headline" data-action="edit-headline">${escapeHtml(headline)}</button>
        <nav class="home-nav">
          <button class="home-nav-row comida" data-action="nav" data-href="#/comidas">
            <span class="label">Comida</span><span class="arrow">→</span>
          </button>
          <button class="home-nav-row gym" data-action="nav" data-href="#/gym">
            <span class="label">Gym</span><span class="arrow">→</span>
          </button>
        </nav>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ================================================================
// COMIDAS
// ================================================================

function renderComidas(seg) {
  const [, mealKey, sub, sub2] = seg;

  if (!mealKey) return renderMealHome();
  if (!MEAL_DEFS[mealKey]) return renderMealHome();

  if (!sub) return renderIdeasList(mealKey);
  if (sub === "nueva") return renderIdeaForm(mealKey, null);
  if (sub2 === "editar") return renderIdeaForm(mealKey, sub);
  return renderIdeaDetail(mealKey, sub);
}

function tabbar(active) {
  return `
    <div class="tabbar">
      <button class="tab ${active === "comidas" ? "is-active" : ""}" data-action="nav" data-href="#/comidas">Comidas</button>
      <button class="tab ${active === "gym" ? "is-active" : ""}" data-action="nav" data-href="#/gym">Gym</button>
    </div>
  `;
}

function renderMealHome() {
  const keys = Object.keys(MEAL_DEFS).sort((a, b) => MEAL_DEFS[a].order - MEAL_DEFS[b].order);
  const rows = keys
    .map((k) => {
      const def = MEAL_DEFS[k];
      const ideas = Store.getIdeas(k);
      return `
        <button class="meal-row" data-action="nav" data-href="#/comidas/${k}">
          <div>
            <div class="name">${def.label}</div>
            <div class="sub">${mealSubtitle(k, def, ideas)}</div>
          </div>
          <div class="right">
            <span class="kcal">${def.kcal}</span><span class="arrow">→</span>
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <div class="screen screen--comidas">
      <button class="logo" data-action="nav" data-href="#/">KCAL/GYM®</button>
      <div class="content">
        <div class="h1">Reparto<br>del día</div>
        <div class="meta-row"><span>//${MEAL_TOTAL_TARGET}</span><span>//${PROTEIN_TARGET}</span></div>
        <div class="meal-list">
          ${rows}
          <div class="total-row"><span>Total</span><span>${MEAL_TOTAL}</span></div>
        </div>
      </div>
      ${tabbar("comidas")}
    </div>
  `;
}

function renderIdeasList(mealKey) {
  const def = MEAL_DEFS[mealKey];
  const ideas = Store.getIdeas(mealKey);

  const cards = ideas.length
    ? `<div class="card-stack">${ideas
        .map(
          (idea) => `
        <button class="idea-card" data-action="nav" data-href="#/comidas/${mealKey}/${idea.id}">
          <div class="row-top">
            <div class="title">${escapeHtml(idea.name)}</div>
            <div class="kcal">${idea.kcal}</div>
          </div>
          <div class="ingredients">${escapeHtml(ingredientsLine(idea.ingredients))}</div>
          <div class="row-bottom"><span>//${fmtNum(idea.protein)} G PROTEÍNA</span><span>VER →</span></div>
        </button>
      `
        )
        .join("")}</div>`
    : `<div class="empty-state">Todavía no hay ideas para ${def.label.toLowerCase()}. Toca «Añadir» para crear la primera.</div>`;

  const note = mealKey === "comida" || mealKey === "merienda" ? `<div class="note-block">${COMPENSATION_NOTE}</div>` : "";

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas">← Reparto del día</button>
        <button data-action="nav" data-href="#/comidas/${mealKey}/nueva">Añadir</button>
      </div>
      <div class="content">
        <div class="h1">${def.label}</div>
        <div class="meta-row"><span>//${def.kcal} KCAL</span><span>//${def.protein ? def.protein + " G P" : "—"}</span></div>
        ${cards}
        ${note}
      </div>
      ${tabbar("comidas")}
    </div>
  `;
}

function renderIdeaDetail(mealKey, ideaId) {
  const def = MEAL_DEFS[mealKey];
  const idea = Store.getIdea(mealKey, ideaId);
  if (!idea) return renderIdeasList(mealKey);

  const ingRows = idea.ingredients
    .map(
      (i) => `
      <div class="ingredient-row"><span>${escapeHtml(i.name)}</span><span class="amt">${escapeHtml(i.amount || "")}</span></div>
    `
    )
    .join("");

  const adjust = idea.note
    ? `<div style="margin-top:22px">
         <div class="section-label">//Ajuste</div>
         <div class="adjust-note">${escapeHtml(idea.note)}</div>
       </div>`
    : "";

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas/${mealKey}">← ${def.label}</button>
        <button data-action="nav" data-href="#/comidas/${mealKey}/${idea.id}/editar">Editar</button>
      </div>
      <div class="content">
        <div class="h1">${escapeHtml(idea.name)}</div>
        ${idea.tag ? `<div class="tag-line">${escapeHtml(idea.tag)}</div>` : ""}
        <div class="stat-row">
          <div class="stat-box"><div class="label">Kcal</div><div class="value">${idea.kcal}</div></div>
          <div class="stat-box fill"><div class="label">Proteína</div><div class="value">${fmtNum(idea.protein)}<small>g</small></div></div>
        </div>
        <div class="section-label">//Ingredientes</div>
        <div class="ingredient-list">${ingRows}</div>
        ${adjust}
      </div>
      ${tabbar("comidas")}
    </div>
  `;
}

function renderIdeaForm(mealKey, ideaId) {
  const def = MEAL_DEFS[mealKey];
  const isNew = !ideaId;

  if (!formState || formState._mealKey !== mealKey || formState._ideaId !== ideaId) {
    const existing = isNew ? null : Store.getIdea(mealKey, ideaId);
    formState = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: null, name: "", kcal: "", protein: "", tag: "", ingredients: [{ name: "", amount: "" }], note: "" };
    formState._mealKey = mealKey;
    formState._ideaId = ideaId;
  }

  const ingRows = formState.ingredients
    .map(
      (ing, idx) => `
      <div class="ingredient-edit-row">
        <input type="text" placeholder="Ingrediente" value="${escapeHtml(ing.name)}" data-field="ing-name" data-index="${idx}">
        <input type="text" placeholder="Cantidad" class="amt-input" value="${escapeHtml(ing.amount)}" data-field="ing-amount" data-index="${idx}">
        <button class="icon-btn" data-action="remove-ingredient" data-index="${idx}" aria-label="Eliminar ingrediente">×</button>
      </div>
    `
    )
    .join("");

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="${isNew ? `#/comidas/${mealKey}` : `#/comidas/${mealKey}/${ideaId}`}">← ${isNew ? def.label.toUpperCase() : "CANCELAR"}</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:32px; margin-bottom:18px;">${isNew ? "Nueva idea" : "Editar idea"}</div>

        <div class="field">
          <label>Nombre</label>
          <input type="text" placeholder="Ej. Plato brunch" value="${escapeHtml(formState.name)}" data-field="name">
        </div>
        <div style="display:flex; gap:10px;">
          <div class="field" style="flex:1"><label>Kcal</label><input type="number" inputmode="numeric" placeholder="0" value="${escapeHtml(formState.kcal)}" data-field="kcal"></div>
          <div class="field" style="flex:1"><label>Proteína (g)</label><input type="text" inputmode="decimal" placeholder="0" value="${escapeHtml(formState.protein)}" data-field="protein"></div>
        </div>
        <div class="field">
          <label>Etiqueta (opcional)</label>
          <input type="text" placeholder="Ej. HUEVO · AGUACATE · VERDURA" value="${escapeHtml(formState.tag || "")}" data-field="tag">
        </div>

        <div class="field">
          <label>Ingredientes</label>
          ${ingRows}
          <button class="btn-add-line" data-action="add-ingredient">+ Añadir ingrediente</button>
        </div>

        <div class="field">
          <label>Nota de ajuste (opcional)</label>
          <textarea placeholder="Ej. Para bajar kcal manteniendo volumen…" data-field="note">${escapeHtml(formState.note || "")}</textarea>
        </div>

        <button class="btn-primary-pill" data-action="save-idea">Guardar</button>
        ${!isNew ? `<button class="btn-text-danger" data-action="delete-idea" data-meal="${mealKey}" data-id="${ideaId}">Eliminar idea</button>` : ""}
      </div>
      ${tabbar("comidas")}
    </div>
  `;
}

// ================================================================
// GYM
// ================================================================

function renderGym(seg) {
  const [, sub, sub2, sub3] = seg;
  if (!sub) return renderGymHome();
  if (sub === "historial") return renderHistorial();
  if (sub === "natacion") {
    if (sub2 === "nueva") return renderSwimIdeaForm(null);
    if (sub3 === "editar") return renderSwimIdeaForm(sub2);
    return renderNatacion();
  }
  if (WORKOUTS[sub]) return renderWorkout(sub);
  return renderGymHome();
}

function renderGymHome() {
  const baseRows = WORKOUT_ORDER_BASE.map((id) => workoutRow(id, false)).join("");
  const extRows = WORKOUT_ORDER_EXT.map((id) => workoutRow(id, true)).join("");

  return `
    <div class="screen screen--gym">
      <button class="logo" data-action="nav" data-href="#/">KCAL/GYM®</button>
      <div class="content">
        <div class="h1">Entrenos</div>
        <div class="meta-row" style="margin-bottom:22px"><span>//${PROGRESSION_NOTE.split(":")[0].toUpperCase()}</span></div>

        <div class="group-label">Base · 3 días + natación</div>
        <div class="workout-list">${baseRows}</div>

        <div class="group-label">Extensión · para semanas chill</div>
        <div class="workout-list">${extRows}</div>

        <div class="note-block" style="color:inherit; opacity:0.85;">El mismo programa comprimido en dos sesiones full-body. Cargas heredadas, no empieza de cero.</div>

        <button class="btn-primary-pill" style="margin-top:16px; background:none; border:1.5px solid var(--garnet); color:var(--garnet);" data-action="nav" data-href="#/gym/historial">Historial de cargas</button>
      </div>
      ${tabbar("gym")}
    </div>
  `;
}

function workoutRow(id, small) {
  const w = WORKOUTS[id];
  const recent = lastSessionLabel(id);
  const sub = recent ? `${w.subtitle.split("·")[0].trim() || w.subtitle} · ${recent}` : w.subtitle;
  return `
    <button class="workout-row ${small ? "small" : ""}" data-action="nav" data-href="#/gym/${id}">
      <div>
        <div class="name">${w.name}</div>
        <div class="sub">${sub}</div>
      </div>
      <div class="arrow">→</div>
    </button>
  `;
}

function parseRestSeconds(restStr) {
  const n = parseInt(restStr, 10);
  return Number.isNaN(n) ? 60 : n;
}

function formatRestLabel(seconds) {
  return `${seconds} S`;
}

function formatRestRemaining(seconds) {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${seconds} S`;
}

function restChip(slug, restStr) {
  const seconds = parseRestSeconds(restStr);
  const label = formatRestLabel(seconds);
  const active = restTimers[slug];
  let text = label;
  let cls = "";
  if (active) {
    if (active.done) {
      text = "¡Listo!";
      cls = "is-done";
    } else {
      text = formatRestRemaining(active.remaining);
      cls = "is-running";
    }
  }
  return `<button class="rest-chip ${cls}" data-action="toggle-rest" data-slug="${slug}" data-rest-seconds="${seconds}" data-rest-label="${label}">${text}</button>`;
}

function renderWorkout(id) {
  const w = WORKOUTS[id];

  const exCards = w.exercises
    .map((exItem) => {
      const def = EXERCISES[exItem.slug];
      const scheme = `${exItem.sets}×${exItem.reps}${exItem.rir !== "—" ? " · RIR " + exItem.rir : ""}`;

      if (!exItem.trackWeight) {
        return `
          <div class="exercise-card no-weight-card">
            <div class="ex-head">
              <div class="ex-name">${def.name}</div>
              <div class="ex-scheme">${exItem.sets}×${exItem.reps}</div>
            </div>
            <div class="ex-actions">
              <span></span>
              ${restChip(exItem.slug, exItem.rest)}
            </div>
          </div>
        `;
      }

      const log = Store.getLog(exItem.slug);
      const hasLog = log.lastWeight !== null && log.lastWeight !== undefined;
      const lastLine = hasLog
        ? `Último: <strong>${fmtNum(log.lastWeight)} kg</strong> · ${log.lastReps} reps`
        : "Sin registros todavía";
      const history = (log.history || []).slice(-4).map((h) => fmtNum(h.weight));
      const historyLine = history.length > 1 ? history.join(" → ") : "";

      return `
        <div class="exercise-card">
          <div class="ex-head">
            <div class="ex-name">${def.name}</div>
            <div class="ex-scheme">${scheme}</div>
          </div>
          <div class="ex-last">${lastLine}</div>
          ${historyLine ? `<div class="ex-history">${historyLine}</div>` : ""}
          <div class="ex-actions">
            <button class="weight-btn" data-action="add-weight" data-slug="${exItem.slug}">+ Añadir peso</button>
            ${restChip(exItem.slug, exItem.rest)}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="screen screen--gym">
      <div class="topbar">
        <button data-action="nav" data-href="#/gym">← Entrenos</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:38px;">${w.name}</div>
        <div class="warmup-line">//${w.warmup}</div>
        <div class="exercise-list">${exCards}</div>
        ${w.note ? `<div class="note-block" style="opacity:0.85;">${w.note}</div>` : ""}
      </div>
      ${tabbar("gym")}
    </div>
  `;
}

// -------- temporizador de descanso real, por ejercicio --------

let restTimers = {}; // slug -> { remaining, id, done }

function clearAllRestTimers() {
  Object.values(restTimers).forEach((t) => t.id && clearInterval(t.id));
  restTimers = {};
}

function toggleRestTimer(slug, totalSeconds) {
  if (restTimers[slug] && restTimers[slug].id) clearInterval(restTimers[slug].id);
  restTimers[slug] = { remaining: totalSeconds, done: false, id: null };
  updateRestTimerDOM(slug);
  restTimers[slug].id = setInterval(() => {
    const t = restTimers[slug];
    if (!t) return;
    t.remaining--;
    if (t.remaining <= 0) {
      clearInterval(t.id);
      t.id = null;
      t.done = true;
      updateRestTimerDOM(slug);
      setTimeout(() => {
        delete restTimers[slug];
        updateRestTimerDOM(slug);
      }, 1600);
      return;
    }
    updateRestTimerDOM(slug);
  }, 1000);
}

function updateRestTimerDOM(slug) {
  const el = document.querySelector(`[data-action="toggle-rest"][data-slug="${slug}"]`);
  if (!el) return;
  const t = restTimers[slug];
  if (!t) {
    el.textContent = el.dataset.restLabel;
    el.classList.remove("is-running", "is-done");
    return;
  }
  if (t.done) {
    el.textContent = "¡Listo!";
    el.classList.add("is-done");
    el.classList.remove("is-running");
    return;
  }
  el.textContent = formatRestRemaining(t.remaining);
  el.classList.add("is-running");
}

function renderHistorial() {
  const slugs = Object.keys(EXERCISES).filter((slug) => {
    const log = Store.getLog(slug);
    return log.history && log.history.length;
  });

  const rows = slugs.length
    ? slugs
        .sort((a, b) => EXERCISES[a].name.localeCompare(EXERCISES[b].name))
        .map((slug) => {
          const log = Store.getLog(slug);
          const evolution = log.history
            .slice(-5)
            .map((h) => fmtNum(h.weight))
            .join(" → ");
          return `
            <div class="history-row">
              <div class="top">
                <div class="name">${EXERCISES[slug].name}</div>
                <div class="last">${fmtNum(log.lastWeight)} kg</div>
              </div>
              <div class="evolution">${evolution}</div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state" style="text-align:left; border-style:solid;">Todavía no has registrado ningún peso. En cuanto guardes uno, aparecerá aquí su evolución.</div>`;

  return `
    <div class="screen screen--gym">
      <div class="topbar"><button data-action="nav" data-href="#/gym">← Entrenos</button><span></span></div>
      <div class="content">
        <div class="h1" style="font-size:36px;">Historial<br>de cargas</div>
        <div class="meta-row"><span>//ÚLTIMO PESO Y EVOLUCIÓN</span></div>
        <div>${rows}</div>
      </div>
      ${tabbar("gym")}
    </div>
  `;
}

// ================================================================
// NATACIÓN — entrenos posibles + registros, dentro de su propia pantalla
// ================================================================

function renderNatacion() {
  const ideas = Store.getSwimIdeas();
  const logs = Store.getSwimLogs();

  const ideaCards = ideas.length
    ? `<div class="card-stack">${ideas
        .map(
          (idea) => `
        <button class="idea-card" data-action="nav" data-href="#/gym/natacion/${idea.id}/editar" style="border-color:var(--garnet); color:var(--garnet);">
          <div class="row-top"><div class="title">${escapeHtml(idea.name)}</div></div>
          ${idea.detail ? `<div class="ingredients" style="color:var(--garnet); opacity:0.8;">${escapeHtml(idea.detail)}</div>` : ""}
          <div class="row-bottom"><span></span><span>EDITAR →</span></div>
        </button>
      `
        )
        .join("")}</div>`
    : `<div class="empty-state" style="text-align:left; border-style:solid;">Todavía no hay entrenos de natación guardados.</div>`;

  const logRows = logs.length
    ? logs
        .map(
          (l) => `
        <div class="history-row">
          <div class="top">
            <div class="name">${daysAgoLabel(l.date)}</div>
            <button class="icon-btn" style="border-color:var(--garnet); color:var(--garnet); width:30px; height:30px; font-size:14px; flex:0 0 30px;" data-action="delete-swim-log" data-id="${l.id}">×</button>
          </div>
          <div class="evolution">${l.distance ? fmtNum(l.distance) + " km" : ""}${l.distance && l.duration ? " · " : ""}${l.duration ? l.duration + " min" : ""}${l.note ? " · " + escapeHtml(l.note) : ""}</div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state" style="text-align:left; border-style:solid;">Todavía no hay registros. Añade uno cuando termines de nadar.</div>`;

  return `
    <div class="screen screen--gym">
      <div class="topbar"><button data-action="nav" data-href="#/gym">← Entrenos</button><span></span></div>
      <div class="content">
        <div class="h1">Natación</div>
        <div class="meta-row"><span>//${WORKOUTS.natacion.subtitle}</span></div>

        <div class="group-label" style="margin-top:8px;">Entrenos posibles</div>
        ${ideaCards}
        <button class="btn-add-line" style="border-color:var(--garnet-line); color:var(--garnet); margin-top:10px;" data-action="nav" data-href="#/gym/natacion/nueva">+ Añadir entreno</button>

        <div class="group-label" style="margin-top:26px;">Registros</div>
        <div>${logRows}</div>
        <button class="btn-primary-pill" data-action="add-swim-log">+ Añadir registro</button>
      </div>
      ${tabbar("gym")}
    </div>
  `;
}

function renderSwimIdeaForm(id) {
  const isNew = !id;
  if (!formState || formState._swim !== true || formState._swimId !== id) {
    const existing = isNew ? null : Store.getSwimIdea(id);
    formState = existing ? JSON.parse(JSON.stringify(existing)) : { id: null, name: "", detail: "" };
    formState._swim = true;
    formState._swimId = id;
  }

  return `
    <div class="screen screen--gym">
      <div class="topbar">
        <button data-action="nav" data-href="#/gym/natacion">← Natación</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:32px; margin-bottom:18px;">${isNew ? "Nuevo entreno" : "Editar entreno"}</div>
        <div class="field">
          <label>Nombre</label>
          <input type="text" placeholder="Ej. Series 4×50 m" value="${escapeHtml(formState.name)}" data-field="name" style="border-color:var(--garnet); color:var(--garnet);">
        </div>
        <div class="field">
          <label>Detalle</label>
          <textarea placeholder="Describe el entreno…" data-field="detail" style="border-color:var(--garnet); color:var(--garnet);">${escapeHtml(formState.detail || "")}</textarea>
        </div>
        <button class="btn-primary-pill" data-action="save-swim-idea">Guardar</button>
        ${!isNew ? `<button class="btn-text-danger" style="color:var(--garnet);" data-action="delete-swim-idea" data-id="${id}">Eliminar entreno</button>` : ""}
      </div>
      ${tabbar("gym")}
    </div>
  `;
}

// ================================================================
// OVERLAYS: teclado numérico de peso + edición de titular
// ================================================================

function closeOverlay() {
  overlayRoot.innerHTML = "";
  keypadState = null;
}

function findExerciseItem(slug) {
  for (const id in WORKOUTS) {
    const w = WORKOUTS[id];
    if (!w.exercises) continue;
    const found = w.exercises.find((e) => e.slug === slug);
    if (found) return found;
  }
  return null;
}

function openWeightKeypad(slug) {
  const exItem = findExerciseItem(slug);
  const def = EXERCISES[slug];
  const log = Store.getLog(slug);
  const defaultReps = log.lastReps !== null && log.lastReps !== undefined ? log.lastReps : parseInt(exItem ? exItem.reps : 10, 10) || 10;

  keypadState = {
    slug,
    scheme: exItem ? `${exItem.sets}×${exItem.reps}` : "",
    rir: exItem ? exItem.rir : "—",
    exName: def.name,
    lastWeight: log.lastWeight,
    value: "",
    reps: defaultReps,
  };
  renderKeypad();
}

function renderKeypad() {
  const k = keypadState;
  const display = k.value !== "" ? k.value : k.lastWeight !== null && k.lastWeight !== undefined ? fmtNum(k.lastWeight) : "0";
  const currentNum = k.value !== "" ? parseNum(k.value) : k.lastWeight;

  let delta = "";
  if (k.lastWeight !== null && k.lastWeight !== undefined && currentNum !== null) {
    const diff = Math.round((currentNum - k.lastWeight) * 100) / 100;
    if (diff === 0) delta = "= ÚLTIMO";
    else delta = `${diff > 0 ? "+" : ""}${fmtNum(diff)} VS ÚLTIMO`;
  }

  overlayRoot.innerHTML = `
    <div class="sheet-overlay" data-action="close-overlay">
      <div class="sheet" data-stop>
        <div class="sheet-head">
          <div class="name">${k.exName}</div>
          <div class="scheme">${k.rir !== "—" ? "RIR " + k.rir + " · " : ""}${(k.scheme.split("×")[1] || "").trim()}</div>
        </div>
        <div class="weight-display">
          <div class="num">${display}</div>
          <div class="unit">kg</div>
          <div class="spacer"></div>
          ${delta ? `<div class="delta">${delta}</div>` : ""}
        </div>
        <div class="chip-row">
          <button class="chip" data-action="kp-shortcut" data-shortcut="last">último</button>
          <button class="chip" data-action="kp-shortcut" data-shortcut="-2.5">−2,5</button>
          <button class="chip" data-action="kp-shortcut" data-shortcut="2.5">+2,5</button>
          <button class="chip" data-action="kp-shortcut" data-shortcut="5">+5</button>
        </div>
        <div class="reps-row">
          <span class="reps-label">Reps</span>
          <div class="reps-controls">
            <button class="reps-btn" data-action="kp-reps" data-delta="-1">−</button>
            <span class="reps-val">${k.reps}</span>
            <button class="reps-btn" data-action="kp-reps" data-delta="1">+</button>
          </div>
        </div>
        <div class="keypad">
          <button data-action="kp-digit" data-digit="1">1</button>
          <button data-action="kp-digit" data-digit="2">2</button>
          <button data-action="kp-digit" data-digit="3">3</button>
          <button class="key-save" data-action="kp-save">Guardar</button>
          <button data-action="kp-digit" data-digit="4">4</button>
          <button data-action="kp-digit" data-digit="5">5</button>
          <button data-action="kp-digit" data-digit="6">6</button>
          <button data-action="kp-digit" data-digit="7">7</button>
          <button data-action="kp-digit" data-digit="8">8</button>
          <button data-action="kp-digit" data-digit="9">9</button>
          <button class="key-back" data-action="kp-backspace">⌫</button>
          <button data-action="kp-digit" data-digit=",">,</button>
          <button data-action="kp-digit" data-digit="0">0</button>
        </div>
      </div>
    </div>
  `;
}

function kpAppendDigit(d) {
  const k = keypadState;
  if (d === "," && k.value.includes(",")) return;
  if (k.value.length >= 6) return;
  k.value += d;
  renderKeypad();
}

function kpBackspace() {
  const k = keypadState;
  k.value = k.value.slice(0, -1);
  renderKeypad();
}

function kpShortcut(kind) {
  const k = keypadState;
  if (kind === "last") {
    if (k.lastWeight !== null && k.lastWeight !== undefined) k.value = fmtNum(k.lastWeight);
    renderKeypad();
    return;
  }
  const delta = parseFloat(kind);
  const base = k.value !== "" ? parseNum(k.value) : k.lastWeight !== null && k.lastWeight !== undefined ? k.lastWeight : 0;
  const next = Math.max(0, Math.round((base + delta) * 100) / 100);
  k.value = fmtNum(next);
  renderKeypad();
}

function kpReps(delta) {
  const k = keypadState;
  k.reps = Math.max(0, k.reps + delta);
  renderKeypad();
}

function kpSave() {
  const k = keypadState;
  let weight = k.value !== "" ? parseNum(k.value) : k.lastWeight;
  if (weight === null || weight === undefined) weight = 0;
  Store.logWeight(k.slug, weight, k.reps);
  closeOverlay();
  refresh();
}

// -------- registro de natación (sheet simple) --------

function openSwimLogForm() {
  overlayRoot.innerHTML = `
    <div class="sheet-overlay" data-action="close-overlay">
      <div class="sheet sheet--text" data-stop style="color:var(--garnet); background:var(--oliva-gym);">
        <div class="sheet-title">//Nuevo registro de natación</div>
        <div class="field" style="margin-top:14px;">
          <label>Distancia (km)</label>
          <input type="text" inputmode="decimal" id="swim-distance" placeholder="1,3" style="border-color:var(--garnet); color:var(--garnet);">
        </div>
        <div class="field">
          <label>Duración (min)</label>
          <input type="number" inputmode="numeric" id="swim-duration" placeholder="50" style="border-color:var(--garnet); color:var(--garnet);">
        </div>
        <div class="field">
          <label>Nota (opcional)</label>
          <input type="text" id="swim-note" placeholder="Ej. crol + braza" style="border-color:var(--garnet); color:var(--garnet);">
        </div>
        <button class="btn-primary-pill" data-action="save-swim-log">Guardar</button>
      </div>
    </div>
  `;
  document.getElementById("swim-distance").focus();
}

function saveSwimLogForm() {
  const distance = parseNum(document.getElementById("swim-distance").value);
  const duration = parseInt(document.getElementById("swim-duration").value, 10) || null;
  const note = document.getElementById("swim-note").value.trim();
  Store.addSwimLog({ distance, duration, note });
  closeOverlay();
  refresh();
}

// -------- editar titular de home --------

function openHeadlineEditor() {
  overlayRoot.innerHTML = `
    <div class="sheet-overlay" data-action="close-overlay">
      <div class="sheet sheet--text" data-stop>
        <div class="sheet-title">//Objetivo de la semana</div>
        <textarea id="headline-input" maxlength="140">${escapeHtml(Store.state.headline || "")}</textarea>
        <button class="btn-primary-pill" style="background:var(--yellow); color:#4a4930;" data-action="save-headline">Guardar</button>
      </div>
    </div>
  `;
  document.getElementById("headline-input").focus();
}

function saveHeadline() {
  const val = document.getElementById("headline-input").value.trim();
  Store.setHeadline(val);
  closeOverlay();
  refresh();
}

// ================================================================
// EVENTOS (delegación única sobre document)
// ================================================================

document.addEventListener("click", (e) => {
  const overlayBg = e.target.closest(".sheet-overlay");
  if (overlayBg && e.target === overlayBg) {
    closeOverlay();
    return;
  }

  const t = e.target.closest("[data-action]");
  if (!t) return;
  const action = t.dataset.action;

  switch (action) {
    case "nav":
      navigate(t.dataset.href);
      break;
    case "edit-headline":
      openHeadlineEditor();
      break;
    case "save-headline":
      saveHeadline();
      break;
    case "close-overlay":
      closeOverlay();
      break;
    case "add-ingredient":
      formState.ingredients.push({ name: "", amount: "" });
      appEl.innerHTML = renderIdeaForm(formState._mealKey, formState._ideaId);
      break;
    case "remove-ingredient": {
      const idx = parseInt(t.dataset.index, 10);
      formState.ingredients.splice(idx, 1);
      if (!formState.ingredients.length) formState.ingredients.push({ name: "", amount: "" });
      appEl.innerHTML = renderIdeaForm(formState._mealKey, formState._ideaId);
      break;
    }
    case "save-idea": {
      const mealKey = formState._mealKey;
      const list = Store.getIdeas(mealKey);
      const ids = list.map((i) => i.id);
      const idea = {
        id: formState.id || newId(ids, formState.name || "idea"),
        name: formState.name || "Idea sin nombre",
        kcal: parseInt(formState.kcal, 10) || 0,
        protein: parseNum(formState.protein) || 0,
        tag: formState.tag || "",
        ingredients: formState.ingredients.filter((i) => i.name.trim() !== ""),
        note: formState.note || "",
      };
      Store.saveIdea(mealKey, idea);
      formState = null;
      navigate(`#/comidas/${mealKey}/${idea.id}`);
      break;
    }
    case "delete-idea": {
      Store.deleteIdea(t.dataset.meal, t.dataset.id);
      formState = null;
      navigate(`#/comidas/${t.dataset.meal}`);
      break;
    }
    case "add-weight":
      openWeightKeypad(t.dataset.slug);
      break;
    case "toggle-rest":
      toggleRestTimer(t.dataset.slug, parseInt(t.dataset.restSeconds, 10));
      break;
    case "kp-digit":
      kpAppendDigit(t.dataset.digit);
      break;
    case "kp-backspace":
      kpBackspace();
      break;
    case "kp-shortcut":
      kpShortcut(t.dataset.shortcut);
      break;
    case "kp-reps":
      kpReps(parseInt(t.dataset.delta, 10));
      break;
    case "kp-save":
      kpSave();
      break;
    case "add-swim-log":
      openSwimLogForm();
      break;
    case "delete-swim-log":
      Store.deleteSwimLog(t.dataset.id);
      refresh();
      break;
    case "save-swim-idea": {
      const list = Store.getSwimIdeas();
      const ids = list.map((i) => i.id);
      const idea = {
        id: formState.id || newId(ids, formState.name || "entreno"),
        name: formState.name || "Entreno sin nombre",
        detail: formState.detail || "",
      };
      Store.saveSwimIdea(idea);
      formState = null;
      navigate("#/gym/natacion");
      break;
    }
    case "delete-swim-idea":
      Store.deleteSwimIdea(t.dataset.id);
      formState = null;
      navigate("#/gym/natacion");
      break;
    case "save-swim-log":
      saveSwimLogForm();
      break;
    default:
      break;
  }
});

document.addEventListener("input", (e) => {
  const field = e.target.dataset ? e.target.dataset.field : null;
  if (!field || !formState) return;
  if (field === "ing-name" || field === "ing-amount") {
    const idx = parseInt(e.target.dataset.index, 10);
    const key = field === "ing-name" ? "name" : "amount";
    formState.ingredients[idx][key] = e.target.value;
  } else {
    formState[field] = e.target.value;
  }
});

// foto de fondo de la Home: si existe assets/hero.jpg, se usa automáticamente
document.documentElement.classList.add("no-hero");
(function loadHeroImage() {
  const img = new Image();
  img.onload = () => {
    document.documentElement.style.setProperty("--hero-image", "url('assets/hero.jpg')");
    document.documentElement.classList.remove("no-hero");
  };
  img.onerror = () => {}; // sin foto todavía: se queda el degradado de aviso
  img.src = "assets/hero.jpg";
})();

// arranque
render();
