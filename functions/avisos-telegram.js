export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // ==========================================================
  // CORS
  // ==========================================================
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  // ==========================================================
  // TESTE GET
  // https://www.432up.com/avisos-telegram
  // ==========================================================
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

  // ==========================================================
  // ACEITA SOMENTE POST
  // ==========================================================
  if (context.request.method !== "POST") {
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

  try {
    // ========================================================
    // RECEBE JSON
    // ========================================================
    let data;

    try {
      data = await context.request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "JSON inválido ou ausente",
          detail: err?.message || "Erro ao ler JSON"
        }),
        {
          status: 400,
          headers
        }
      );
    }

    // ========================================================
    // MESMAS CREDENCIAIS DO dispararLeadTelegram()
    // ========================================================
    const BOT_TOKEN =
      "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";

    const CHAT_ID = "8996965457";

    // ========================================================
    // DADOS DO LEAD
    // ========================================================
    const nome = data.nome || "Não informado";
    const telefone = data.telefone || "Não informado";
    const mensagem = data.mensagem || "Nenhuma";

    // ========================================================
    // MESMA MENSAGEM DO FORMULÁRIO ANTIGO
    // ========================================================
    const texto =
      `🔥 *NOVO LEAD NA 432UP!*\n\n` +
      `👤 *Nome:* ${nome}\n` +
      `📞 *Contato:* ${telefone}\n` +
      `💬 *Detalhes:* ${mensagem}`;

    // ========================================================
    // ENVIA PARA TELEGRAM
    // ========================================================
    const telegramURL =
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texto,
        parse_mode: "Markdown"
      })
    });

    const telegramResponse = await response.text();

    // ========================================================
    // RETORNA RESULTADO REAL DO TELEGRAM
    // ========================================================
    return new Response(
      JSON.stringify({
        ok: response.ok,
        telegram_status: response.status,
        telegram_response: telegramResponse
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (err) {

    console.error("[432UP avisos-telegram]", err);

    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Erro interno"
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
