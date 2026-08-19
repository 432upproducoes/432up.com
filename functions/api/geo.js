// functions/api/geo.js
//
// Endpoint que devolve a cidade/região do visitante usando a geolocalização
// que o Cloudflare já detecta na borda da rede (request.cf), sem depender
// de nenhum serviço externo. Chamado pelo tracker.js antes de gravar a sessão.

export async function onRequest(context) {
  const { request } = context;

  // Trata requisição Preflight (CORS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const cf = request.cf || {};

  const data = {
    city: cf.city || null,
    // regionCode é a sigla (ex: "SP"); region é o nome por extenso.
    // Preferimos a sigla por já ser o formato usado no dashboard hoje.
    region: cf.regionCode || cf.region || null,
    country: cf.country || null,
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      // Cache curto: a localização não muda a cada request, mas cada
      // visitante é diferente, então não convém cachear no edge por muito tempo.
      "Cache-Control": "no-store",
    },
  });
}
