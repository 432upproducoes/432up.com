export async function onRequest(context) {
  return new Response(
    JSON.stringify({
      ok: true,
      method: context.request.method,
      message: "POST chegou na função!"
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
