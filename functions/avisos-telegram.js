export async function onRequest() {

  const BOT_TOKEN =
    "8835958314:AAFGe18mXm7Z_P_GlRPPRzv8cUWb17mHX00";

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    );

    const text = await response.text();

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
