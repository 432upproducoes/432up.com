export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // ==========================================================
  // OPTIONS / CORS
  // ==========================================================
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  // ==========================================================
  // GET — TESTE DA ROTA
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
  // SOMENTE POST A PARTIR DAQUI
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

  // ==========================================================
  // RECEBE JSON
  // ==========================================================
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

  // ==========================================================
  // TELEGRAM
  // ==========================================================
  const BOT_TOKEN =
    "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";

  const CHAT_ID = "8996965457";

  // ==========================================================
  // MENSAGEM
  // ==========================================================
  const texto =
    `🔥 *NOVO LEAD NA 432UP!*\n\n` +
    `👤 *Nome:* ${data.nome || "Não informado"}\n` +
    `📞 *Contato:* ${data.telefone || "Não informado"}\n` +
    `💬 *Detalhes:* ${data.mensagem || "Nenhum"}`;

  // ==========================================================
  // ENVIA PARA TELEGRAM
  // ==========================================================
  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: texto,
          parse_mode: "Markdown"
        })
      }
    );

    const telegramBody = await telegramResponse.text();

    // ========================================================
    // DEVOLVE A RESPOSTA REAL DO TELEGRAM
    // ========================================================
    return new Response(
      JSON.stringify({
        ok: telegramResponse.ok,
        telegram_status: telegramResponse.status,
        telegram_response: JSON.parse(telegramBody)
      }),
      {
        status: telegramResponse.ok ? 200 : 502,
        headers
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Falha ao conectar com o Telegram",
        detail: err.message
      }),
      {
        status: 502,
        headers
      }
    );
  }
}
