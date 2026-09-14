// ============================================================
// SYNC — sincroniza Store.state entre dispositivos.
// Usa la API REST de Supabase (PostgREST, sin SDK, sin cuentas de
// usuario): cada grupo de dispositivos comparte un "código de
// sincronización" de 8 caracteres que hace de identificador +
// contraseña dentro de la tabla "syncs".
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
    return !!(SYNC_CONFIG.supabaseUrl && SYNC_CONFIG.supabaseUrl.trim() && SYNC_CONFIG.supabaseAnonKey && SYNC_CONFIG.supabaseAnonKey.trim());
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

  baseUrl() {
    return SYNC_CONFIG.supabaseUrl.replace(/\/$/, "");
  },

  headers(extra) {
    return Object.assign(
      {
        apikey: SYNC_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${SYNC_CONFIG.supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      extra || {}
    );
  },

  async pull() {
    if (!this.isConfigured()) return null;
    const code = this.getCode();
    try {
      const res = await fetch(`${this.baseUrl()}/rest/v1/syncs?code=eq.${code}&select=data,updated_at`, {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const rows = await res.json();
      if (!rows || !rows.length) return null; // todavía no hay nada con este código
      const row = rows[0];
      return { state: row.data, updatedAt: row.updated_at || 0 };
    } catch (e) {
      return null;
    }
  },

  async push(state) {
    if (!this.isConfigured() || !this.isEnabled()) return false;
    const code = this.getCode();
    try {
      this.lastStatus = "syncing";
      const res = await fetch(`${this.baseUrl()}/rest/v1/syncs`, {
        method: "POST",
        headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify([{ code, data: state, updated_at: state.updatedAt || Date.now() }]),
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