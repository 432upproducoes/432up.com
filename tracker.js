// tracker.js — STATBOARD v7.1 · Universal
// 432UP Produções · Arquivo dedicado de analytics
// v7.1: fix receita embed — fallback __sbLastCalcTotal + extração waURL PDF
// Apenas tracker.js alterado. calc.js, pdf.js e index.js intocados.
// ──────────────────────────────────────────────────────────────────────────
(function(){
  'use strict';

  /* ═══════════════════════════════════════════════
     1. FILTRO DE BOTS
     ═══════════════════════════════════════════════ */
  var ua = navigator.userAgent || '';
  if(/bot|crawl|spider|slurp|bingpreview|mediapartners|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|preview|headless|phantom|puppeteer|selenium|lighthouse|pagespeed|gtmetrix/i.test(ua)){
    console.log('[TRACKER] Bot detectado — desativado');
    return;
  }

  var dentroDeIframe = false;
  try { dentroDeIframe = (window.self !== window.top); } catch(e){ dentroDeIframe = true; }
  if(dentroDeIframe){
    console.log('[TRACKER] Dentro de iframe — desativado (pai registra via postMessage)');
    return;
  }

  /* ═══════════════════════════════════════════════
     2. CONFIG SUPABASE
     ═══════════════════════════════════════════════ */
     var SUPA_URL = 'https://www.432up.com/supabase-api';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';

  if(!window.supabase){
    console.warn('[TRACKER] supabase-js não carregou');
    return;
  }
  var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  /* ═══════════════════════════════════════════════
     3. VISITOR ID + SESSION ID
     ═══════════════════════════════════════════════ */
  var VID = (function(){
    var id = localStorage.getItem('sb_vid');
    if(!id){
      id = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2,11);
      localStorage.setItem('sb_vid', id);
    }
    return id;
  })();

  var SID = (function(){
    var key = 'sb_sid';
    var keyTime = 'sb_sid_t';
    var agora = Date.now();
    var sidSalvo = sessionStorage.getItem(key);
    var lastActivity = parseInt(sessionStorage.getItem(keyTime)) || 0;
    if(sidSalvo && (agora - lastActivity) < 1800000){
      sessionStorage.setItem(keyTime, String(agora));
      return sidSalvo;
    }
    var novo = 's_' + agora + '_' + Math.random().toString(36).substr(2,8);
    sessionStorage.setItem(key, novo);
    sessionStorage.setItem(keyTime, String(agora));
    return novo;
  })();

  var _lastTouch = 0;
  function touchSession(){
    var now = Date.now();
    if(now - _lastTouch < 5000) return;
    _lastTouch = now;
    sessionStorage.setItem('sb_sid_t', String(now));
  }
  document.addEventListener('click', touchSession, true);
  document.addEventListener('scroll', touchSession, {passive:true});
  document.addEventListener('keydown', touchSession, true);

  /* ═══════════════════════════════════════════════
     4. DETECÇÃO
     ═══════════════════════════════════════════════ */
  function getDevice(){ var u=navigator.userAgent; if(/Mobi|Android/i.test(u)) return 'celular'; if(/Tablet|iPad/i.test(u)||(/Macintosh/i.test(u)&&'ontouchend' in document)) return 'tablet'; return 'computador'; }
  function getBrowser(){ var u=navigator.userAgent; if(u.indexOf('Firefox')>-1) return 'Firefox'; if(u.indexOf('Edg')>-1) return 'Edge'; if(u.indexOf('OPR')>-1||u.indexOf('Opera')>-1) return 'Opera'; if(u.indexOf('Chrome')>-1&&u.indexOf('Edg')===-1) return 'Chrome'; if(u.indexOf('Safari')>-1&&u.indexOf('Chrome')===-1) return 'Safari'; return 'Outro'; }
  function getOS(){ var u=navigator.userAgent; if(/Windows/i.test(u)) return 'Windows'; if(/iPad|Macintosh/i.test(u)&&'ontouchend' in document) return 'iPadOS'; if(/iPhone|iPod/i.test(u)) return 'iOS'; if(/Macintosh|Mac OS/i.test(u)) return 'macOS'; if(/Android/i.test(u)) return 'Android'; if(/Linux/i.test(u)) return 'Linux'; return 'Outro'; }
  function getSource(){ var ref=document.referrer||''; var utm=new URLSearchParams(location.search).get('utm_source'); if(utm) return utm; if(!ref) return 'direto'; if(/google\.|bing\.|yahoo\.|duckduckgo\./i.test(ref)) return 'organico'; if(/facebook\.|instagram\.|twitter\.|linkedin\.|tiktok\./i.test(ref)) return 'social'; if(ref.indexOf(location.hostname)>-1) return 'interno'; return 'referencia'; }

  var pagina      = location.pathname || '/';
  var dispositivo = getDevice();
  var navegador   = getBrowser();
  var sistemaOp   = getOS();
  var fonte       = getSource();
  var resolucao   = screen.width + 'x' + screen.height;
  var idioma      = navigator.language || '';
  var params      = new URLSearchParams(location.search);

  /* ═══════════════════════════════════════════════
     5. FETCH HELPERS
     ═══════════════════════════════════════════════ */
  var HEADERS = {
    'Content-Type':  'application/json',
    'apikey':        SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Prefer':        'return=minimal'
  };

  function sbInsert(tabela, body){
    return fetch(SUPA_URL + '/rest/v1/' + tabela, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify(body)
    }).then(function(r){
      if(!r.ok) r.text().then(function(t){ console.warn('[TRACKER INSERT ' + tabela + ']', r.status, t); });
      return r;
    }).catch(function(e){ console.warn('[TRACKER INSERT ' + tabela + ']', e); });
  }

  function sbInsertBeacon(tabela, body){
    return fetch(SUPA_URL + '/rest/v1/' + tabela, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify(body), keepalive: true
    }).catch(function(){});
  }

  function sbPatchBeacon(tabela, filtro, body){
    return fetch(SUPA_URL + '/rest/v1/' + tabela + '?' + filtro, {
      method: 'PATCH', headers: HEADERS,
      body: JSON.stringify(body), keepalive: true
    }).catch(function(){});
  }

  /* ═══════════════════════════════════════════════
     6. IP + GEO
     ═══════════════════════════════════════════════ */
  var ipPublico = null;

  function anonimizarIP(ip){
    if(!ip) return null;
    var partes = ip.split('.');
    if(partes.length === 4){ partes[3] = '0'; return partes.join('.'); }
    var seg = ip.split(':');
    if(seg.length > 1){ seg[seg.length - 1] = '0'; return seg.join(':'); }
    return ip;
  }

  function buscarIP(){
    return fetch('https://api.db-ip.com/v2/free/self')
      .then(function(r){ return r.json(); })
      .then(function(d){
        ipPublico = anonimizarIP(d.ipAddress) || null;
        window.__sbGeo = { pais: d.countryName||null, cidade: d.city||null, estado: d.stateProv||null };
        return ipPublico;
      })
      .catch(function(){
        return fetch('https://get.geojs.io/v1/ip/geo.json')
          .then(function(r){ return r.json(); })
          .then(function(d){
            ipPublico = anonimizarIP(d.ip) || null;
            window.__sbGeo = { pais: d.country||null, cidade: d.city||null, estado: null };
            return ipPublico;
          })
          .catch(function(){
            return fetch('https://api.ipify.org?format=json')
              .then(function(r){ return r.json(); })
              .then(function(d){ ipPublico = anonimizarIP(d.ip); return ipPublico; })
              .catch(function(){ return null; });
          });
      });
  }

  /* ═══════════════════════════════════════════════
     7. REGISTRAR VISITA
     ═══════════════════════════════════════════════ */
  var visitaId   = null;
  var clickCount = 0;
  var maxScroll  = 0;

  var engajamentoInicio = Date.now();
  var engajamentoTotal  = 0;
  var engajamentoAtivo  = true;

  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden'){
      if(engajamentoAtivo){ engajamentoTotal += (Date.now() - engajamentoInicio); engajamentoAtivo = false; }
    } else {
      engajamentoInicio = Date.now(); engajamentoAtivo = true;
    }
  });

  function getEngajamentoSeg(){
    var total = engajamentoTotal;
    if(engajamentoAtivo) total += (Date.now() - engajamentoInicio);
    return Math.max(0, Math.round(total / 1000));
  }

  sb.from('visitas').insert({
    id_visitante: VID, pagina: pagina,
    titulo_pagina: document.title||null, referencia: document.referrer||null,
    dispositivo: dispositivo, navegador: navegador, sistema_op: sistemaOp,
    resolucao: resolucao, idioma: idioma, fonte: fonte, ip: null,
    utm_source: params.get('utm_source')||null,
    utm_medium: params.get('utm_medium')||null,
    utm_campaign: params.get('utm_campaign')||null
  }).select('id').single().then(function(r){
    if(r.data){
      visitaId = r.data.id;
      console.log('[TRACKER v7.1] Visita ID:', visitaId);
      buscarIP().then(function(ip){
        if(ip && visitaId){
          var geo = window.__sbGeo || {};
          sb.from('visitas').update({ ip: ip, pais: geo.pais||null, cidade: geo.cidade||null, estado: geo.estado||null }).eq('id', visitaId).then(function(){});
        }
      });
    }
    if(r.error) console.warn('[TRACKER] Visita erro:', r.error.message);
  });

  /* ═══════════════════════════════════════════════
     8. SALVAR DURAÇÃO + SCROLL + CLIQUES
     ═══════════════════════════════════════════════ */
  var _beaconJaEnviado = false;

  function salvarBeacon(){
    if(!visitaId || _beaconJaEnviado) return;
    _beaconJaEnviado = true;
    sbPatchBeacon('visitas', 'id=eq.' + visitaId, { duracao_seg: getEngajamentoSeg(), cliques: clickCount, rolagem_max: maxScroll });
  }

  function salvarPeriodico(){
    if(!visitaId) return;
    sb.from('visitas').update({ duracao_seg: getEngajamentoSeg(), cliques: clickCount, rolagem_max: maxScroll }).eq('id', visitaId).then(function(r){
      if(r.error) console.warn('[TRACKER] Update err:', r.error.message);
    });
  }

  window.addEventListener('pagehide', salvarBeacon);
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden'){ salvarBeacon(); } else { _beaconJaEnviado = false; }
  });
  setInterval(salvarPeriodico, 15000);

  /* ═══════════════════════════════════════════════
     9. SCROLL DEPTH
     ═══════════════════════════════════════════════ */
  var scrollMarcas = {25:false, 50:false, 75:false, 100:false};

  window.addEventListener('scroll', function(){
    var total = document.documentElement.scrollHeight - window.innerHeight;
    if(total > 0){
      var pct = Math.round((window.scrollY / total) * 100);
      if(pct > maxScroll) maxScroll = pct;
      [25,50,75,100].forEach(function(marca){
        if(pct >= marca && !scrollMarcas[marca]){
          scrollMarcas[marca] = true;
          sbInsert('conversoes', { id_visitante: VID, pagina: pagina, tipo: 'scroll_depth', detalhes: {marca: marca, tempo_seg: getEngajamentoSeg()}, valor: 0, concluida: true });
        }
      });
    }
  }, {passive:true});

  /* ═══════════════════════════════════════════════
     10. DETECÇÃO DUAL-MODE
     ═══════════════════════════════════════════════ */
  function isEstruturaAlterada(){ return !!document.querySelector('#pkgGrid .card'); }

  function lerNomeCard(card){
    if(!card) return 'desconhecido';
    var cn = card.querySelector('.card-name'); if(cn) return cn.textContent.trim();
    var h = card.querySelector('h3,h4,.pkg-name,.svc-name'); if(h) return h.textContent.trim();
    return 'desconhecido';
  }

  function lerPrecoCard(card){
    if(!card) return 0;
    var cp = card.querySelector('.card-price');
    if(cp){ var m = cp.textContent.match(/[\d\.]+/); return m ? parseInt(m[0].replace(/\./g,''))||0 : 0; }
    var pr = card.querySelector('.price'); if(pr) return parseInt(pr.textContent.replace(/[^\d]/g,''))||0;
    return 0;
  }

  function lerTotalOrcamento(){
    var rt = document.getElementById('resumoTotal');
    if(rt && rt.textContent.match(/[\d\.]+/)){ var m = rt.textContent.match(/[\d\.]+/); return m ? parseInt(m[0].replace(/\./g,''))||0 : 0; }
    var fv = document.getElementById('fabVal'); if(fv) return parseInt(fv.textContent.replace(/[^\d]/g,''))||0;
    return 0;
  }

  function lerDetalhesOrcamento(){
    var det = {itens:[], pacote:null, servicos:[]};
    var rb = document.getElementById('resumoBody');
    if(rb){ rb.querySelectorAll('.resumo-item').forEach(function(i){ det.itens.push(i.textContent.trim()); }); }
    var pc = document.querySelector('#pkgGrid .card.selected') || document.querySelector('.pkg.selected,.pkg.active');
    if(pc) det.pacote = lerNomeCard(pc);
    var sv = document.querySelectorAll('#svcGrid .card.selected,#svcGrid .card.included');
    if(!sv.length) sv = document.querySelectorAll('.svc.selected,.svc.active');
    sv.forEach(function(s){ det.servicos.push(lerNomeCard(s)); });
    return det;
  }

  /* ═══════════════════════════════════════════════
     11. CLIQUES
     ═══════════════════════════════════════════════ */
  var MAX_CLIQUES_SESSAO = 150;
  var cliquesGravados = 0;
  var _cliquesJaRegistrados = JSON.parse(sessionStorage.getItem('sb_cliques_reg')||'{}');

  function salvarCliquesReg(){ sessionStorage.setItem('sb_cliques_reg', JSON.stringify(_cliquesJaRegistrados)); }
  function cliqueFoiRegistrado(chave){ return !!_cliquesJaRegistrados[chave]; }
  function marcarCliqueRegistrado(chave){ _cliquesJaRegistrados[chave] = true; salvarCliquesReg(); }

  document.addEventListener('click', function(e){
    clickCount++;
    if(cliquesGravados >= MAX_CLIQUES_SESSAO) return;
    var el = e.target.closest('a,button,[data-track],.pkg-btn,.pkg,.card,input[type="submit"],.btn,[role="button"],[onclick],img');
    if(!el) return;
    var textoRaw = (el.getAttribute('data-track')||el.alt||el.innerText||el.textContent||'').trim().substring(0,100);
    var textoLimpo = textoRaw.toLowerCase();
    if(['x','×','✕','✖','close','fechar','','+','−','-'].indexOf(textoLimpo) > -1) return;

    var pkgCardAlt = el.closest('#pkgGrid .card');
    if(pkgCardAlt){
      setTimeout(function(){
        if(!pkgCardAlt.classList.contains('selected')) return;
        var nome = lerNomeCard(pkgCardAlt), val = lerPrecoCard(pkgCardAlt);
        var ch = 'pkg_' + nome.toLowerCase().replace(/\s+/g,'_');
        if(cliqueFoiRegistrado(ch)) return; marcarCliqueRegistrado(ch);
        sbInsert('cliques',{id_visitante:VID,pagina:pagina,elemento:nome.substring(0,80),texto:nome+' — R$ '+val,seletor:'#pkgGrid .card',tipo_elemento:'pacote',posicao_x:e.clientX||0,posicao_y:e.clientY||0});
        cliquesGravados++;
      },120); return;
    }

    var pkgCardOrig = el.closest('.pkg');
    if(pkgCardOrig){
      var nome = lerNomeCard(pkgCardOrig), val = lerPrecoCard(pkgCardOrig);
      var ch = 'pkg_' + nome.toLowerCase().replace(/\s+/g,'_');
      if(cliqueFoiRegistrado(ch)) return; marcarCliqueRegistrado(ch);
      sbInsert('cliques',{id_visitante:VID,pagina:pagina,elemento:nome.substring(0,80),texto:nome+' — R$ '+val,seletor:'.pkg',tipo_elemento:'pacote',posicao_x:e.clientX||0,posicao_y:e.clientY||0});
      cliquesGravados++; return;
    }

    var svcCardAlt = el.closest('#svcGrid .card');
    if(svcCardAlt){
      setTimeout(function(){
        var nome = lerNomeCard(svcCardAlt);
        var ch = 'svc_' + nome.toLowerCase().replace(/\s+/g,'_');
        if(cliqueFoiRegistrado(ch)) return; marcarCliqueRegistrado(ch);
        var val = lerPrecoCard(svcCardAlt);
        var acao = svcCardAlt.classList.contains('selected') ? 'adicionou' : 'removeu';
        sbInsert('cliques',{id_visitante:VID,pagina:pagina,elemento:nome.substring(0,80),texto:acao+': '+nome+' — R$ '+val,seletor:'#svcGrid .card',tipo_elemento:'servico',posicao_x:e.clientX||0,posicao_y:e.clientY||0});
        cliquesGravados++;
      },120); return;
    }

    if(el.tagName === 'IMG' && el.closest('#secGaleria,.galeria,.carousel,.swiper,.splide')){
      var nomeImg = el.alt||el.title||el.src.split('/').pop();
      var chImg = 'img_' + nomeImg.toLowerCase().replace(/\s+/g,'_').substring(0,40);
      if(cliqueFoiRegistrado(chImg)) return; marcarCliqueRegistrado(chImg);
      sbInsert('cliques',{id_visitante:VID,pagina:pagina,elemento:nomeImg.substring(0,80),texto:nomeImg.substring(0,150),seletor:el.className||'img',tipo_elemento:'foto_galeria',posicao_x:e.clientX||0,posicao_y:e.clientY||0});
      cliquesGravados++; return;
    }

    if(el.tagName === 'IMG') return;

    var sel = el.getAttribute('href')||el.id||el.className||'';
    var tipo = el.tagName.toLowerCase();
    var txt = textoRaw;
    var chEl = 'el_' + tipo + '_' + (txt||sel).toLowerCase().replace(/\s+/g,'_').substring(0,50);
    if(cliqueFoiRegistrado(chEl)) return; marcarCliqueRegistrado(chEl);
    var rect = el.getBoundingClientRect();
    sbInsert('cliques',{id_visitante:VID,pagina:pagina,elemento:txt.substring(0,80),texto:txt,seletor:(typeof sel==='string'?sel:String(sel)).substring(0,200),tipo_elemento:tipo,posicao_x:Math.round(rect.left+rect.width/2),posicao_y:Math.round(rect.top+rect.height/2+window.scrollY)});
    cliquesGravados++;
  }, true);

  /* ═══════════════════════════════════════════════
     12. CONVERSÕES
     ═══════════════════════════════════════════════ */
  var _convLock = JSON.parse(sessionStorage.getItem('sb_conv_lock')||'{}');

  function salvarConvLock(){ sessionStorage.setItem('sb_conv_lock', JSON.stringify(_convLock)); }

  function registrarConversao(tipo, detalhes, valor){
    var chave = tipo + '_' + (valor||0);
    if(_convLock[chave]){ console.log('[TRACKER] Conversão duplicada bloqueada:', tipo, valor); return Promise.resolve(); }
    _convLock[chave] = true; salvarConvLock();
    console.log('[TRACKER v7.1] Conversão:', tipo, valor, detalhes);
    return sbInsert('conversoes',{id_visitante:VID,pagina:pagina,tipo:tipo,detalhes:(typeof detalhes==='object')?detalhes:{info:detalhes},valor:valor||0,concluida:true});
  }

  window.registrarConversao = registrarConversao;

  /* ═══════════════════════════════════════════════
     13. RECEITA
     ═══════════════════════════════════════════════ */
  var _receitaRegistrada = JSON.parse(sessionStorage.getItem('sb_receita_reg')||'{}');

  function salvarReceitaReg(){ sessionStorage.setItem('sb_receita_reg', JSON.stringify(_receitaRegistrada)); }

  function registrarReceitaUnica(canal, fonteBotao, totalOverride){
    var total = (typeof totalOverride === 'number' && totalOverride > 0) ? totalOverride : lerTotalOrcamento();
    if(!total || total <= 0) return false;
    var chave = String(total);
    if(_receitaRegistrada[chave]){ console.log('[TRACKER] Receita duplicada bloqueada:', total, '| botão:', fonteBotao); return false; }
    _receitaRegistrada[chave] = true; salvarReceitaReg();
    var det = lerDetalhesOrcamento();
    registrarConversao('orcamento_enviado',{total_reais:total,canal:canal,pacote:det.pacote||null,servicos:det.servicos||[],fonte_botao:fonteBotao},total);
    console.log('[TRACKER] Receita registrada:', canal, total, '| botão:', fonteBotao);
    return true;
  }

  /* ═══════════════════════════════════════════════
     14. INTERCEPTAR openCalcPkg
     ═══════════════════════════════════════════════ */
  var _pkgJaTracked = false;

  function wrapOpenCalcPkg(){
    if(typeof window.openCalcPkg !== 'function') return false;
    var original = window.openCalcPkg;
    window.openCalcPkg = function(){
      try{
        _pkgJaTracked = true;
        setTimeout(function(){ _pkgJaTracked = false; },3000);
        var btn = arguments[0]; if(btn && btn.target) btn = btn.target;
        var card = btn ? (btn.closest ? btn.closest('.pkg') : btn.parentElement) : null;
        var nome = 'desconhecido', valor = 0;
        if(card){ nome = lerNomeCard(card); valor = lerPrecoCard(card); }
        registrarConversao('selecionou_pacote',{pacote:nome,valor_reais:valor},0);
      }catch(err){ console.warn('[TRACKER] wrap err',err); }
      return original.apply(this, arguments);
    };
    console.log('[TRACKER v7.1] openCalcPkg interceptado');
    return true;
  }

  document.addEventListener('click', function(e){
    var btn = e.target.closest('.pkg-btn'); if(!btn) return;
    if(_pkgJaTracked) return;
    var card = btn.closest('.pkg'); if(!card) return;
    registrarConversao('selecionou_pacote',{pacote:lerNomeCard(card),valor_reais:lerPrecoCard(card)},0);
  }, true);

  /* ═══════════════════════════════════════════════
     15. BRIDGE — BOTÕES DIRETOS
     ═══════════════════════════════════════════════ */
  function conectarBotoes(){
    var btnWA = document.getElementById('btnResumoWA');
    if(btnWA){ btnWA.addEventListener('click',function(){ registrarConversao('enviou_whatsapp_calc',{pagina:'calculadora'},0); registrarReceitaUnica('whatsapp','btnResumoWA'); }); }

    var btn432Pdf = document.getElementById('btn432Pdf');
    if(btn432Pdf){ btn432Pdf.addEventListener('click',function(){ registrarConversao('gerou_pdf',{pagina:'calculadora'},0); registrarReceitaUnica('pdf','btn432Pdf'); }); }

    var btnResumoPDF = document.getElementById('btnResumoPDF');
    if(btnResumoPDF && btnResumoPDF !== btn432Pdf){ btnResumoPDF.addEventListener('click',function(){ registrarConversao('gerou_pdf',{pagina:'calculadora'},0); registrarReceitaUnica('pdf','btnResumoPDF'); }); }

    var btnEmail = document.getElementById('btnResumoEmail');
    if(btnEmail){ btnEmail.addEventListener('click',function(){ registrarConversao('abriu_modal_email',{pagina:'calculadora'},0); }); }

    var btnModalSend = document.getElementById('modalSend');
    if(btnModalSend){ btnModalSend.addEventListener('click',function(){ registrarReceitaUnica('email','modalSend'); }); }

    ['stickyBtn','postPdfWA','postModalWA','fabWA','contactWA'].forEach(function(id){
      var btn = document.getElementById(id);
      if(btn){ btn.addEventListener('click',function(){ registrarConversao('enviou_whatsapp_calc',{pagina:'calculadora',fonte_botao:id},0); registrarReceitaUnica('whatsapp',id); }); }
    });

    var resumoTotalEl = document.getElementById('resumoTotal');
    if(resumoTotalEl){
      var totalObs = new MutationObserver(function(){ window.__sbLastCalcTotal = lerTotalOrcamento(); });
      totalObs.observe(resumoTotalEl,{childList:true,characterData:true,subtree:true});
    }

    var pkgGrid = document.getElementById('pkgGrid');
    if(pkgGrid && isEstruturaAlterada()){
      pkgGrid.addEventListener('click',function(e){
        var card = e.target.closest('.card'); if(!card) return;
        setTimeout(function(){
          if(!card.classList.contains('selected')) return;
          registrarConversao('selecionou_pacote',{pacote:lerNomeCard(card),valor_reais:lerPrecoCard(card)},0);
        },150);
      });
    }

    var svcGrid = document.getElementById('svcGrid');
    if(svcGrid && isEstruturaAlterada()){
      svcGrid.addEventListener('click',function(e){
        var card = e.target.closest('.card'); if(!card) return;
        setTimeout(function(){
          var acao = card.classList.contains('selected') ? 'adicionou_servico' : 'removeu_servico';
          registrarConversao(acao,{servico:lerNomeCard(card),valor_reais:lerPrecoCard(card)},0);
        },150);
      });
    }

    document.addEventListener('click',function(e){
      var waBtn   = e.target.closest('#fabWA,#btnResumoWA,#contactWA');
      var emailBtn= e.target.closest('#btnResumoEmail,#contactEmail,#modalSend');
      var pdfBtn  = e.target.closest('#btnResumoPDF,[data-action="pdf"],.btn-pdf');
      if(e.target.closest('#btn432Pdf')) return;
      var canal = null;
      if(waBtn) canal='whatsapp'; else if(emailBtn) canal='email'; else if(pdfBtn) canal='pdf';
      if(!canal) return;
      if(isEstruturaAlterada()) return;
      try{ var t=lerTotalOrcamento(); if(t>0) registrarReceitaUnica(canal,e.target.id||'direct_click',t); }catch(err){ console.warn('[TRACKER] receita direta err',err); }
    },true);
  }

  /* ═══════════════════════════════════════════════
     16. RECEITA VIA IFRAME (postMessage)
     ═══════════════════════════════════════════════
     v7.1 FIX:
     - 432up-open-wa: fallback __sbLastCalcTotal quando
       regex da URL falha (calc.js não envia total explícito)
     - 432up-open-email-modal: mesmo fallback
     - 432up-pdf-download: extrai total da waURL enviada
       pelo pdf.js quando __sbLastCalcTotal = 0
     ═══════════════════════════════════════════════ */
  var _pdfJaRegistrado = false;
  var _calcJaAberta = false;

  window.addEventListener('message', function(ev){
    var d = ev.data;
    if(!d || typeof d !== 'object') return;

    if(!_calcJaAberta && d.type && (
      d.type === '432up-open-wa' ||
      d.type === '432up-open-email-modal' ||
      d.type === '432up-open-mailto' ||
      d.type === '432up-pdf-download' ||
      d.type === '432up-save-lead'
    )){
      _calcJaAberta = true;
      registrarConversao('abriu_calculadora',{pagina:pagina},0);
    }

    /* ── WhatsApp via iframe ── */
    if(d.type === '432up-open-wa'){
      registrarConversao('enviou_whatsapp_calc',{pagina:'calculadora'},0);
      var totalWa = 0;
      if(d.url){
        var decoded = decodeURIComponent(d.url);
        var match = decoded.match(/TOTAL[:\s]*R\$\s*([\d\.]+)/i);
        if(match) totalWa = parseInt(match[1].replace(/\./g,''))||0;
      }
      if(totalWa <= 0 && d.data && d.data.total){
        totalWa = parseInt(String(d.data.total).replace(/[^\d]/g,''))||0;
      }
      /* FIX v7.1 — fallback cache populado pelo 432up-calc-total */
      if(totalWa <= 0) totalWa = window.__sbLastCalcTotal || 0;
      if(totalWa > 0) registrarReceitaUnica('whatsapp','iframe_postmessage',totalWa);
      return;
    }

    /* ── Email via iframe ── */
    if(d.type === '432up-open-email-modal' || d.type === '432up-open-mailto'){
      registrarConversao('abriu_modal_email',{},0);
      var totalEm = 0;
      if(d.data && d.data.msg){
        var emMatch = d.data.msg.match(/TOTAL[:\s]*R\$\s*([\d\.]+)/i);
        if(emMatch) totalEm = parseInt(emMatch[1].replace(/\./g,''))||0;
      }
      if(totalEm <= 0 && d.data && d.data.total){
        totalEm = parseInt(String(d.data.total).replace(/[^\d]/g,''))||0;
      }
      /* FIX v7.1 — fallback cache */
      if(totalEm <= 0) totalEm = window.__sbLastCalcTotal || 0;
      if(totalEm > 0) registrarReceitaUnica('email','iframe_postmessage',totalEm);
      return;
    }

    /* ── PDF via iframe ── */
    if(d.type === '432up-pdf-download'){
      if(!_pdfJaRegistrado){
        _pdfJaRegistrado = true;
        registrarConversao('gerou_pdf',{pagina:'calculadora'},0);
        setTimeout(function(){ _pdfJaRegistrado = false; },5000);
      }
      var pdfTotal = window.__sbLastCalcTotal || 0;
      /* FIX v7.1 — extrai total da waURL que pdf.js sempre envia */
      if(!pdfTotal && d.waURL){
        try{
          var _dec = decodeURIComponent(d.waURL);
          var _m = _dec.match(/TOTAL[:\s]*R\$\s*([\d\.]+)/i);
          if(_m) pdfTotal = parseInt(_m[1].replace(/\./g,''))||0;
        }catch(e){}
      }
      if(pdfTotal > 0) registrarReceitaUnica('pdf','iframe_pdf_download',pdfTotal);
      return;
    }

    /* ── Total atualizado via iframe ── */
    if(d.type === '432up-calc-total' && d.total){
      window.__sbLastCalcTotal = parseInt(String(d.total).replace(/[^\d]/g,''))||0;
      return;
    }

    /* ── Lead salvo via iframe ── */
    if(d.type === '432up-save-lead' && d.lead){
      try{
        var leadTotal = parseInt(String(d.lead.total||'').replace(/[^\d]/g,''))||0;
        if(leadTotal > 0) registrarReceitaUnica(d.lead.origem||'lead','iframe_save_lead',leadTotal);
      }catch(err){}
      return;
    }
  });

  /* ═══════════════════════════════════════════════
     17. FAQ
     ═══════════════════════════════════════════════ */
  var _faqJaClicadas = JSON.parse(sessionStorage.getItem('sb_faq_reg')||'{}');

  document.addEventListener('click', function(e){
    var faq = e.target.closest('.faq-item,.faq-question,[data-faq],details summary');
    if(!faq) return;
    var pergunta = faq.textContent.trim().substring(0,80);
    var chave = pergunta.toLowerCase().replace(/\s+/g,'_').substring(0,40);
    if(_faqJaClicadas[chave]) return;
    _faqJaClicadas[chave] = true;
    sessionStorage.setItem('sb_faq_reg', JSON.stringify(_faqJaClicadas));
    registrarConversao('clicou_faq',{pergunta:pergunta},0);
  }, true);

  /* ═══════════════════════════════════════════════
     18. WHATSAPP EXTERNO
     ═══════════════════════════════════════════════ */
  document.addEventListener('click', function(e){
    var link = e.target.closest('a[href*="wa.me"],a[href*="whatsapp"],a[href*="api.whatsapp"]');
    if(!link) return;
    if(link.closest('#calcFrame,.calc-container,[data-calc]')) return;
    if(link.id && ['fabWA','btnResumoWA','contactWA','postPdfWA','postModalWA'].indexOf(link.id) > -1) return;
    registrarConversao('clicou_whatsapp',{url:link.href},0);
  }, true);

  /* ═══════════════════════════════════════════════
     19. FORMULÁRIO
     ═══════════════════════════════════════════════ */
  document.addEventListener('submit', function(e){
    var form = e.target.closest('form');
    if(form){
      var nome = (form.querySelector('[name="nome"],[name="name"]')||{}).value||'';
      var wpp  = (form.querySelector('[name="whatsapp"],[name="telefone"],[name="phone"]')||{}).value||'';
      registrarConversao('enviou_contato',{nome:nome,whatsapp:wpp},0);
    }
  }, true);

  /* ═══════════════════════════════════════════════
     20. VISIBILIDADE DE SEÇÕES
     ═══════════════════════════════════════════════ */
  function iniciarObserverVisibilidade(){
    var secoes = document.querySelectorAll('[id^="sec"]');
    if(!secoes.length){ return setTimeout(iniciarObserverVisibilidade,1000); }

    var vistos = {}, timers = {};

    function gravarVisibilidade(id, tempoVisivel){
      var el = document.getElementById(id);
      var nome = el ? ((el.querySelector('h2,h3')||{}).textContent||id) : id;
      sbInsert('visibilidade',{id_visitante:VID,pagina:pagina,secao:id,nome_secao:nome.trim().substring(0,100),tempo_visivel:tempoVisivel||1,percentual_visto:100});
    }

    if('IntersectionObserver' in window){
      console.log('[TRACKER v7.1] Observando', secoes.length, 'seções');
      var observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          var id = entry.target.id;
          if(entry.isIntersecting){
            if(!vistos[id]){ vistos[id]=true; timers[id]=Date.now(); gravarVisibilidade(id,1); }
          } else if(timers[id]){
            var tempo = Math.round((Date.now()-timers[id])/1000);
            if(tempo>1) gravarVisibilidade(id,tempo);
            delete timers[id];
          }
        });
      },{threshold:0.3});
      secoes.forEach(function(s){ observer.observe(s); });
    }

    var _visibBeaconEnviado = false;
    function salvarVisibilidadeBeacon(){
      if(_visibBeaconEnviado) return; _visibBeaconEnviado = true;
      Object.keys(timers).forEach(function(id){
        var tv = Math.round((Date.now()-timers[id])/1000)||1;
        var el = document.getElementById(id);
        var nome = el ? ((el.querySelector('h2,h3')||{}).textContent||id) : id;
        sbInsertBeacon('visibilidade',{id_visitante:VID,pagina:pagina,secao:id,nome_secao:nome.trim().substring(0,100),tempo_visivel:tv,percentual_visto:100});
      });
    }
    window.addEventListener('pagehide', salvarVisibilidadeBeacon);
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState==='hidden'){ salvarVisibilidadeBeacon(); } else { _visibBeaconEnviado=false; }
    });
  }

  /* ═══════════════════════════════════════════════
     21. FUNIL
     ═══════════════════════════════════════════════ */
  function iniciarFunil(){
    var viuPacotes = false;
    var secPacotesEl = document.getElementById('secPacotes');
    if(secPacotesEl){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ if(entry.isIntersecting && !viuPacotes){ viuPacotes=true; registrarConversao('viu_pacotes',{secao:'secPacotes'},0); } });
      },{threshold:0.3}).observe(secPacotesEl);
    }
    var viuContato = false;
    var secContatoEl = document.getElementById('secContato');
    if(secContatoEl){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ if(entry.isIntersecting && !viuContato){ viuContato=true; registrarConversao('viu_contato',{secao:'secContato'},0); } });
      },{threshold:0.3}).observe(secContatoEl);
    }
  }

  /* ═══════════════════════════════════════════════
     22. INIT
     ═══════════════════════════════════════════════ */
  function init(){
    conectarBotoes();
    iniciarObserverVisibilidade();
    iniciarFunil();
    if(!wrapOpenCalcPkg()){
      var attempts = 0;
      var iv = setInterval(function(){ if(wrapOpenCalcPkg()||++attempts>50) clearInterval(iv); },200);
    }
    console.log('[TRACKER v7.1] ✅ Ativo — VID:', VID, '| SID:', SID, '| device:', dispositivo, '| modo:', isEstruturaAlterada()?'alterada (.card)':'original (.pkg)');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();