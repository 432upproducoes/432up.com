export async function onRequestPost(context) {
  try {
    const lead = await context.request.json(); 
    
    const BOT_TOKEN = "SEU_TOKEN_DO_BOTFATHER_AQUI";
    const CHAT_ID = "SEU_ID_DO_USERINFO_AQUI";

    const texto = `🔥 *NOVO LEAD NO SITE!*\n\n` +
                  `👤 *Nome:* ${lead.nome}\n` +
                  `📞 *Telefone:* ${lead.telefone}\n` +
                  `💬 *Mensagem:* ${lead.mensagem}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texto,
        parse_mode: 'Markdown'
      })
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
