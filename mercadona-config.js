// ============================================================
// CONFIGURACIÓN DEL BUSCADOR DE MERCADONA
// ============================================================
// El buscador pega contra la API interna de tienda.mercadona.es, que
// no admite peticiones directas desde otra web (CORS). Por eso hace
// falta un proxy propio y gratuito: un Cloudflare Worker que reenvía
// las peticiones y añade las cabeceras necesarias.
//
// Si lo dejas vacío tal cual está, el buscador simplemente no
// aparece y el resto de la app sigue funcionando igual.
//
// Cómo montarlo (~5 minutos, gratis):
//
// 1. Crea una cuenta en https://dash.cloudflare.com/ (o entra si ya
//    tienes una).
// 2. En el menú, ve a "Workers & Pages" → "Create" → "Create Worker".
//    Ponle un nombre, por ejemplo "mercadona-proxy".
// 3. Pulsa "Edit code" y sustituye TODO el contenido por el de
//    cloudflare-worker/worker.js (está en este mismo repo). Guarda y
//    despliega ("Deploy").
// 4. Copia la URL que te da Cloudflare, algo como
//    https://mercadona-proxy.tu-usuario.workers.dev
// 5. Pégala aquí abajo, entre comillas:

const MERCADONA_CONFIG = {
  proxyUrl: "https://mercadona-proxy.lorenahc123.workers.dev",
};
