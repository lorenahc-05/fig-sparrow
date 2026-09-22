// ============================================================
// APP — router + render + interacciones
// ============================================================

const appEl = document.getElementById("app");
const overlayRoot = document.getElementById("overlay-root");

let formState = null; // estado del formulario de idea en edición
let keypadState = null; // estado del teclado numérico de peso

function todayDayIndex() {
  const jsDay = new Date().getDay(); // 0=domingo … 6=sábado
  return (jsDay + 6) % 7; // 0=lunes … 6=domingo
}

let menuState = { view: "dias", day: todayDayIndex() }; // estado de la pantalla "Menú semanal"

function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayDateKey() {
  return dateKeyFromDate(new Date());
}

let calcState = { date: todayDateKey() }; // estado de la pantalla "Calculadora de kcal" (día visible)
let plateState = null; // estado del plato en construcción (calculadora por ingredientes)

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
  const hero = nextHeroImage();
  const heroStyle = hero ? ` style="background-image:url('${hero}')"` : "";
  return `
    <div class="screen-home"${heroStyle}>
      <div class="home-hero-hint">Fotos de fondo — coloca una o varias en assets/ (hero1.jpg, hero2.jpg…) y se irán alternando solas</div>
      <button class="sync-badge" data-action="open-sync">${syncBadgeLabel()}</button>
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

function syncBadgeLabel() {
  if (typeof Sync === "undefined" || !Sync.isConfigured()) return "Sincronización";
  if (!Sync.isEnabled()) return "Sync: off";
  return "Sync: " + Sync.getCode();
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
  if (mealKey === "menu") return renderMenuSemanal();
  if (mealKey === "calculadora") return renderCalculadora(sub);
  if (!MEAL_DEFS[mealKey]) return renderMealHome();

  if (!sub) return renderIdeasList(mealKey);
  if (sub === "nueva") return renderIdeaForm(mealKey, null);
  if (sub2 === "editar") return renderIdeaForm(mealKey, sub);
  return renderIdeaDetail(mealKey, sub);
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
        <button class="menu-semanal-btn" data-action="nav" data-href="#/comidas/menu">
          <span>Menú semanal</span><span class="arrow">→</span>
        </button>
        <button class="menu-semanal-btn calc-btn" data-action="nav" data-href="#/comidas/calculadora">
          <span>Calculadora de kcal</span><span class="arrow">→</span>
        </button>
      </div>
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
          ${idea.days && idea.days.length ? `<div class="card-days">${idea.days.map((d) => DAY_ABBR[d]).join(" · ")}</div>` : ""}
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

  const dayBadge =
    idea.days && idea.days.length ? `<div class="day-badge">${idea.days.map((d) => DAY_ABBR[d]).join(" · ")}</div>` : "";

  const stepsSection =
    idea.steps && idea.steps.length
      ? `<div style="margin-top:22px">
           <div class="section-label">//Preparación</div>
           <ol class="steps-list">${idea.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
         </div>`
      : "";

  const adjust = idea.note
    ? `<div style="margin-top:22px">
         <div class="section-label">//Ajuste</div>
         <div class="adjust-note">${escapeHtml(idea.note)}</div>
       </div>`
    : "";

  const photoSection = `
    <div style="margin-top:22px">
      <div class="section-label">//Foto</div>
      ${idea.photo ? `<img class="idea-photo" src="${idea.photo}" alt="${escapeHtml(idea.name)}">` : ""}
      <input type="file" accept="image/*" capture="environment" id="photo-input" style="display:none" data-meal="${mealKey}" data-id="${idea.id}">
      <button class="btn-add-line" data-action="upload-photo">${idea.photo ? "Cambiar foto" : "+ Añadir foto"}</button>
      ${idea.photo ? `<button class="btn-text-danger" data-action="remove-photo" data-meal="${mealKey}" data-id="${idea.id}">Quitar foto</button>` : ""}
    </div>
  `;

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas/${mealKey}">← ${def.label}</button>
        <button data-action="nav" data-href="#/comidas/${mealKey}/${idea.id}/editar">Editar</button>
      </div>
      <div class="content">
        <div class="h1">${escapeHtml(idea.name)}</div>
        ${idea.tag ? `<div class="tag-line">${escapeHtml(idea.tag)}</div>` : ""}
        ${dayBadge}
        <div class="stat-row">
          <div class="stat-box"><div class="label">Kcal</div><div class="value">${idea.kcal}</div></div>
          <div class="stat-box fill"><div class="label">Proteína</div><div class="value">${fmtNum(idea.protein)}<small>g</small></div></div>
        </div>
        <div class="section-label">//Ingredientes</div>
        <div class="ingredient-list">${ingRows}</div>
        ${stepsSection}
        ${adjust}
        ${photoSection}
      </div>
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
    </div>
  `;
}

// ================================================================
// MENÚ SEMANAL — calendario de la semana, día a día o tabla completa
// (por ahora se calcula a partir de idea.days; en el futuro esta
// asignación podrá venir sincronizada desde la herramienta de
// menú semanal interactivo con drag-and-drop)
// ================================================================

function ideasForDay(mealKey, dayIdx) {
  return Store.getIdeas(mealKey).filter((i) => Array.isArray(i.days) && i.days.includes(dayIdx));
}

function menuMealKeys() {
  return Object.keys(MEAL_DEFS)
    .filter((k) => k !== "cafe" && k !== "margen")
    .sort((a, b) => MEAL_DEFS[a].order - MEAL_DEFS[b].order);
}

function renderMenuSemanal() {
  const mealKeys = menuMealKeys();

  const toggle = `
    <div class="menu-view-toggle">
      <button class="${menuState.view === "dias" ? "is-active" : ""}" data-action="menu-set-view" data-view="dias">Día a día</button>
      <button class="${menuState.view === "tabla" ? "is-active" : ""}" data-action="menu-set-view" data-view="tabla">Tabla completa</button>
    </div>
  `;

  const dayPills = DAY_LABELS.map(
    (label, i) => `
      <button class="day-pill ${menuState.day === i ? "is-active" : ""}" data-action="menu-select-day" data-day="${i}">${DAY_ABBR[i]}</button>
    `
  ).join("");

  const body = menuState.view === "tabla" ? renderMenuTable(mealKeys) : renderMenuDay(mealKeys, menuState.day);

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas">← Reparto del día</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:34px;">Menú<br>semanal</div>
        <div class="meta-row"><span>//${MEAL_TOTAL_TARGET}</span><span>//${PROTEIN_TARGET}</span></div>
        ${toggle}
        ${menuState.view === "dias" ? `<div class="day-pills">${dayPills}</div>` : ""}
        ${body}
      </div>
    </div>
  `;
}

function renderMenuDay(mealKeys, dayIdx) {
  const blocks = mealKeys
    .map((mealKey) => {
      const def = MEAL_DEFS[mealKey];
      const ideas = ideasForDay(mealKey, dayIdx);
      const cards = ideas.length
        ? ideas
            .map(
              (idea) => `
          <button class="menu-recipe-card" data-action="nav" data-href="#/comidas/${mealKey}/${idea.id}">
            <div class="row-top">
              <div class="title">${escapeHtml(idea.name)}</div>
              <div class="kcal">${idea.kcal}</div>
            </div>
            <div class="ingredients">${escapeHtml(ingredientsLine(idea.ingredients))}</div>
          </button>
        `
            )
            .join("")
        : `<div class="empty-state" style="text-align:left;">Sin receta asignada este día.</div>`;

      return `
        <div class="menu-meal-block">
          <div class="menu-meal-label">${def.label}<span class="menu-meal-kcal">${def.kcal} kcal</span></div>
          ${cards}
        </div>
      `;
    })
    .join("");

  return `<div class="menu-day">${blocks}</div>`;
}

function renderMenuTable(mealKeys) {
  const headerCells = DAY_ABBR.map((d) => `<th>${d}</th>`).join("");
  const rows = mealKeys
    .map((mealKey) => {
      const def = MEAL_DEFS[mealKey];
      const cells = DAY_LABELS.map((_, dayIdx) => {
        const idea = ideasForDay(mealKey, dayIdx)[0];
        return `<td>${idea ? `<span class="cell-name">${escapeHtml(idea.name)}</span><span class="cell-kcal">${idea.kcal} kcal</span>` : "—"}</td>`;
      }).join("");
      return `<tr><th>${def.label}</th>${cells}</tr>`;
    })
    .join("");

  return `
    <div class="menu-table-wrap">
      <table class="menu-table">
        <thead><tr><th></th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ================================================================
// CALCULADORA DE KCAL
// - "Plato del menú": suma directamente el kcal/proteína ya registrados
//   de una receta existente.
// - "Crear plato": se añaden ingredientes con su cantidad en gramos
//   (de la base de ingredientes, ampliable sobre la marcha) y se suman
//   en un plato que luego se registra en el día.
// - Todo se guarda por día (fecha) para poder ver el histórico.
// ================================================================

function renderCalculadora(sub) {
  if (sub === "menu") return renderCalcMenuPicker();
  if (sub === "plato") return renderCalcPlato();
  return renderCalcDia();
}

function formatCalcDateLabel(dateKey) {
  if (dateKey === todayDateKey()) return "HOY";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === dateKeyFromDate(yesterday)) return "AYER";
  const d = new Date(dateKey + "T00:00:00");
  return d
    .toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase()
    .replace(".", "");
}

function renderCalcDia() {
  const dateKey = calcState.date;
  const entries = Store.getDayLog(dateKey);
  const totalKcal = entries.reduce((sum, e) => sum + (e.kcal || 0), 0);
  const totalProtein = entries.reduce((sum, e) => sum + (e.protein || 0), 0);
  const pct = Math.max(0, Math.min(100, Math.round((totalKcal / 1800) * 100)));
  const isToday = dateKey === todayDateKey();

  const rows = entries.length
    ? entries
        .map(
          (e) => `
        <div class="calc-entry-row">
          <div class="calc-entry-info">
            <div class="name">${escapeHtml(e.name)}</div>
            <div class="sub">${e.source === "menu" && MEAL_DEFS[e.mealKey] ? escapeHtml(MEAL_DEFS[e.mealKey].label) : "Plato personalizado"}${e.protein ? ` · ${fmtNum(e.protein)} g proteína` : ""}</div>
          </div>
          <div class="calc-entry-right">
            <span class="kcal">${Math.round(e.kcal)}</span>
            <button class="icon-btn" data-action="delete-day-entry" data-date="${dateKey}" data-id="${e.id}" aria-label="Eliminar">×</button>
          </div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">Todavía no has registrado nada ${isToday ? "hoy" : "este día"}.</div>`;

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas">← Reparto del día</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:34px;">Calculadora<br>de kcal</div>

        <div class="calc-date-nav">
          <button data-action="calc-day-shift" data-delta="-1" aria-label="Día anterior">←</button>
          <div class="calc-date-label">${formatCalcDateLabel(dateKey)}</div>
          <button data-action="calc-day-shift" data-delta="1" aria-label="Día siguiente" ${isToday ? "disabled" : ""}>→</button>
        </div>

        <div class="calc-total-box">
          <div class="calc-total-kcal">${Math.round(totalKcal)}<small> kcal</small></div>
          <div class="calc-total-bar"><div class="calc-total-bar-fill" style="width:${pct}%"></div></div>
          <div class="calc-total-sub">//${MEAL_TOTAL_TARGET} · ${fmtNum(totalProtein)} G PROTEÍNA REGISTRADA</div>
        </div>

        <div class="calc-entry-list">${rows}</div>

        <button class="btn-add-line" data-action="nav" data-href="#/comidas/calculadora/menu">+ Plato del menú</button>
        <button class="btn-add-line" data-action="nav" data-href="#/comidas/calculadora/plato">+ Crear plato con ingredientes</button>
      </div>
    </div>
  `;
}

function renderCalcMenuPicker() {
  const mealKeys = Object.keys(MEAL_DEFS).sort((a, b) => MEAL_DEFS[a].order - MEAL_DEFS[b].order);
  const sections = mealKeys
    .map((mealKey) => {
      const def = MEAL_DEFS[mealKey];
      const ideas = Store.getIdeas(mealKey);
      if (!ideas.length) return "";
      const cards = ideas
        .map(
          (idea) => `
        <button class="menu-recipe-card" data-action="calc-add-menu-idea" data-meal="${mealKey}" data-id="${idea.id}">
          <div class="row-top">
            <div class="title">${escapeHtml(idea.name)}</div>
            <div class="kcal">${idea.kcal}</div>
          </div>
          <div class="ingredients">${escapeHtml(ingredientsLine(idea.ingredients))}</div>
        </button>
      `
        )
        .join("");
      return `
        <div class="menu-meal-block">
          <div class="menu-meal-label">${def.label}</div>
          ${cards}
        </div>
      `;
    })
    .join("");

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas/calculadora">← Calculadora</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:30px;">Añadir<br>plato del menú</div>
        <div class="meta-row"><span>//TOCA UNA RECETA PARA SUMARLA A ${calcState.date === todayDateKey() ? "HOY" : formatCalcDateLabel(calcState.date)}</span></div>
        <div class="menu-day">${sections}</div>
      </div>
    </div>
  `;
}

function ensurePlateState() {
  if (!plateState) plateState = { lines: [] };
  return plateState;
}

function plateTotals() {
  return ensurePlateState().lines.reduce(
    (acc, l) => {
      acc.kcal += l.kcal;
      acc.protein += l.protein;
      return acc;
    },
    { kcal: 0, protein: 0 }
  );
}

function addPlateLine(ingredient, grams) {
  const p = ensurePlateState();
  p.lines.push({
    ingredientId: ingredient.id,
    name: ingredient.name,
    grams,
    kcal: (ingredient.kcalPer100 * grams) / 100,
    protein: (ingredient.proteinPer100 * grams) / 100,
  });
}

function renderCalcPlato() {
  const p = ensurePlateState();
  const totals = plateTotals();
  const datalist = Store.getIngredients()
    .map((i) => `<option value="${escapeHtml(i.name)}"></option>`)
    .join("");

  const lines = p.lines.length
    ? p.lines
        .map(
          (l, idx) => `
        <div class="calc-entry-row">
          <div class="calc-entry-info">
            <div class="name">${escapeHtml(l.name)}</div>
            <div class="sub">${fmtNum(l.grams)} g</div>
          </div>
          <div class="calc-entry-right">
            <span class="kcal">${Math.round(l.kcal)}</span>
            <button class="icon-btn" data-action="plate-remove-line" data-index="${idx}" aria-label="Eliminar">×</button>
          </div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">Añade ingredientes con su cantidad en gramos.</div>`;

  return `
    <div class="screen screen--comidas">
      <div class="topbar">
        <button data-action="nav" data-href="#/comidas/calculadora">← Calculadora</button>
        <span></span>
      </div>
      <div class="content">
        <div class="h1" style="font-size:30px;">Crear<br>plato</div>
        <div class="meta-row"><span>//DI LA CANTIDAD Y EL INGREDIENTE, SE SUMA SOLO</span></div>

        <div class="plate-add-row">
          <input type="text" id="plate-ingredient-input" list="plate-ingredients-list" placeholder="Ingrediente (ej. Queso cottage)">
          <input type="number" inputmode="decimal" id="plate-grams-input" placeholder="g" class="plate-grams-input">
          <button class="icon-btn" data-action="plate-add-line" aria-label="Añadir">+</button>
        </div>
        <datalist id="plate-ingredients-list">${datalist}</datalist>

        <div class="calc-entry-list">${lines}</div>

        <div class="calc-total-box">
          <div class="calc-total-kcal">${Math.round(totals.kcal)}<small> kcal</small></div>
          <div class="calc-total-sub">//${fmtNum(totals.protein)} G PROTEÍNA</div>
        </div>

        <div class="field" style="margin-top:14px;">
          <label>Nombre del plato (opcional)</label>
          <input type="text" id="plate-name-input" placeholder="Plato personalizado" value="${escapeHtml(p.name || "")}">
        </div>

        <button class="btn-primary-pill" data-action="plate-save" ${p.lines.length ? "" : "disabled"}>Añadir al día</button>
      </div>
    </div>
  `;
}

function plateAddLine() {
  const nameInput = document.getElementById("plate-ingredient-input");
  const gramsInput = document.getElementById("plate-grams-input");
  const name = nameInput.value.trim();
  const grams = parseNum(gramsInput.value);
  if (!name || !grams) return;
  const ingredient = Store.findIngredientByName(name);
  if (!ingredient) {
    openQuickIngredientSheet(name, grams);
    return;
  }
  addPlateLine(ingredient, grams);
  appEl.innerHTML = renderCalcPlato();
  const freshInput = document.getElementById("plate-ingredient-input");
  if (freshInput) freshInput.focus();
}

function openQuickIngredientSheet(name, grams) {
  overlayRoot.innerHTML = `
    <div class="sheet-overlay" data-action="close-overlay">
      <div class="sheet sheet--text" data-stop>
        <div class="sheet-title">//Nuevo ingrediente</div>
        <div class="field" style="margin-top:14px;">
          <label>Nombre</label>
          <input type="text" id="qi-name" value="${escapeHtml(name)}">
        </div>
        <div style="display:flex; gap:10px;">
          <div class="field" style="flex:1"><label>Kcal / 100 g</label><input type="number" inputmode="decimal" id="qi-kcal" placeholder="0"></div>
          <div class="field" style="flex:1"><label>Proteína / 100 g</label><input type="text" inputmode="decimal" id="qi-protein" placeholder="0"></div>
        </div>
        <button class="btn-primary-pill" style="background:var(--yellow); color:#4a4930;" data-action="save-quick-ingredient" data-grams="${grams}">Guardar y añadir</button>
      </div>
    </div>
  `;
  document.getElementById("qi-name").focus();
}

function saveQuickIngredient(gramsStr) {
  const name = document.getElementById("qi-name").value.trim();
  if (!name) return;
  const kcalPer100 = parseNum(document.getElementById("qi-kcal").value) || 0;
  const proteinPer100 = parseNum(document.getElementById("qi-protein").value) || 0;
  const existingIds = Store.getIngredients().map((i) => i.id);
  const ingredient = Store.saveIngredient({ id: newId(existingIds, name), name, kcalPer100, proteinPer100 });
  closeOverlay();
  const grams = parseNum(gramsStr);
  if (grams) addPlateLine(ingredient, grams);
  appEl.innerHTML = renderCalcPlato();
}

function plateSave() {
  const p = ensurePlateState();
  if (!p.lines.length) return;
  const nameInput = document.getElementById("plate-name-input");
  const name = (nameInput && nameInput.value.trim()) || "Plato personalizado";
  const totals = plateTotals();
  Store.addDayEntry(calcState.date, {
    name,
    kcal: totals.kcal,
    protein: totals.protein,
    source: "custom",
    lines: p.lines.map((l) => ({ name: l.name, grams: l.grams })),
  });
  plateState = null;
  navigate("#/comidas/calculadora");
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
        <button class="btn-primary-pill" style="background:var(--garnet); color:var(--garnet-cream);" data-action="save-swim-log">Guardar</button>
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
  const ta = document.getElementById("headline-input");
  ta.focus();
  // permite insertar tabuladores de verdad en vez de saltar de campo
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + "\t" + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 1;
    }
  });
}

function saveHeadline() {
  const val = document.getElementById("headline-input").value.trim();
  Store.setHeadline(val);
  closeOverlay();
  refresh();
}

// -------- sincronización entre dispositivos --------

function openSyncSheet() {
  if (typeof Sync === "undefined" || !Sync.isConfigured()) {
    overlayRoot.innerHTML = `
      <div class="sheet-overlay" data-action="close-overlay">
        <div class="sheet sheet--text" data-stop>
          <div class="sheet-title">//Sincronización</div>
          <div class="sync-status-line">Todavía no está configurada. Añade tus datos de Firebase en el archivo <strong>sync-config.js</strong> (las instrucciones están dentro de ese mismo archivo) y esta app sincronizará sola entre tus dispositivos.</div>
          <button class="btn-primary-pill" style="background:var(--yellow); color:#4a4930;" data-action="close-overlay">Entendido</button>
        </div>
      </div>
    `;
    return;
  }
  renderSyncSheet();
}

function renderSyncSheet() {
  const enabled = Sync.isEnabled();
  const code = Sync.getCode();
  overlayRoot.innerHTML = `
    <div class="sheet-overlay" data-action="close-overlay">
      <div class="sheet sheet--text" data-stop>
        <div class="sheet-title">//Sincronización entre dispositivos</div>

        <div class="toggle-row">
          <span>${enabled ? "Activada" : "Desactivada"}</span>
          <button class="btn-primary-pill" style="width:auto; margin:0; padding:8px 16px; background:var(--yellow); color:#4a4930;" data-action="toggle-sync">${enabled ? "Apagar" : "Encender"}</button>
        </div>

        <div class="sync-code-box">
          <div class="code">${code}</div>
          <div class="hint">Tu código de sincronización</div>
        </div>
        <div class="sync-status-line">Pon este mismo código en tus otros dispositivos (botón de abajo) para que compartan los mismos datos: ideas, pesos, registros de natación y el titular de la home.</div>

        <div class="field">
          <label>Usar el código de otro dispositivo</label>
          <input type="text" id="sync-join-input" placeholder="Ej. AB3F9K2Q" maxlength="8" style="text-transform:uppercase;">
        </div>
        <button class="btn-primary-pill" style="background:var(--yellow); color:#4a4930;" data-action="join-sync">Unirme a ese código</button>
      </div>
    </div>
  `;
}

async function toggleSyncEnabled() {
  Sync.setEnabled(!Sync.isEnabled());
  if (Sync.isEnabled()) {
    await Sync.syncOnLoad();
  }
  renderSyncSheet();
  refresh();
}

async function joinSyncCode() {
  const input = document.getElementById("sync-join-input");
  const code = input.value.trim();
  if (!code) return;
  await Sync.joinCode(code);
  renderSyncSheet();
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
    case "open-sync":
      openSyncSheet();
      break;
    case "toggle-sync":
      toggleSyncEnabled();
      break;
    case "join-sync":
      joinSyncCode();
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
    case "menu-select-day":
      menuState.day = parseInt(t.dataset.day, 10);
      appEl.innerHTML = renderMenuSemanal();
      break;
    case "menu-set-view":
      menuState.view = t.dataset.view;
      appEl.innerHTML = renderMenuSemanal();
      break;
    case "upload-photo": {
      const input = document.getElementById("photo-input");
      if (input) input.click();
      break;
    }
    case "remove-photo":
      Store.removeIdeaPhoto(t.dataset.meal, t.dataset.id);
      refresh();
      break;
    case "calc-day-shift": {
      const d = new Date(calcState.date + "T00:00:00");
      d.setDate(d.getDate() + parseInt(t.dataset.delta, 10));
      const key = dateKeyFromDate(d);
      if (key <= todayDateKey()) calcState.date = key;
      appEl.innerHTML = renderCalcDia();
      break;
    }
    case "delete-day-entry":
      Store.deleteDayEntry(t.dataset.date, t.dataset.id);
      refresh();
      break;
    case "calc-add-menu-idea": {
      const idea = Store.getIdea(t.dataset.meal, t.dataset.id);
      if (idea) {
        Store.addDayEntry(calcState.date, {
          name: idea.name,
          kcal: idea.kcal,
          protein: idea.protein,
          source: "menu",
          mealKey: t.dataset.meal,
          ideaId: idea.id,
        });
      }
      navigate("#/comidas/calculadora");
      break;
    }
    case "plate-add-line":
      plateAddLine();
      break;
    case "plate-remove-line":
      ensurePlateState().lines.splice(parseInt(t.dataset.index, 10), 1);
      appEl.innerHTML = renderCalcPlato();
      break;
    case "plate-save":
      plateSave();
      break;
    case "save-quick-ingredient":
      saveQuickIngredient(t.dataset.grams);
      break;
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

// -------- foto de receta: redimensiona en el móvil antes de guardar --------

function resizeImageToDataUrl(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    const dataUrl = await resizeImageToDataUrl(file, 900, 0.72);
    Store.setIdeaPhoto(input.dataset.meal, input.dataset.id, dataUrl);
    refresh();
  } catch (e) {
    /* imagen no válida o navegador sin soporte: se ignora */
  }
}

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "photo-input") {
    handlePhotoUpload(e.target);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target && (e.target.id === "plate-ingredient-input" || e.target.id === "plate-grams-input")) {
    e.preventDefault();
    plateAddLine();
  }
});

// -------- fotos de fondo de la Home: varias, alternando automáticamente --------
// Busca assets/hero1.jpg, hero2.jpg, … (hasta 12) y también el antiguo
// assets/hero.jpg por compatibilidad. Cada vez que se entra en la Home se
// muestra la siguiente de la lista, en orden rotatorio.

let heroImages = [];

function probeImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function discoverHeroImages() {
  const candidates = [];
  for (let i = 1; i <= 12; i++) candidates.push(`assets/hero${i}.jpg`);
  candidates.push("assets/hero.jpg"); // nombre antiguo, se sigue admitiendo
  const results = await Promise.all(candidates.map(probeImage));
  heroImages = results.filter(Boolean);
  return heroImages;
}

function nextHeroImage() {
  if (!heroImages.length) return null;
  const key = "kcalgym_hero_idx";
  let idx = parseInt(localStorage.getItem(key) || "0", 10);
  if (Number.isNaN(idx) || idx < 0) idx = 0;
  const src = heroImages[idx % heroImages.length];
  idx = (idx + 1) % heroImages.length;
  try {
    localStorage.setItem(key, String(idx));
  } catch (e) {
    /* sin almacenamiento: se pierde el orden pero se sigue viendo una foto */
  }
  return src;
}

document.documentElement.classList.add("no-hero");
discoverHeroImages().then((list) => {
  if (list.length) document.documentElement.classList.remove("no-hero");
  if (parseHash().length === 0) refresh(); // ya estamos en la Home: aplica la foto
});

// -------- service worker: instalación real como PWA a pantalla completa --------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// arranque
render();

// sincronización: al abrir la app, si hay una versión más nueva en otro
// dispositivo, la adoptamos y refrescamos la pantalla
if (typeof Sync !== "undefined") {
  Sync.syncOnLoad().then((changed) => {
    if (changed) refresh();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      Sync.syncOnLoad().then((changed) => {
        if (changed) refresh();
      });
    }
  });
}