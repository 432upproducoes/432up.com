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
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "JSON inválido ou ausente",
        detail: error.message
      }),
      {
        status: 400,
        headers
      }
    );
  }
  // ==========================================================
  // TOKEN 2 — O TOKEN QUE FUNCIONOU
  // ==========================================================
  const BOT_TOKEN =
    "8835958314:AAFGe18Mxm7Z_P_GIRPPRzv8cUWb17mHX00";
  const CHAT_ID = "8996965457";
  // ==========================================================
  // MONTA A MENSAGEM
  // ==========================================================
  let texto = "";
  switch (data.event) {
    // --------------------------------------------------------
    // NOVO COLABORADOR B2B
    // --------------------------------------------------------
    case "novo_colaborador":
      texto =
        `👤 <b>NOVO COLABORADOR B2B</b>\n\n` +
        `🏷️ <b>Nome:</b> ${data.parceiro_nome || "Não informado"}\n` +
        `🏢 <b>Empresa:</b> ${data.empresa || "Não informada"}\n` +
        `💼 <b>Perfil:</b> ${data.perfil || "Não informado"}\n` +
        `📧 <b>E-mail:</b> ${data.email || "Não informado"}\n` +
        `📱 <b>WhatsApp:</b> ${data.telefone || "Não informado"}\n\n` +
        `🟡 <b>Status:</b> Aguardando aprovação no Admin`;
      break;
    // --------------------------------------------------------
    // SOLICITAÇÃO DE SAQUE
    // --------------------------------------------------------
    case "solicitacao_saque":
      texto =
        `💸 <b>SOLICITAÇÃO DE SAQUE PIX</b>\n\n` +
        `👤 <b>Parceiro:</b> ${data.parceiro_nome || "Não informado"}\n` +
        `💰 <b>Valor:</b> R$ ${data.valor_saque || "0,00"}\n` +
        `🔑 <b>Chave PIX:</b> ${data.chave_pix || "Não informada"}\n` +
        `📋 <b>Contrato:</b> #${data.proposta_id || "N/A"} — ${data.cliente_nome || "N/A"}\n\n` +
        `⏳ <b>Status:</b> Aguardando pagamento no Admin`;
      break;
    // --------------------------------------------------------
    // NOVA PROPOSTA EM HOLD
    // --------------------------------------------------------
    case "nova_proposta_hold":
      texto =
        `⚡ <b>NOVA PROPOSTA EM ANÁLISE</b>\n\n` +
        `💼 <b>Vendedor/Parceiro:</b> ${data.vendedor_nome || "Não informado"}\n` +
        `🎯 <b>Cliente:</b> ${data.cliente_nome || "Não informado"}\n` +
        `📊 <b>Valor Total:</b> R$ ${data.valor_total || "0,00"}\n` +
        `🔖 <b>Proposta:</b> #${data.proposta_id || "N/A"}\n\n` +
        `⏳ <b>Status:</b> Aprovação pendente no Admin`;
      break;
    // --------------------------------------------------------
    // BAIXA PIX
    // --------------------------------------------------------
    case "baixa_pix":
      texto =
        `⚠️ <b>ALERTA DE PENDÊNCIA PIX</b>\n\n` +
        `👤 <b>Parceiro:</b> ${data.parceiro_nome || "Não informado"}\n` +
        `💵 <b>Valor:</b> R$ ${data.valor_pago || "0,00"}\n` +
        `🔑 <b>Chave PIX:</b> ${data.chave_pix || "Não informada"}\n` +
        `📄 <b>Referência:</b> Proposta #${data.proposta_id || "N/A"}`;
      break;
    // --------------------------------------------------------
    // LEAD
    // --------------------------------------------------------
    default:
      texto =
        `🔥 <b>NOVO LEAD NA 432UP!</b>\n\n` +
        `👤 <b>Nome:</b> ${data.nome || "Não informado"}\n` +
        `📞 <b>Contato:</b> ${data.telefone || "Não informado"}\n` +
        `💬 <b>Detalhes:</b> ${data.mensagem || "Nenhum"}`;
      break;
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
    const telegramBody = await telegramResponse.text();
    // ========================================================
    // RETORNO PARA O TESTE
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
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Falha ao conectar com o Telegram",
        detail: error.message
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
