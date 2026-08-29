export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
  // https://432up.com/Telegram
  // ==========================================================
  if (context.request.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "432UP Telegram Bridge",
        status: "online",
        route: "/Telegram"
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
          error: "JSON inválido ou ausente."
        }),
        {
          status: 400,
          headers
        }
      );
    }

    // ========================================================
    // CREDENCIAIS TELEGRAM
    // ========================================================
    const BOT_TOKEN =
      "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";

    const CHAT_ID = "8996965457";

    // ========================================================
    // MONTA MENSAGEM
    // ========================================================
    let texto = "";

    switch (data.event) {

      // ------------------------------------------------------
      // SOLICITAÇÃO DE SAQUE
      // ------------------------------------------------------
      case "solicitacao_saque":

        texto =
          `💸 *SOLICITAÇÃO DE SAQUE PIX*\n\n` +
          `👤 *Parceiro:* ${data.parceiro_nome || "Não informado"}\n` +
          `💰 *Valor Solicitado:* R$ ${data.valor_saque || "0,00"}\n` +
          `🔑 *Chave PIX:* ${data.chave_pix || "Não informada"}\n` +
          `📋 *Contrato:* #${data.proposta_id || "N/A"} — ${data.cliente_nome || "N/A"}\n` +
          `⏳ *Status:* Aguardando seu pagamento no Admin`;

        break;

      // ------------------------------------------------------
      // NOVO COLABORADOR B2B
      // ------------------------------------------------------
      case "novo_colaborador":

        texto =
          `👤 *NOVO COLABORADOR AGUARDANDO LIBERAÇÃO*\n\n` +
          `🏷️ *Nome:* ${data.parceiro_nome || "Não informado"}\n` +
          `🏢 *Empresa:* ${data.empresa || "Não informada"}\n` +
          `💼 *Perfil:* ${data.perfil || "Não informado"}\n` +
          `📧 *E-mail:* ${data.email || "Não informado"}\n` +
          `📱 *Contato:* ${data.telefone || "Não informado"}\n` +
          `🆔 *Documento:* ${data.cpf_cnpj || "Não informado"}\n\n` +
          `⚡ *Ação requerida:* Acessar o Admin para aprovar o acesso`;

        break;

      // ------------------------------------------------------
      // NOVA PROPOSTA EM HOLD
      // ------------------------------------------------------
      case "nova_proposta_hold":

        texto =
          `⚡ *NOVA PROPOSTA EM ANÁLISE (HOLD)*\n\n` +
          `💼 *Vendedor/Parceiro:* ${data.vendedor_nome || "Não informado"}\n` +
          `🎯 *Cliente:* ${data.cliente_nome || "Não informado"}\n` +
          `📊 *Valor Total:* R$ ${data.valor_total || "0,00"}\n` +
          `🔖 *Proposta:* #${data.proposta_id || "N/A"}\n\n` +
          `⏳ *Ação requerida:* Aprovação pendente no Admin`;

        break;

      // ------------------------------------------------------
      // BAIXA PIX
      // ------------------------------------------------------
      case "baixa_pix":

        texto =
          `⚠️ *ALERTA DE PENDÊNCIA PIX / SOLICITAÇÃO*\n\n` +
          `👤 *Parceiro:* ${data.parceiro_nome || "Não informado"}\n` +
          `💵 *Valor:* R$ ${data.valor_pago || "0,00"}\n` +
          `🔑 *Chave PIX:* ${data.chave_pix || "Não informada"}\n` +
          `📄 *Referência:* Proposta #${data.proposta_id || "N/A"}`;

        break;

      // ------------------------------------------------------
      // LEAD DIRETO
      // ------------------------------------------------------
      default:

        texto =
          `📣 *NOVO LEAD NA 432UP!*\n\n` +
          `👤 *Nome:* ${data.nome || "Não informado"}\n` +
          `📞 *Contato:* ${data.telefone || "Não informado"}\n` +
          `📝 *Detalhes:* ${data.mensagem || "Nenhum"}`;

        break;
    }

    // ========================================================
    // ENVIA PARA TELEGRAM
    // ========================================================
    const telegramURL =
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const resTelegram = await fetch(telegramURL, {
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

    const resBody = await resTelegram.text();

    // ========================================================
    // DEVOLVE RESPOSTA DO TELEGRAM
    // ========================================================
    return new Response(resBody, {
      status: resTelegram.status,
      headers
    });

  } catch (err) {

    console.error("[432UP Telegram Bridge]", err);

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
