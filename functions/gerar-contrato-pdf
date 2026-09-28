// Supabase Edge Function: gerar-contrato-pdf
// Abre a página do contrato em um Chrome sem tela (Browserless) e devolve um PDF A4 exato,
// sem cabeçalho/rodapé de impressão. Salva no Storage e responde com um link temporário.
//
// O contrato é montado a partir da proposta (contrato.html?id=<id da proposta>),
// por isso o id recebido é validado na tabela "propostas".
//
// Secrets necessários (supabase secrets set ...):
//   BROWSERLESS_TOKEN   -> token da conta Browserless (o mesmo já usado na proposta)
//   CONTRATO_URL_BASE   -> URL pública da página do contrato (ex.: https://www.432up.com/B2B/contrato.html)
// Bucket privado necessário no Storage: contratos-pdf
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "contratos-pdf";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      return json({ erro: "id inválido" }, 400);
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Só gera para propostas que existem (o contrato nasce da proposta)
    const { data: prop, error: errProp } = await sb.from("propostas").select("id").eq("id", id).single();
    if (errProp || !prop) return json({ erro: "Proposta não encontrada" }, 404);

    const token = Deno.env.get("BROWSERLESS_TOKEN");
    const base = Deno.env.get("CONTRATO_URL_BASE");
    if (!token || !base) return json({ erro: "Configuração do servidor incompleta" }, 500);

    const alvo = `${base}${base.includes("?") ? "&" : "?"}id=${encodeURIComponent(id)}&pdf=1`;

    const resp = await fetch(`https://production-sfo.browserless.io/pdf?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: alvo,
        gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
        // a página marca body[data-pronto="1"] quando as fontes carregaram e a paginação terminou
        waitForSelector: { selector: 'body[data-pronto="1"]', timeout: 20000 },
        options: {
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: false,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      console.error("Browserless erro:", resp.status, detalhe);
      return json({ erro: "Falha ao gerar o PDF" }, 502);
    }

    const pdf = new Uint8Array(await resp.arrayBuffer());
    const caminho = `${id}.pdf`;

    const { error: errUp } = await sb.storage
      .from(BUCKET)
      .upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
    if (errUp) {
      console.error("Storage erro:", errUp);
      return json({ erro: "Falha ao salvar o PDF" }, 500);
    }

    const { data: link, error: errLink } = await sb.storage.from(BUCKET).createSignedUrl(caminho, 3600);
    if (errLink || !link) return json({ erro: "Falha ao criar o link" }, 500);

    return json({ url: link.signedUrl });
  } catch (e) {
    console.error(e);
    return json({ erro: "Erro inesperado" }, 500);
  }
});
