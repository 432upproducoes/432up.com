export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    
    // Credenciais oficiais e validadas
    const BOT_TOKEN = "8835958314:AAFGe18Mxm7Z_P_GIRPPRzv8cUWb17mHX00";
    const CHAT_ID = "8996965457";

    const texto = `🔥 *NOVO LEAD NA 432UP!*\n\n` +
                  `👤 *Nome:* ${data.nome || 'Não informado'}\n` +
                  `📞 *Contato:* ${data.telefone || 'Não informado'}\n` +
                  `💬 *Detalhes:* ${data.mensagem || 'Nenhum'}`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texto,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(JSON.stringify({ error: errBody }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
