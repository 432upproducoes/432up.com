export async function onRequest(context) {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "432UP Telegram",
      status: "online"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
