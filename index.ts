// supabase/functions/check-admin/index.ts
// Edge Function: valida sessão + confere se o parceiro é admin, tudo no servidor.
// Deploy: supabase functions deploy check-admin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: 'sem_token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Cliente com service_role: bypassa RLS, roda 100% no servidor
    const supabaseAdmin = createClient(SB_URL, SERVICE_ROLE_KEY)

    // Valida o token do usuário e pega o user_id
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, reason: 'token_invalido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id

    // Busca o parceiro e confere role/is_admin
    const { data: parceiro, error: parceiroError } = await supabaseAdmin
      .from('parceiros')
      .select('status, role, is_admin')
      .eq('user_id', userId)
      .single()

    if (parceiroError || !parceiro) {
      return new Response(JSON.stringify({ ok: false, reason: 'parceiro_nao_encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (parceiro.status === 'bloqueado' || parceiro.status === 'recusado') {
      return new Response(JSON.stringify({ ok: false, reason: 'acesso_negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isAdmin = parceiro.role === 'admin' || parceiro.is_admin === true
    if (!isAdmin) {
      return new Response(JSON.stringify({ ok: false, reason: 'requer_admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, reason: 'erro_interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})