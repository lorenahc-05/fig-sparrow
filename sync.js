// ============================================================
// SYNC — sincroniza Store.state entre dispositivos.
// Usa la API REST de Firestore (sin SDK, sin cuentas de usuario):
// cada grupo de dispositivos comparte un "código de sincronización"
// de 8 caracteres que hace de identificador + contraseña.
//
// Si SYNC_CONFIG (sync-config.js) está vacío, todas las funciones de
// aquí no hacen nada y la app sigue siendo 100% local, como antes.
// ============================================================

const Sync = {
  CODE_KEY: "kcalgym_sync_code",
  ENABLED_KEY: "kcalgym_sync_enabled",
  pushTimer: null,
  lastStatus: "idle", // idle | syncing | ok | error

  isConfigured() {
    return !!(SYNC_CONFIG.firebaseProjectId && SYNC_CONFIG.firebaseApiKey);
  },

  isEnabled() {
    return localStorage.getItem(this.ENABLED_KEY) !== "0";
  },

  setEnabled(on) {
    localStorage.setItem(this.ENABLED_KEY, on ? "1" : "0");
  },

  hasCode() {
    return !!localStorage.getItem(this.CODE_KEY);
  },

  getCode() {
    let code = localStorage.getItem(this.CODE_KEY);
    if (!code) {
      code = this.randomCode();
      localStorage.setItem(this.CODE_KEY, code);
    }
    return code;
  },

  setCode(code) {
    localStorage.setItem(this.CODE_KEY, code.trim().toUpperCase());
  },

  randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  },

  docUrl(extra) {
    const code = this.getCode();
    return `https://firestore.googleapis.com/v1/projects/${SYNC_CONFIG.firebaseProjectId}/databases/(default)/documents/syncs/${code}?key=${SYNC_CONFIG.firebaseApiKey}${extra || ""}`;
  },

  async pull() {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetch(this.docUrl());
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const json = await res.json();
      const raw = json.fields && json.fields.data && json.fields.data.stringValue;
      const updatedAt = json.fields && json.fields.updatedAt ? parseInt(json.fields.updatedAt.integerValue, 10) : 0;
      if (!raw) return null;
      return { state: JSON.parse(raw), updatedAt: updatedAt || 0 };
    } catch (e) {
      return null;
    }
  },

  async push(state) {
    if (!this.isConfigured() || !this.isEnabled()) return false;
    const body = {
      fields: {
        data: { stringValue: JSON.stringify(state) },
        updatedAt: { integerValue: String(state.updatedAt || Date.now()) },
      },
    };
    try {
      this.lastStatus = "syncing";
      const res = await fetch(this.docUrl("&updateMask.fieldPaths=data&updateMask.fieldPaths=updatedAt"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      this.lastStatus = res.ok ? "ok" : "error";
      return res.ok;
    } catch (e) {
      this.lastStatus = "error";
      return false;
    }
  },

  schedulePush(state) {
    if (!this.isConfigured() || !this.isEnabled()) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.push(state), 1200);
  },

  // al arrancar: si hay una versión remota más nueva que la local, la adoptamos;
  // si la local es más nueva (o el remoto no existe todavía), la subimos.
  async syncOnLoad() {
    if (!this.isConfigured() || !this.isEnabled()) return false;
    const remote = await this.pull();
    if (remote && remote.updatedAt > (Store.state.updatedAt || 0)) {
      Store.state = remote.state;
      Store.save(true);
      return true;
    }
    this.push(Store.state);
    return false;
  },

  // unirse al código de otro dispositivo: adopta sus datos si existen,
  // o si no existen aún, sube los datos actuales bajo ese código.
  async joinCode(code) {
    this.setCode(code);
    const remote = await this.pull();
    if (remote) {
      Store.state = remote.state;
      Store.save(true);
    } else {
      await this.push(Store.state);
    }
  },
};
