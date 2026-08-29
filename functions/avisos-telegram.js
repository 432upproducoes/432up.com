export async function onRequest(context) {

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  if (context.request.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "432UP Telegram",
        status: "online"
      }),
      {
        status: 200,
        headers
      }
    );
  }

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

  const BOT_TOKEN =
    "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";

  const CHAT_ID = "8996965457";

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
          text: "🔥 TESTE 432UP — conexão Telegram funcionando!"
        })
      }
    );

    const telegramText = await telegramResponse.text();

    return new Response(
      JSON.stringify({
        ok: telegramResponse.ok,
        telegram_status: telegramResponse.status,
        telegram_response: telegramText
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Erro ao chamar Telegram",
        detail: error.message
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
