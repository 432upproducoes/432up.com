export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // TESTE PELO NAVEGADOR
  if (context.request.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "432UP Telegram",
        status: "online",
        route: "/avisos-telegram"
      }),
      {
        status: 200,
        headers
      }
    );
  }

  // CORS
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  // Por enquanto, POST apenas devolve o que recebeu.
  // NÃO vamos chamar Telegram ainda.
  if (context.request.method === "POST") {
    let data;

    try {
      data = await context.request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "JSON inválido ou ausente",
          detail: err.message
        }),
        {
          status: 400,
          headers
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        received: data
      }),
      {
        status: 200,
        headers
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "Method Not Allowed"
    }),
    {
      status: 405,
      headers
    }
  );
}
