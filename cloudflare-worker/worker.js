// ============================================================
// PROXY DE MERCADONA — Cloudflare Worker
// ============================================================
// Reenvía peticiones GET de solo lectura a la API interna de
// tienda.mercadona.es (categorías y fichas de producto) y añade las
// cabeceras CORS que Mercadona no da, para que Fig & Sparrow pueda
// llamarla desde el navegador.
//
// Solo deja pasar los dos tipos de ruta que el buscador necesita
// (categorías y productos); cualquier otra cosa se rechaza. Cachea
// cada respuesta 30 minutos en el borde de Cloudflare para no
// machacar la API de Mercadona con búsquedas repetidas.
//
// Instrucciones de despliegue en mercadona-config.js.

const RUTAS_PERMITIDAS = ["/api/categories", "/api/products"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const permitido =
      request.method === "GET" && RUTAS_PERMITIDAS.some((p) => url.pathname.startsWith(p));

    if (!permitido) {
      return new Response("Ruta no permitida", { status: 403, headers: CORS_HEADERS });
    }

    const destino = "https://tienda.mercadona.es" + url.pathname + url.search;

    const respuesta = await fetch(destino, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });

    const cuerpo = await respuesta.text();

    return new Response(cuerpo, {
      status: respuesta.status,
      headers: Object.assign(
        { "Content-Type": respuesta.headers.get("Content-Type") || "application/json" },
        CORS_HEADERS
      ),
    });
  },
};
