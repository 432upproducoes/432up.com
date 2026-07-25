/* ========== 432UP CORE v2.6.3 — 2026-03-05 ========== */
(function(){
  'use strict';

  var C = window.CONFIG_432UP || window.C;
  if (!C) { console.error('[432UP] Config não carregado!'); return; }

  function sbHeaders() {
    return {
      'apikey': C.supabase.key,
      'Authorization': 'Bearer ' + C.supabase.key,
      'Content-Type': 'application/json'
    };
  }

  async function sbGet(table, query) {
    try {
      var url = C.supabase.url + '/rest/v1/' + table + '?' + (query || '');
      var r = await fetch(url, { headers: sbHeaders() });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.error('[sbGet]', table, e);
      return null;
    }
  }

  async function sbPost(table, body) {
    try {
      var r = await fetch(C.supabase.url + '/rest/v1/' + table, {
        method: 'POST',
        headers: {
          'apikey':        C.supabase.key,
          'Authorization': 'Bearer ' + C.supabase.key,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        var txt = await r.text();
        console.error('[sbPost] Erro ' + r.status + ' em ' + table + ':', txt);
      } else {
        console.log('[sbPost] OK → ' + table);
      }
      return r;
    } catch (e) {
      console.error('[sbPost] Falha rede:', e);
      return null;
    }
  }

  async function loadContatos() {
    try {
      var res = await sbGet('co_configuracoes', 'select=valor&id=eq.1');
      if (res && res[0] && res[0].valor && res[0].valor.contatos) {
        var contatos = res[0].valor.contatos;
        C.contatos.whatsapp  = contatos.whatsapp  || C.fallback.whatsapp;
        C.contatos.instagram = contatos.instagram || C.fallback.instagram;
        C.contatos.email     = contatos.email     || C.fallback.email;
      } else {
        throw new Error('Estrutura inválida');
      }
    } catch (e) {
      console.warn('[432UP] Fallback contatos:', e.message);
      C.contatos.whatsapp  = C.fallback.whatsapp;
      C.contatos.instagram = C.fallback.instagram;
      C.contatos.email     = C.fallback.email;
    }
    applyContatosToDom();
  }

  function applyContatosToDom() {
    var wa    = C.contatos.whatsapp;
    var insta = C.contatos.instagram;
    var email = C.contatos.email;

    var fab = C.$('#fabWa') || C.$('#fabWA');
    if (fab) {
      fab.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Olá! Vi o site da 432UP e gostaria de saber mais sobre os serviços.');
    }
    var footerWa = C.$('footer a[href*="wa.me"]');
    if (footerWa) footerWa.href = 'https://wa.me/' + wa;

    var footerIg = C.$('#footerIg') || C.$('footer a[href*="instagram"]');
    if (footerIg) footerIg.href = 'https://instagram.com/' + insta.replace('@','');

    var contactWA = C.$('#contactWA');
    if (contactWA) {
      contactWA.addEventListener('click', function(e){
        e.preventDefault();
        window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent('Olá! Vim pela calculadora do site.'), '_blank');
      });
    }
    var contactEmail = C.$('#contactEmail');
    if (contactEmail) contactEmail.href = 'mailto:' + email;
  }

  var _sysTheme = (matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark');

  function applyThemeAutoFromSystem() {
    if (document.documentElement.dataset.themeFixed === '1') return;
    document.documentElement.dataset.theme = _sysTheme;
    var el = C.$('#dTheme');
    if (el) el.textContent = _sysTheme;
  }

  matchMedia('(prefers-color-scheme:light)').addEventListener('change', function(e){
    _sysTheme = e.matches ? 'light' : 'dark';
    applyThemeAutoFromSystem();
  });

  applyThemeAutoFromSystem();

  function toggleMotion() {
    var html = document.documentElement;
    var on = html.dataset.motion === 'on';
    html.dataset.motion = on ? 'off' : 'on';
    var btn = C.$('#btnMotion');
    if (btn) btn.textContent = 'MOTION ' + (on ? 'OFF' : 'ON');
  }

  function toggleNav() {
    var nav = C.$('#mainNav');
    var overlay = C.$('#navOverlay');
    if (nav) nav.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  }

  function closeNav() {
    var nav = C.$('#mainNav');
    var overlay = C.$('#navOverlay');
    if (nav) nav.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  function toast(msg, type) {
    var t = document.createElement('div');
    t.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);z-index:10002;' +
      'background:rgba(18,18,30,.85);border:1.5px solid rgba(255,255,255,.1);border-radius:16px;' +
      'padding:18px 32px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' +
      'box-shadow:0 8px 32px rgba(0,0,0,.4);color:#e8e8ed;font-family:Inter,system-ui,sans-serif;' +
      'font-size:.9rem;font-weight:500;text-align:center;max-width:90vw;opacity:0;' +
      'transition:all .3s cubic-bezier(.4,0,.2,1);pointer-events:none';
    if (document.documentElement.dataset.theme === 'light') {
      t.style.background = 'rgba(255,255,255,.88)';
      t.style.color = '#1a1a1e';
      t.style.border = '1.5px solid rgba(0,0,0,.08)';
    }
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        t.style.opacity = '1';
        t.style.transform = 'translate(-50%,-50%) scale(1)';
      });
    });
    setTimeout(function(){
      t.style.opacity = '0';
      t.style.transform = 'translate(-50%,-50%) scale(.9)';
      setTimeout(function(){ t.remove(); }, 300);
    }, 3000);
  }

  var fpsTimes = [];
  function fpsLoop(now) {
    fpsTimes.push(now);
    while (fpsTimes.length > 0 && fpsTimes[0] < now - 1000) fpsTimes.shift();
    var fps = fpsTimes.length;
    var el = C.$('#dFps');
    if (el) {
      el.textContent = fps;
      el.className = fps >= 50 ? 'g' : fps >= 30 ? 'y' : 'r';
    }
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  function phoneMask(input) {
    if (!input) return;
    input.addEventListener('input', function(){
      var v = input.value.replace(/\D/g,'').slice(0,11);
      if (v.length > 6) v = '('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
      else if (v.length > 2) v = '('+v.slice(0,2)+') '+v.slice(2);
      input.value = v;
    });
  }

  (function(){
    function bars(){
      var arr=[];
      var a=document.getElementById('debugBar'); if(a) arr.push(a);
      var b=document.getElementById('dbgBar');   if(b && arr.indexOf(b)<0) arr.push(b);
      document.querySelectorAll('.debug-bar').forEach(function(x){
        if(arr.indexOf(x)<0) arr.push(x);
      });
      return arr;
    }
    function rememberDisplay(el){
      if(!el||!el.dataset) return;
      if(!el.dataset.dbgDisplay){
        var d=(window.getComputedStyle?getComputedStyle(el).display:el.style.display)||'';
        if(!d||d==='none') d=(el.classList&&el.classList.contains('debug-bar'))?'flex':'block';
        el.dataset.dbgDisplay=d;
      }
    }
    function setOn(on){
      var list=bars();
      list.forEach(function(el){
        rememberDisplay(el);
        if(on){el.classList.add('is-on');el.style.display=el.dataset.dbgDisplay||'';}
        else{el.classList.remove('is-on');el.style.display='none';}
      });
    }
    function boot(){
      setOn(false);
      document.addEventListener('keydown',function(e){
        if(!(e.ctrlKey&&e.shiftKey&&(e.key==='D'||e.key==='d'))) return;
        var list=bars(); if(!list.length) return;
        var anyOn=list.some(function(el){return el.style.display!=='none';});
        setOn(!anyOn);
        e.preventDefault();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      },true);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
    else boot();
  })();

  /* ==========================================================
   * VISUAL ENGINE
   * ========================================================== */
  var _visualCache = { loadedAt:0, rawRow:null, cfg:null, lastPageApplied:null };
  var _visualInFlight = null;

  function _num(v, fallback){
    var n=(v===0||v)?Number(v):NaN;
    return isFinite(n)?n:fallback;
  }

  function _toBool(v, fallback){
    if (v===undefined||v===null) return fallback;
    if (v===true) return true;
    if (v===false) return false;
    if (typeof v==='number') return v!==0;
    var s=String(v).trim().toLowerCase();
    if (s==='1'||s==='true'||s==='on'||s==='yes'||s==='sim') return true;
    if (s==='0'||s==='false'||s==='off'||s==='no'||s==='nao'||s==='não') return false;
    return fallback;
  }

  function _pick(cfg, keys, fallback){
    if (!cfg) return fallback;
    for (var i=0; i<keys.length; i++){
      var k=keys[i];
      if (cfg[k]!==undefined && cfg[k]!==null) return cfg[k];
    }
    return fallback;
  }

  async function loadVisualConfig(opts){
    opts = opts||{};
    var force = !!opts.force;
    if (_visualCache.cfg && !force) return _visualCache.cfg;
    if (_visualInFlight && !force) return _visualInFlight;

    _visualInFlight = (async function(){
      try{
        var rows = await sbGet('co_configuracoes','id=eq.1&select=*');
        var row  = (rows && rows[0]) ? rows[0] : {};

        /* =======================================================
         * MERGE STRATEGY v2.6.3:
         * 1) Começa com o JSONB (valor) — contém os campos globais
         *    salvos pelo admin (motion_enabled, layer_algae, etc.)
         * 2) Colunas diretas da linha sobrescrevem SOMENTE se não
         *    forem campos globais já presentes no JSONB.
         *    Colunas de página (gal_*, home_*, calc_*) sempre
         *    sobrescrevem pois são específicas.
         * Isso evita que colunas diretas zerem globais do JSONB.
         * ======================================================= */
        var jsonb = row.valor || {};
        var cfg   = {};

        /* 1) JSONB primeiro */
        Object.keys(jsonb).forEach(function(k){ cfg[k] = jsonb[k]; });

        /* 2) Colunas diretas: só aplica se for chave de página
              OU se o JSONB não tiver essa chave */
        var PAGE_PREFIXES = ['gal_','galeria_','home_','index_','calc_','calculadora_'];
        Object.keys(row).forEach(function(k){
          if (k === 'valor' || k === 'id' || k === 'created_at' || k === 'updated_at') return;
          if (row[k] === undefined || row[k] === null) return;
          var isPageKey = PAGE_PREFIXES.some(function(px){ return k.indexOf(px) === 0; });
          if (isPageKey) {
            /* chave de página: sempre aplica coluna direta */
            cfg[k] = row[k];
          } else {
            /* chave global: só aplica se JSONB não tiver */
            if (cfg[k] === undefined || cfg[k] === null) cfg[k] = row[k];
          }
        });

        _visualCache.loadedAt = Date.now();
        _visualCache.rawRow   = row;
        _visualCache.cfg      = cfg;
        return cfg;
      } finally {
        _visualInFlight = null;
      }
    })();

    return _visualInFlight;
  }

  /* ==========================================================
   * _resolvePageLayers v2.6.3
   * FIX CRÍTICO: globais lidos EXCLUSIVAMENTE do JSONB (valor.*).
   * Colunas de página (gal_layer_*) só entram quando herdar=false.
   * ========================================================== */
  function _resolvePageLayers(cfg, page){
    cfg = cfg||{};
    var p = String(page||'').toLowerCase();

    var prefixes;
    if (p==='gal'||p==='galeria')       prefixes=['gal','galeria'];
    else if (p==='home'||p==='index')   prefixes=['home','index'];
    else                                prefixes=[p];

    function pickBool(keys, fallback){
      return _toBool(_pick(cfg, keys, undefined), fallback);
    }

    function pageKeys(name){
      var arr=[];
      for (var i=0;i<prefixes.length;i++) arr.push(prefixes[i]+'_layer_'+name);
      return arr;
    }

    /* ---- GLOBAIS: lidos do JSONB via campos sem prefixo de página ---- */
    /* Usa _visualCache.rawRow.valor para garantir que são os valores
       do JSONB, não colunas diretas que possam ter sido sobrescritas */
    var jsonb = (_visualCache.rawRow && _visualCache.rawRow.valor) ? _visualCache.rawRow.valor : cfg;

    function globalBool(keys, fallback){
      return _toBool(_pick(jsonb, keys, undefined), fallback);
    }

    var gMotion = globalBool(['motion_enabled'], true);
    var gAurora = globalBool(['layer_aurora'], true);
    var gAlgae  = globalBool(['layer_algae'], true);
    var gParts  = globalBool(['layer_particles'], true);
    var gCta    = globalBool(['cta_pulse_enabled','layer_cta'], true);
    var gFog    = (jsonb.layer_fog  !== undefined && jsonb.layer_fog  !== null)
                    ? (jsonb.layer_fog  !== false)
                    : (_num(jsonb.fog_opacity,  0.35) > 0);
    var gOrbs   = (jsonb.layer_orbs !== undefined && jsonb.layer_orbs !== null)
                    ? (jsonb.layer_orbs !== false)
                    : (_num(jsonb.orbs_intensity, 50) > 0);

    /* ---- HERANÇA da página ---- */
    var herdar = pickBool(
      prefixes.map(function(px){ return px+'_herdar_camadas'; }),
      true
    );

    var out = {
      herdar_camadas: !!herdar,
      motion:    gMotion,
      aurora:    gAurora,
      fog:       gFog,
      algae:     gAlgae,
      orbs:      gOrbs,
      particles: gParts,
      cta:       gCta
    };

    /* se herda, retorna globais direto */
    if (herdar) return out;

    /* se NÃO herda, sobrepõe com toggles específicos da página */
    out.motion    = pickBool(pageKeys('motion'),    out.motion);
    out.aurora    = pickBool(pageKeys('aurora'),    out.aurora);
    out.fog       = pickBool(pageKeys('fog'),       out.fog);
    out.algae     = pickBool(pageKeys('algae'),     out.algae);
    out.orbs      = pickBool(pageKeys('orbs'),      out.orbs);
    out.particles = pickBool(pageKeys('particles'), out.particles);
    out.cta       = pickBool(pageKeys('cta'),       out.cta);

    return out;
  }

  function _applyThemeFromConfig(cfg){
    cfg=cfg||{};
    var t=cfg.tema_ativo;
    if (!t) return;
    var root=document.documentElement;
    if (t==='auto'||t==='gloomvale'){
      root.removeAttribute('data-theme-fixed');
      applyThemeAutoFromSystem();
    } else {
      var fixed=(t==='light')?'light':'dark';
      root.setAttribute('data-theme',fixed);
      root.setAttribute('data-theme-fixed','1');
      var el=C.$('#dTheme');
      if (el) el.textContent=fixed;
    }
  }

  function _setHeavyLayerDisplay(id, show){
    var el=document.getElementById(id);
    if (!el) return;
    if (show){
      el.removeAttribute('data-layer-pending-hide');
      el.style.display='';
    } else {
      if (el.children.length > 0){
        el.removeAttribute('data-layer-pending-hide');
        el.style.display='none';
      } else {
        el.setAttribute('data-layer-pending-hide','1');
      }
    }
  }

  function applyVisualConfig(cfg, opts){
    cfg=cfg||{};
    opts=opts||{};
    var page=opts.page||'';
    var root=document.documentElement;

    _applyThemeFromConfig(cfg);

    if (cfg.glass_opacity!=null) root.style.setProperty('--glass-opacity',String(cfg.glass_opacity));
    if (cfg.glass_blur!=null)    root.style.setProperty('--glass-blur',String(cfg.glass_blur)+'px');
    if (cfg.glass_opacity!=null||cfg.glass_blur!=null||cfg.tema_ativo){
      var op=_num(cfg.glass_opacity,0.82);
      var isLt=(root.getAttribute('data-theme')==='light');
      root.style.setProperty('--glass-bg',isLt
        ?('rgba(245,240,232,'+op+')')
        :('rgba(18,18,35,'+op+')'));
    }

    if (cfg.bpm_global!=null){
      var bpm=parseInt(cfg.bpm_global,10)||74;
      root.style.setProperty('--bpm',String(bpm));
      root.style.setProperty('--beat',(60/bpm).toFixed(4)+'s');
      root.style.setProperty('--drift',(4*60/bpm).toFixed(4)+'s');
    }

    if (cfg.aurora_opacity!=null) root.style.setProperty('--aurora-opacity',String(cfg.aurora_opacity));
    if (cfg.fog_opacity!=null)    root.style.setProperty('--fog-opacity',String(cfg.fog_opacity));

    var L=_resolvePageLayers(cfg,page);

    root.setAttribute('data-motion',L.motion?'on':'off');
    var btn=C.$('#btnMotion');
    if (btn) btn.textContent='MOTION '+(L.motion?'ON':'OFF');

    var aur=document.getElementById('auroraLayer');
    if (aur){
      var showAur=!!L.aurora;
      if (cfg.aurora_opacity!=null) showAur=showAur&&(_num(cfg.aurora_opacity,0.6)>0);
      aur.style.display=showAur?'':'none';
    }

    var fog=document.getElementById('fogLayer')||document.querySelector('.fog-layer');
    if (fog){
      var showFog=(L.fog!==false);
      if (cfg.fog_opacity!=null) showFog=showFog&&(_num(cfg.fog_opacity,0.35)>0);
      fog.style.display=showFog?'':'none';
    }

    _setHeavyLayerDisplay('algaeLayer',    !!L.algae     && !!L.motion);
    _setHeavyLayerDisplay('particlesLayer',!!L.particles && !!L.motion);
    _setHeavyLayerDisplay('orbsLayer',     !!L.motion    && (L.orbs!==false));

    if (L.cta===false){
      var s=document.getElementById('_ctaOff');
      if (!s){s=document.createElement('style');s.id='_ctaOff';document.head.appendChild(s);}
      s.textContent='.btn-primary{animation:none!important} .fab{animation:none!important}';
    } else {
      var s2=document.getElementById('_ctaOff');
      if (s2) s2.remove();
    }

    _visualCache.lastPageApplied=page;
  }

  async function applyVisualForPage(page, opts){
    opts=opts||{};
    var cfg=opts.cfg||await loadVisualConfig({force:!!opts.force});
    applyVisualConfig(cfg,{page:page});
    return cfg;
  }

  function getVisualConfigCached(){
    return _visualCache.cfg;
  }

  window.CORE_432UP = {
    loadContatos:         loadContatos,
    applyContatosToDom:   applyContatosToDom,
    toggleMotion:         toggleMotion,
    toggleNav:            toggleNav,
    closeNav:             closeNav,
    toast:                toast,
    phoneMask:            phoneMask,
    sbGet:                sbGet,
    sbPost:               sbPost,
    loadVisualConfig:     loadVisualConfig,
    applyVisualConfig:    applyVisualConfig,
    applyVisualForPage:   applyVisualForPage,
    getVisualConfigCached:getVisualConfigCached
  };

  window.toggleMotion = toggleMotion;
  window.toggleNav    = toggleNav;
  window.closeNav     = closeNav;
  window.sbPost       = sbPost;
  window.sbGet        = sbGet;

  console.log('[432UP] Core v2.6.3 carregado');

  loadContatos();

})();
