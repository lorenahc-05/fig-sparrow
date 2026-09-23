// ============================================================
// MERCADONA — buscador de productos reales con foto + nutrición
// ============================================================
// Todo pasa por el proxy de mercadona-config.js: las fotos, nombres y
// precios son tal cual los de Mercadona. Mercadona NO publica kcal ni
// macros en su API (solo ingredientes/alérgenos como texto), así que
// las macros se buscan aparte en Open Food Facts por código de
// barras (EAN) del producto — no por nombre, para no mezclar datos de
// un producto distinto que se llame parecido.
//
// Catálogo cacheado en localStorage 24h: la app recorre las ~26
// categorías de nivel superior una vez y guarda todos los productos
// que traen (con subcategorías anidadas incluidas) para poder buscar
// al vuelo sin depender de un endpoint de búsqueda de Mercadona.

const Mercadona = {
  CACHE_CATALOGO: "fns_mercadona_catalogo_v1",
  CACHE_DETALLE_PREFIJO: "fns_mercadona_detalle_v2_", // v2: añade photos/photoEtiqueta a la ficha
  CACHE_NUTRICION_PREFIJO: "fns_mercadona_nutricion_",
  TTL_CATALOGO: 24 * 60 * 60 * 1000,
  TTL_DETALLE: 24 * 60 * 60 * 1000,
  TTL_NUTRICION: 7 * 24 * 60 * 60 * 1000,

  isConfigured() {
    return !!(MERCADONA_CONFIG.proxyUrl && MERCADONA_CONFIG.proxyUrl.trim());
  },

  _proxyBase() {
    return MERCADONA_CONFIG.proxyUrl.replace(/\/$/, "");
  },

  async _getJSON(path) {
    const res = await fetch(this._proxyBase() + path);
    if (!res.ok) throw new Error("Mercadona proxy HTTP " + res.status);
    return res.json();
  },

  _normaliza(s) {
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  },

  _leerCache(key, ttl) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { t, data } = JSON.parse(raw);
      if (Date.now() - t > ttl) return null;
      return data;
    } catch (e) {
      return null;
    }
  },

  _escribirCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
    } catch (e) {
      // localStorage lleno o bloqueado: sin caché, no pasa nada grave.
    }
  },

  _recolectaProductos(nodo, out) {
    if (Array.isArray(nodo.products)) {
      for (const p of nodo.products) {
        out.push({
          id: p.id,
          name: p.display_name,
          thumbnail: p.thumbnail,
          price: p.price_instructions ? p.price_instructions.unit_price : null,
          packaging: p.packaging || "",
        });
      }
    }
    if (Array.isArray(nodo.categories)) {
      for (const c of nodo.categories) this._recolectaProductos(c, out);
    }
  },

  /** Descarga (o recupera de caché) el catálogo completo aplanado. */
  async catalogoCompleto(forzarRefresco) {
    if (!forzarRefresco) {
      const cache = this._leerCache(this.CACHE_CATALOGO, this.TTL_CATALOGO);
      if (cache) return cache;
    }

    const raiz = await this._getJSON("/api/categories/");

    // La raíz solo da "pasillos" (nivel 0) que agrupan categorías de
    // nivel 1; esas categorías de nivel 1 son las que de verdad se
    // pueden consultar y las que traen productos (o subcategorías de
    // nivel 2 con productos dentro).
    const idsNivel1 = [];
    for (const grupo of raiz.results || []) {
      for (const sub of grupo.categories || []) idsNivel1.push(sub.id);
    }

    const items = [];
    await Promise.all(
      idsNivel1.map(async (id) => {
        try {
          const detalle = await this._getJSON("/api/categories/" + id + "/");
          this._recolectaProductos(detalle, items);
        } catch (e) {
          // Si falla una categoría seguimos con las demás; mejor un
          // catálogo incompleto que ninguno.
        }
      })
    );

    const vistos = new Set();
    const sinDuplicados = items.filter((p) => {
      if (vistos.has(p.id)) return false;
      vistos.add(p.id);
      return true;
    });

    this._escribirCache(this.CACHE_CATALOGO, sinDuplicados);
    return sinDuplicados;
  },

  /** Busca por nombre (todas las palabras deben aparecer). */
  async buscar(query, limite) {
    const catalogo = await this.catalogoCompleto();
    const terminos = this._normaliza(query).split(/\s+/).filter(Boolean);
    if (!terminos.length) return [];

    return catalogo
      .filter((p) => {
        const nombre = this._normaliza(p.name);
        return terminos.every((t) => nombre.includes(t));
      })
      .slice(0, limite || 20);
  },

  /** Ficha completa de un producto (foto grande, EAN, ingredientes). */
  async detalle(id) {
    const key = this.CACHE_DETALLE_PREFIJO + id;
    const cache = this._leerCache(key, this.TTL_DETALLE);
    if (cache) return cache;

    const data = await this._getJSON("/api/products/" + id + "/");
    const listaFotos = Array.isArray(data.photos) ? data.photos : [];
    const fotos = listaFotos.map((f) => f.regular).filter(Boolean);
    // La foto con perspective:9 es casi siempre el reverso del envase, con la
    // tabla de información nutricional — la ponemos primero si existe.
    const fotoEtiqueta = listaFotos.find((f) => f.perspective === 9);
    const info = {
      id: data.id,
      name: data.display_name,
      brand: data.brand || "",
      ean: data.ean || "",
      photo: fotos[0] || null,
      photos: fotos, // todas las fotos de la ficha, para poder comprobar la etiqueta a ojo
      photoEtiqueta: fotoEtiqueta ? fotoEtiqueta.regular : null,
      ingredients: data.nutrition_information ? data.nutrition_information.ingredients || "" : "",
      allergens: data.nutrition_information ? data.nutrition_information.allergens || "" : "",
      shareUrl: data.share_url || "",
    };

    this._escribirCache(key, info);
    return info;
  },

  /**
   * Macros por 100g. Si el usuario ya corrigió este EAN a mano (tras
   * comparar con la foto de la etiqueta), esa corrección manda siempre
   * sobre Open Food Facts.
   */
  async nutricionPorEan(ean) {
    if (!ean) return null;

    if (typeof Store !== "undefined") {
      const correccion = Store.getNutritionCorrection(ean);
      if (correccion) return correccion;
    }

    const key = this.CACHE_NUTRICION_PREFIJO + ean;
    const cache = this._leerCache(key, this.TTL_NUTRICION);
    if (cache) return cache.encontrado ? cache.info : null;

    let resultado = { encontrado: false, info: null };
    try {
      const res = await fetch(
        "https://world.openfoodfacts.org/api/v2/product/" +
          encodeURIComponent(ean) +
          ".json?fields=product_name,nutriments"
      );
      if (res.ok) {
        const body = await res.json();
        const n = body.product && body.product.nutriments;
        if (body.status === 1 && n && n["energy-kcal_100g"] != null) {
          resultado = {
            encontrado: true,
            info: {
              kcalPer100: Math.round(n["energy-kcal_100g"]),
              proteinPer100: n.proteins_100g != null ? Math.round(n.proteins_100g * 10) / 10 : null,
              carbsPer100: n.carbohydrates_100g != null ? Math.round(n.carbohydrates_100g * 10) / 10 : null,
              fatPer100: n.fat_100g != null ? Math.round(n.fat_100g * 10) / 10 : null,
            },
          };
        }
      }
    } catch (e) {
      return null; // sin caché: puede ser un fallo de red puntual, reintentar la próxima vez.
    }

    this._escribirCache(key, resultado);
    return resultado.encontrado ? resultado.info : null;
  },

  /** Ficha + macros en una sola llamada, para la pantalla de selección. */
  async productoCompleto(id) {
    const ficha = await this.detalle(id);
    const nutricion = await this.nutricionPorEan(ficha.ean);
    return Object.assign({}, ficha, {
      kcalPer100: nutricion ? nutricion.kcalPer100 : null,
      proteinPer100: nutricion ? nutricion.proteinPer100 : null,
    });
  },
};
