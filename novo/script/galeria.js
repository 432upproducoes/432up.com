<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <!-- Google Analytics GA4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-7SWNCP1NV6"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-7SWNCP1NV6');
  </script>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="version" content="Enterprise-1.2.2-Perfect">
  
  <meta name="theme-color" content="#08080A">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <link class="js-site-favicon" rel="icon" type="image/png" href="imagens/favicon.png">
  <title>Memórias Visuais & Portfólio | 432UP! Produções</title>
  <meta name="description" content="Crônicas visuais, registros de alta performance e bastidores de engenharia audiovisual para eventos de alto padrão.">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

  <!-- CSS Único e Modular -->
  <link rel="stylesheet" href="css/style.css">
  
  <!-- Scripts Desacoplados -->
  <script src="script/script.js" defer></script>
  <script src="script/galeria.js" defer></script>

  <!-- Ajustes exclusivos desta página (não alteram o css/style.css compartilhado) -->
  <style>
    /* Trava o "elástico" (bounce) do Safari no topo/rodapé, que estava
       revelando uma fresta transparente sobre o header ao puxar além do topo */
    html, body { overscroll-behavior-y: none; }

    /* Folga extra pro rodapé fixo não sobrepor a última fileira de cards */
    .masonry-gallery { padding-bottom: 140px; }

    /* ================================================================
       COLUNAS DA GALERIA — duas opções, alterne comentando/descomentando

       OPÇÃO 1 (ATIVA agora): 4 colunas no tablet, 5 no notebook
       OPÇÃO 2 (ORIGINAL, 3 colunas fixas): descomente o bloco abaixo e
       comente o bloco da OPÇÃO 1 pra voltar como estava antes.
       ================================================================ */

    /* OPÇÃO 1 — ATIVA: 4 colunas (tablet ~10") / 5 colunas (notebook 15")
    @media (min-width: 900px) and (max-width: 1299px) {
      .masonry-gallery { grid-template-columns: repeat(4, 1fr); }
    }
    @media (min-width: 1300px) {
      .masonry-gallery { max-width: 1400px; grid-template-columns: repeat(5, 1fr); }
    } */

    /* OPÇÃO 2 — ORIGINAL (3 colunas fixas), hoje desativada:  */
    @media (min-width: 900px) {
      .masonry-gallery { max-width: 1200px; grid-template-columns: repeat(3, 1fr); }
    }
   

  </style>
</head>
<body>

  <canvas id="orbit-canvas"></canvas>

  <div class="viewport-wrapper">
    <header>
      <div class="logo-container">
        <a href="index.html" class="logo-link" aria-label="Página Inicial 432UP">
          <img src="imagens/logo.png" alt="432UP! Produções" class="logo-img">
        </a>
      </div>

      <nav class="desktop-nav">
        <a href="index.html">Início</a>
        <a href="calculadora.html">Simulador de Atmosfera</a>
        <a href="galeria.html" class="active">Memórias</a>
        <a id="nav-trigger-modal">Contato</a>
      </nav>

      <button class="mobile-hamburger" id="mobile-menu-btn" aria-label="Abrir Menu">☰</button>
    </header>

    <div class="mobile-menu-overlay" id="mobile-menu">
      <button id="mobile-menu-close" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>
      <a href="index.html">Início</a>
      <a href="calculadora.html">Simulador de Atmosfera</a>
      <a href="galeria.html" class="active">Memórias</a>
      <a id="nav-trigger-modal-mobile">Contato</a>
    </div>

    <section class="gallery-hero">
      <span class="tagline">Registros & Bastidores</span>
      <h1>Crônicas <span>Visuais</span></h1>
      <p>Uma imersão estética pelos nossos projetos, cenografias e entregas de alta fidelidade técnica.</p>

      <div class="filter-wrapper">
        <button class="filter-btn active" data-cat="all">Ver Todas</button>
      </div>
    </section>

    <main class="masonry-gallery" id="main-gallery-grid"></main>
  </div>

  <footer>
    <p>© 2026 432UP! Produções — Curadoria Artística e Engenharia Estrutural</p>
  </footer>

  <!-- POP-UP MODAL DE CONTATO -->
  <div class="contact-modal-overlay" id="contact-overlay">
    <div class="contact-modal">
      <button class="contact-modal-close" id="contact-modal-close-btn">&times;</button>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px; color: #FFF;">Qual o melhor número e horário para te ligarmos?</h3>
      <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 14px;">Informe seus dados para a mesa de produção retornar.</p>

      <div class="modal-channels-row">
        <a href="https://wa.me/5511948564577" class="channel-mini-card" target="_blank">
          <span style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase;">WhatsApp Direct</span>
          <strong style="display: block; font-size: 0.8rem; margin-top: 2px; color: #FFF;">(11) 94856-4577</strong>
        </a>
        <a href="mailto:contato@432up.com" class="channel-mini-card">
          <span style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase;">E-mail Interno</span>
          <strong style="display: block; font-size: 0.8rem; margin-top: 2px; color: #FFF;">contato@432up.com</strong>
        </a>
      </div>

      <div class="modal-form-divider">Ou agende o retorno</div>

      <div>
        <div class="form-group">
          <label for="mod-name">Seu nome ou empresa</label>
          <input type="text" id="mod-name" placeholder="Ex: Roberto Silva">
        </div>
        <div class="form-group">
          <label for="mod-phone">Telefone / WhatsApp</label>
          <input type="tel" id="mod-phone" placeholder="(11) 99999-9999" inputmode="numeric" maxlength="15">
          <span class="field-hint" id="mod-phone-error">Informe um telefone válido com DDD.</span>
        </div>
        <div class="form-group">
          <label for="mod-email">E-mail <span class="optional-tag">(opcional)</span></label>
          <input type="email" id="mod-email" placeholder="contato@empresa.com">
          <span class="field-hint" id="mod-email-error">Informe um e-mail válido.</span>
        </div>
        <div class="form-group">
          <label for="mod-msg">Melhor horário ou detalhes <span class="optional-tag">(opcional)</span></label>
          <textarea id="mod-msg" placeholder="Qual o melhor horário para ligarmos..."></textarea>
        </div>
        <button class="btn-internal-send" id="btn-submit-general-contact">Solicitar Ligação</button>
      </div>
    </div>
  </div>
</body>
</html>
