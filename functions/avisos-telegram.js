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
  // SOMENTE POST
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
        detail: err?.message || "Erro desconhecido"
      }),
      {
        status: 400,
        headers
      }
    );
  }

  // ==========================================================
  // TOKEN 2 — O TOKEN QUE FUNCIONOU NO TESTE 200
  // ==========================================================

  const BOT_TOKEN =
    "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWbi7mHX00";

  const CHAT_ID = "8996965457";

  // ==========================================================
  // MONTA MENSAGEM
  // ==========================================================

  const nome =
    data.nome ||
    data.parceiro_nome ||
    data.nome_completo ||
    "Não informado";

  const empresa =
    data.empresa ||
    "Não informada";

  const perfil =
    data.perfil ||
    "Não informado";

  const email =
    data.email ||
    "Não informado";

  const telefone =
    data.telefone ||
    data.whatsapp ||
    "Não informado";

  const mensagem =
    data.mensagem ||
    "Novo aviso recebido pelo sistema 432UP.";

  let texto;

  // ==========================================================
  // NOVO PARCEIRO B2B
  // ==========================================================

  if (
    data.event === "novo_colaborador" ||
    data.event === "novo_parceiro" ||
    data.origem === "b2b_partner"
  ) {

    texto =
      `🤝 <b>NOVO PARCEIRO B2B</b>\n\n` +
      `👤 <b>Nome:</b> ${nome}\n` +
      `🏢 <b>Empresa:</b> ${empresa}\n` +
      `💼 <b>Perfil:</b> ${perfil}\n` +
      `📧 <b>E-mail:</b> ${email}\n` +
      `📱 <b>WhatsApp:</b> ${telefone}\n\n` +
      `🟡 <b>Status:</b> Aguardando aprovação no Admin`;

  } else {

    // ========================================================
    // LEAD NORMAL
    // ========================================================

    texto =
      `🔥 <b>NOVO LEAD NA 432UP!</b>\n\n` +
      `👤 <b>Nome:</b> ${nome}\n` +
      `📞 <b>Contato:</b> ${telefone}\n` +
      `💬 <b>Detalhes:</b> ${mensagem}`;
  }

  // ==========================================================
  // ENVIA PARA TELEGRAM
  // ==========================================================

  const telegramURL =
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {

    const telegramResponse = await fetch(
      telegramURL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: texto,
          parse_mode: "HTML"
        })
      }
    );

    const telegramBody =
      await telegramResponse.text();

    // ========================================================
    // RETORNA RESULTADO COMPLETO
    // ========================================================

    return new Response(
      JSON.stringify({
        ok: telegramResponse.ok,
        telegram_status: telegramResponse.status,
        telegram_response: telegramBody
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Falha ao conectar com Telegram",
        detail: err?.message || "Erro desconhecido"
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
