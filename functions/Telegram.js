export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  try {
    const data = await context.request.json();
    
    const BOT_TOKEN = "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";
    const CHAT_ID = "8996965457";

    let texto = "";

    switch (data.event) {
      case "solicitacao_saque":
        texto = `💸 *SOLICITAÇÃO DE SAQUE PIX*\n\n` +
                `👤 *Parceiro:* ${data.parceiro_nome || 'Não informado'}\n` +
                `💰 *Valor Solicitado:* R$ ${data.valor_saque || '0,00'}\n` +
                `🔑 *Chave PIX:* ${data.chave_pix || 'Não informada'}\n` +
                `📋 *Contrato:* #${data.proposta_id || 'N/A'} — ${data.cliente_nome || 'N/A'}\n` +
                `⏳ *Status:* Aguardando seu pagamento no Admin`;
        break;

      case "novo_colaborador":
        texto = `👤 *NOVO COLABORADOR AGUARDANDO LIBERAÇÃO*\n\n` +
                `🏷️ *Nome:* ${data.parceiro_nome || 'Não informado'}\n` +
                `📧 *E-mail:* ${data.email || 'Não informado'}\n` +
                `📱 *Contato:* ${data.telefone || 'Não informado'}\n` +
                `🆔 *Documento:* ${data.cpf_cnpj || 'Não informado'}\n` +
                `⚡ *Ação requerida:* Acessar o Admin para aprovar o acesso`;
        break;

      case "nova_proposta_hold":
        texto = `⚡ *NOVA PROPOSTA EM ANÁLISE (HOLD)*\n\n` +
                `💼 *Vendedor/Parceiro:* ${data.vendedor_nome || 'Não informado'}\n` +
                `🎯 *Cliente:* ${data.cliente_nome || 'Não informado'}\n` +
                `📊 *Valor Total:* R$ ${data.valor_total || '0,00'}\n` +
                `🔖 *Proposta:* #${data.proposta_id || 'N/A'}\n` +
                `⏳ *Ação requerida:* Aprovação pendente no Admin`;
        break;

      case "baixa_pix":
        texto = `⚠️ *ALERTA DE PENDÊNCIA PIX / SOLICITAÇÃO*\n\n` +
                `👤 *Parceiro:* ${data.parceiro_nome || 'Não informado'}\n` +
                `💵 *Valor:* R$ ${data.valor_pago || '0,00'}\n` +
                `🔑 *Chave PIX:* ${data.chave_pix || 'Não informada'}\n` +
                `📄 *Referência:* Proposta #${data.proposta_id || 'N/A'}`;
        break;

      default:
        // Lead direto do site
        texto = `📣 *NOVO LEAD NA 432UP!*\n\n` +
                `👤 *Nome:* ${data.nome || 'Não informado'}\n` +
                `📞 *Contato:* ${data.telefone || 'Não informado'}\n` +
                `📝 *Detalhes:* ${data.mensagem || 'Nenhum'}`;
        break;
    }

    const resTelegram = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texto,
        parse_mode: 'Markdown'
      })
    });

    const resBody = await resTelegram.text();

    return new Response(resBody, {
      status: resTelegram.status,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }
}
