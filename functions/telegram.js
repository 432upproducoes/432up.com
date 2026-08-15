export async function onRequest(context) {
  // 1. Libera a segurança do navegador (CORS / Preflight OPTIONS)
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  // 2. Trava para aceitar apenas envios (POST)
  if (context.request.method !== "POST") {
    return new Response("Apenas método POST é permitido", { status: 405 });
  }

  try {
    const data = await context.request.json();
    
    // Credenciais Oficiais
    const BOT_TOKEN = "8835958314:AAFGe18Mxm7Z_P_GlRPPRzv8cUWb17mHX00";
    const CHAT_ID = "8996965457";

    const texto = `🔥 *NOVO LEAD NA 432UP!*\n\n` +
                  `👤 *Nome:* ${data.nome || 'Não informado'}\n` +
                  `📞 *Contato:* ${data.telefone || 'Não informado'}\n` +
                  `💬 *Detalhes:* ${data.mensagem || 'Nenhum'}`;

    const resTelegram = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texto,
        parse_mode: 'Markdown'
      })
    });

    if (!resTelegram.ok) {
      const errText = await resTelegram.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }

    // Retorna Sucesso Total
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
