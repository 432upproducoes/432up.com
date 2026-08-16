/* ========== partner-config.js · 432UP Partner · v1.2.1 · 2026-08-16 ========== */
/* Cliente Supabase único do painel B2B. Inclua este script ANTES de
   qualquer outro script de página (login.js, cadastro.js, admin.js etc).
   Depende do CDN @supabase/supabase-js@2 já carregado antes dele. */

var PARTNER_CFG = {
  SB_URL: 'https://paetkspbfejtjjkngqej.supabase.co',
  SB_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA',
  AVATAR_BUCKET: 'avatares-parceiros',
  MATERIAIS_BUCKET: 'materiais-parceiros',
  WHATSAPP_SUPORTE: '5511948564577'
};

var sbPartner = supabase.createClient(PARTNER_CFG.SB_URL, PARTNER_CFG.SB_KEY);

/* ── Helper: monta URL pública do avatar com cache bust opcional ── */
function partnerAvatarUrl(userId, cacheBust) {
  if (!userId) return null;
  var url = PARTNER_CFG.SB_URL + '/storage/v1/object/public/' + PARTNER_CFG.AVATAR_BUCKET + '/' + userId + '/avatar.jpg';
  return cacheBust ? url + '?t=' + Date.now() : url;
}

/* ── Helper: checa sessão e dados do parceiro. Redireciona se não autorizado ── */
function partnerRequireAuth(opts) {
  opts = opts || {};
  return sbPartner.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) {
      window.location.href = 'login.html';
      return Promise.reject('sem sessão');
    }
    return sbPartner
      .from('parceiros')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(function (r) {
        if (r.error || !r.data) {
          console.error('[432UP Partner] Parceiro não encontrado:', r.error);
          window.location.href = 'login.html';
          return Promise.reject('parceiro não encontrado');
        }
        var parceiro = r.data;
        if (parceiro.status === 'pendente' && !opts.allowPendente) {
          window.location.href = 'pendente.html';
          return Promise.reject('pendente de aprovação');
        }
        if (parceiro.status === 'bloqueado' || parceiro.status === 'recusado') {
          sbPartner.auth.signOut();
          window.location.href = 'login.html?erro=acesso_negado';
          return Promise.reject('acesso negado');
        }

        /* TRAVA DE SEGURANÇA: Se a página exigir nível 'admin', bloqueia se for apenas 'partner' */
        if (opts.requireAdmin) {
          var isAdmin = parceiro.role === 'admin' || parceiro.is_admin === true;
          if (!isAdmin) {
            console.warn('[432UP Partner] Acesso negado: Requer perfil Master Admin.');
            window.location.href = '../index.html';
            return Promise.reject('requer admin');
          }
        }

        return parceiro;
      });
  }).catch(function (err) {
    console.error('[432UP Partner] Erro na verificação de auth:', err);
    if (err !== 'sem sessão' && err !== 'pendente de aprovação' && err !== 'acesso negado' && err !== 'requer admin') {
      window.location.href = 'login.html';
    }
    return Promise.reject(err);
  });
}

/* ── Helper: logout padrão ── */
function partnerLogout() {
  sbPartner.auth.signOut().then(function () {
    window.location.href = 'login.html';
  });
}

/* ── Helper: preenche nome + avatar na sidebar e gerencia menus do Admin (BLINDADO) ── */
function partnerFillSidebar(parceiro) {
  if (!parceiro) return;

  /* 1. Nome */
  var nomeEl = document.querySelector('[data-partner-nome]');
  if (nomeEl && parceiro.nome_completo) {
    nomeEl.textContent = parceiro.nome_completo.split(' ')[0];
  }

  /* 2. Avatar */
  var avatarEls = document.querySelectorAll('[data-partner-avatar]');
  var urlAvatar = parceiro.avatar_url || partnerAvatarUrl(parceiro.user_id, true);

  avatarEls.forEach(function (el) {
    if (urlAvatar) {
      if (el.tagName === 'IMG') {
        el.src = urlAvatar;
      } else {
        el.style.backgroundImage = 'url(' + urlAvatar + ')';
      }
    }
  });

  /* 3. Controle Centralizado de Exibição do Master Admin no Menu */
  var isAdmin = parceiro.role === 'admin' || parceiro.is_admin === true;
  
  var elAdminDesk = document.getElementById('navAdminLinkContainer') || document.querySelector('[data-admin-menu-desk]');
  var elAdminMob = document.getElementById('navAdminLinkContainerMobile') || document.querySelector('[data-admin-menu-mob]');

  [elAdminDesk, elAdminMob].forEach(function(el) {
    if (!el) return;
    if (isAdmin) {
      el.style.setProperty('display', 'inline-flex', 'important');
      el.classList.remove('hidden');
    } else {
      el.style.setProperty('display', 'none', 'important');
      el.classList.add('hidden');
    }
  });
}
