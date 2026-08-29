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
        error: "JSON inválido ou ausente."
      }),
      {
        status: 400,
        headers
      }
    );
  }
  // ==========================================================
  // CREDENCIAIS TELEGRAM
  // ==========================================================
  const BOT_TOKEN =
    "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";
  const CHAT_ID =
    "8996965457";
  // ==========================================================
  // IDENTIFICA O TIPO DE AVISO
  // ==========================================================
  let texto = "";
  // ==========================================================
  // NOVO COLABORADOR B2B
  // ==========================================================
  if (data.event === "novo_colaborador") {
    texto =
      `👤 <b>NOVO COLABORADOR AGUARDANDO LIBERAÇÃO</b>\n\n` +
      `🏷️ <b>Nome:</b> ${data.parceiro_nome || "Não informado"}\n` +
      `🏢 <b>Empresa:</b> ${data.empresa || "Não informada"}\n` +
      `💼 <b>Perfil:</b> ${data.perfil || "Não informado"}\n` +
      `📧 <b>E-mail:</b> ${data.email || "Não informado"}\n` +
      `📱 <b>Contato:</b> ${data.telefone || "Não informado"}\n\n` +
      `⚡ <b>Ação requerida:</b> Acessar o Admin para aprovar o acesso`;
  }
  // ==========================================================
  // NOVO LEAD
  // ==========================================================
  else if (data.event === "novo_lead") {
    texto =
      `📣 <b>NOVO LEAD NA 432UP!</b>\n\n` +
      `👤 <b>Nome:</b> ${data.nome || "Não informado"}\n` +
      `📞 <b>Contato:</b> ${data.telefone || "Não informado"}\n` +
      `📝 <b>Detalhes:</b> ${data.mensagem || "Nenhum"}`;
  }
  // ==========================================================
  // SOLICITAÇÃO DE SAQUE
  // ==========================================================
  else if (data.event === "solicitacao_saque") {
    texto =
      `💸 <b>SOLICITAÇÃO DE SAQUE PIX</b>\n\n` +
      `👤 <b>Parceiro:</b> ${data.parceiro_nome || "Não informado"}\n` +
      `💰 <b>Valor Solicitado:</b> R$ ${data.valor_saque || "0,00"}\n` +
      `🔑 <b>Chave PIX:</b> ${data.chave_pix || "Não informada"}\n` +
      `📋 <b>Contrato:</b> #${data.proposta_id || "N/A"} — ${data.cliente_nome || "N/A"}\n` +
      `⏳ <b>Status:</b> Aguardando seu pagamento no Admin`;
  }
  // ==========================================================
  // NOVA PROPOSTA EM HOLD
  // ==========================================================
  else if (data.event === "nova_proposta_hold") {
    texto =
      `⚡ <b>NOVA PROPOSTA EM ANÁLISE (HOLD)</b>\n\n` +
      `💼 <b>Vendedor/Parceiro:</b> ${data.vendedor_nome || "Não informado"}\n` +
      `🎯 <b>Cliente:</b> ${data.cliente_nome || "Não informado"}\n` +
      `📊 <b>Valor Total:</b> R$ ${data.valor_total || "0,00"}\n` +
      `🔖 <b>Proposta:</b> #${data.proposta_id || "N/A"}\n\n` +
      `⏳ <b>Ação requerida:</b> Aprovação pendente no Admin`;
  }
  // ==========================================================
  // BAIXA PIX
  // ==========================================================
  else if (data.event === "baixa_pix") {
    texto =
      `⚠️ <b>ALERTA DE PENDÊNCIA PIX / SOLICITAÇÃO</b>\n\n` +
      `👤 <b>Parceiro:</b> ${data.parceiro_nome || "Não informado"}\n` +
      `💵 <b>Valor:</b> R$ ${data.valor_pago || "0,00"}\n` +
      `🔑 <b>Chave PIX:</b> ${data.chave_pix || "Não informada"}\n` +
      `📄 <b>Referência:</b> Proposta #${data.proposta_id || "N/A"}`;
  }
  // ==========================================================
  // EVENTO NÃO RECONHECIDO
  // ==========================================================
  else {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Evento não reconhecido",
        received_event: data.event || null
      }),
      {
        status: 400,
        headers
      }
    );
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
    // RETORNA RESULTADO
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
    console.error(
      "[432UP Telegram Bridge]",
      err
    );
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Erro ao conectar ao Telegram"
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
