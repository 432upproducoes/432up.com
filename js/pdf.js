/* ========== 432UP PDF GENERATOR v3.5.1 — 2026-03-07 ========== */
/* Verde limão = marca · Laranja = desconto · Fractal p2          */
/* v3.5.1: nowrap no total · PASSO magenta · captura altura fix   */
/*         · stepCard fundo escurecido · msg WA sem separadores   */

(function () {
  'use strict';

  /* ─── PALETA OFICIAL 432UP v3.1 ─────────────────────────────── */
  var COR = {
    roxo:          '#7B2FBE',
    roxoEscuro:    '#1A0533',
    roxoMedio:     '#2D1065',
    magenta:       '#E91E8C',
    magentaClaro:  '#FF6EC7',
    verde:         '#AAFF00',
    verdeClaro:    '#CCFF66',
    verdeFraco:    'rgba(170,255,0,.12)',
    laranja:       '#FF8C00',
    laranjaClaro:  '#FFB347',
    dourado:       '#C9A84C',
    preto:         '#0D0D1A',
    branco:        '#FFFFFF',
    cinzaClaro:    '#F5F3FF',
    cinzaMedio:    '#E8E0F5',
    cinzaTexto:    '#4A3560'
  };

  /* ─── ESCALA TIPOGRÁFICA MARKETING-ALIGNED ───────────────────── */
  /*
   * Hierarquia neurolinguística para PDFs de vendas/proposta:
   *   T1 (headline)   → 28px / 900  — impacto imediato, ancora atenção
   *   T2 (subhead)    → 18px / 800  — CTA secundário, orientação
   *   T3 (secTitle)   → 12px / 800  — separadores, uppercase + tracking
   *   T4 (body)       → 13px / 400  — leitura confortável em A4
   *   T5 (detail)     → 11px / 400  — detalhes, suporte
   *   T6 (caption)    → 10px / 600  — labels, tags, micro-copy
   *   T7 (legal/micro)→  9px / 400  — disclaimer, rodapé
   *
   * Família única: Inter → Segoe UI → Arial → sans-serif
   */
  var FONT = "'Inter','Segoe UI',Arial,sans-serif";

  var TY = {
    t1:  '28px',
    t2:  '18px',
    t3:  '12px',
    t4:  '13px',
    t5:  '11px',
    t6:  '10px',
    t7:   '9px'
  };

  /* ─── EMBED ─────────────────────────────────────────────────── */
  var isEmbed = new URLSearchParams(window.location.search).get('embed') === '1';

  /* ─── FALLBACK WHATSAPP ──────────────────────────────────────── */
  var WA_FALLBACK = '5511948564577';

  /* ─── HELPERS ───────────────────────────────────────────────── */
  function fmtMoeda(n) {
    return 'R$ ' + Number(n).toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  function fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function dataHoje() {
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  /* ─── PROTOCOLO ANTI-COLISÃO ─────────────────────────────────── */
  function gerarNumOrc() {
    var ts   = Date.now().toString(36).toUpperCase();
    var rand = Math.floor(Math.random() * 0xFFFF)
                 .toString(16).toUpperCase().padStart(4, '0');
    return ts + '-' + rand;
  }

  function g(id) { return document.getElementById(id); }
  function libsOk() {
    return typeof window.jspdf !== 'undefined' &&
           typeof window.html2canvas !== 'undefined';
  }

  /* ─── INTERFACE CENTRALIZADA DE ESTADO ──────────────────────── */
  function getCalculatorState() {
    return {
      activePkg:  window.activePkg  || null,
      PKG:        window.PKG        || [],
      SVC:        window.SVC        || [],
      svcState:   window.svcState   || {},
      evGuests:   window.evGuests   || 80,
      evTipo:     window.evTipo     || ''
    };
  }

  /* ─── LÊ DADOS COM TRY/CATCH ─────────────────────────────────── */
  function getDados() {
    try {
      var state = getCalculatorState();

      var pkg = null;
      if (state.activePkg && state.PKG.length)
        pkg = state.PKG.find(function (p) {
          return p.pacote_id === state.activePkg;
        });

      var svcManuais = [];
      if (state.SVC.length && state.svcState)
        state.SVC.forEach(function (s) {
          if (state.svcState[s.servico_id] === 'manual') svcManuais.push(s);
        });

      var hours  = parseInt((g('hourSlider') || {}).value) || 4;
      var guests = state.evGuests;
      var tipo   = state.evTipo;
      var local  = ((g('evLocal') || {}).value || '').trim();
      var dt     = ((g('evDate')  || {}).value || '').trim();
      var obs    = ((g('evObs')   || {}).value || '').trim();

      var total = 0, totalAv = 0, lines = [];
      var DEF = 4;

      function findS(id) {
        return state.SVC.find(function (x) { return x.servico_id === id; });
      }
      function getTier(faixas, qtd) {
        if (!faixas || !faixas.length) return null;
        for (var i = 0; i < faixas.length; i++)
          if (qtd >= faixas[i].min && qtd <= faixas[i].max) return faixas[i];
        return faixas[faixas.length - 1];
      }

      if (pkg) {
        var inclH = pkg.horas_inclusas;
        var exH   = Math.max(0, hours - inclH);
        var disc  = pkg.desconto_percentual / 100;

        lines.push({
          type: 'pkg',
          name: '📦 Pacote ' + pkg.nome,
          detail: (pkg.itens.length ? pkg.itens : pkg.servicos_ids).join(', ') +
                  ' · ' + inclH + 'h inclusas',
          val: pkg.preco
        });
        total += pkg.preco;

        var pkAv = 0;
        pkg.servicos_ids.forEach(function (sid) {
          var s = findS(sid); if (s) pkAv += s.valor_base;
        });
        totalAv += pkAv;

        if (exH > 0) {
          pkg.servicos_ids.forEach(function (sid) {
            var s = findS(sid);
            if (s && s.valor_por_hora > 0) {
              var dv = Math.round(s.valor_por_hora * (1 - disc) * exH);
              total += dv; totalAv += s.valor_por_hora * exH;
              lines.push({
                type: 'extra',
                name: '+' + exH + 'h extra ' + s.nome + ' (−' + pkg.desconto_percentual + '%)',
                val: dv
              });
            }
          });
        }

        if (pkg.servicos_ids.indexOf('som') >= 0) {
          var sm = findS('som');
          if (sm) {
            var t = getTier(sm.faixas, guests);
            if (t && t.adicional > 0) {
              total += t.adicional; totalAv += t.adicional;
              lines.push({
                type: 'extra',
                name: 'Sonorização faixa ' + t.label + ' (' + guests + ' conv.)',
                val: t.adicional
              });
            }
          }
        }

        svcManuais.forEach(function (s) {
          total += s.valor_base; totalAv += s.valor_base;
          lines.push({ type: 'svc', name: (s.icone || '') + ' ' + s.nome, val: s.valor_base });
          if (exH > 0 && s.valor_por_hora > 0) {
            var ev = s.valor_por_hora * exH;
            total += ev; totalAv += ev;
            lines.push({ type: 'extra', name: '+' + exH + 'h extra ' + s.nome, val: ev });
          }
          if (s.servico_id === 'som') {
            var t2 = getTier(s.faixas, guests);
            if (t2 && t2.adicional > 0) {
              total += t2.adicional; totalAv += t2.adicional;
              lines.push({ type: 'extra', name: 'Sonorização faixa ' + t2.label, val: t2.adicional });
            }
          }
        });

      } else {
        var exH2 = Math.max(0, hours - DEF);
        svcManuais.forEach(function (s) {
          total += s.valor_base; totalAv += s.valor_base;
          lines.push({ type: 'svc', name: (s.icone || '') + ' ' + s.nome, val: s.valor_base });
          if (exH2 > 0 && s.valor_por_hora > 0) {
            var ev = s.valor_por_hora * exH2;
            total += ev; totalAv += ev;
            lines.push({ type: 'extra', name: '+' + exH2 + 'h extra ' + s.nome, val: ev });
          }
          if (s.servico_id === 'som') {
            var t3 = getTier(s.faixas, guests);
            if (t3 && t3.adicional > 0) {
              total += t3.adicional; totalAv += t3.adicional;
              lines.push({ type: 'extra', name: 'Sonorização faixa ' + t3.label, val: t3.adicional });
            }
          }
        });
      }

      return {
        pkg: pkg, lines: lines, total: total,
        eco: Math.max(0, totalAv - total),
        tipo: tipo, guests: guests, hours: hours,
        local: local, dt: dt, obs: obs
      };

    } catch (err) {
      console.error('[432UP PDF] getDados falhou:', err);
      return {
        pkg: null, lines: [], total: 0, eco: 0,
        tipo: '', guests: 80, hours: 4,
        local: '', dt: '', obs: ''
      };
    }
  }

  /* ─── FRACTAL BG ─────────────────────────────────────────────── */
  function fractalBg() {
    var shapes = [];
    var seed = [
      [8,  12, 6,  12, 15,  .06, 0],[18, 45, 8,  8,  45,  .05, 1],
      [28, 78, 5,  10, 25,  .07, 2],[42, 22, 10, 6,  -20, .04, 0],
      [55, 60, 7,  7,  60,  .06, 1],[65, 88, 6,  12, 30,  .05, 2],
      [72, 35, 9,  5,  -35, .04, 0],[82, 15, 6,  6,  50,  .07, 1],
      [88, 68, 5,  10, -15, .05, 2],[93, 42, 8,  8,  70,  .04, 1],
      [12, 90, 7,  4,  20,  .05, 0],[35, 55, 5,  5,  45,  .06, 1],
      [50, 10, 9,  9,  -60, .04, 2],[76, 80, 6,  12, 35,  .07, 0],
      [95, 92, 5,  5,  55,  .05, 1],[22, 30, 10, 4,  -25, .04, 2],
      [60, 48, 6,  6,  80,  .06, 1],[38, 8,  4,  9,  15,  .05, 0],
      [5,  65, 7,  7,  -45, .04, 2],[48, 95, 8,  4,  30,  .06, 0]
    ];
    var cores = ['rgba(170,255,0,','rgba(233,30,140,','rgba(123,47,190,'];
    seed.forEach(function (s, idx) {
      var x=s[0],y=s[1],w=s[2],h=s[3],rot=s[4],op=s[5],tipo=s[6];
      var cor=cores[idx%3];
      var border=tipo===2
        ?'transform:rotate('+rot+'deg) skew(10deg,10deg);'
        :'transform:rotate('+rot+'deg);';
      var radius=tipo===1?'50%':tipo===2?'3px':'2px';
      shapes.push(
        '<div style="position:absolute;left:'+x+'%;top:'+y+'%;'+
        'width:'+w+'px;height:'+h+'px;background:'+cor+op+');'+
        'border-radius:'+radius+';'+border+'"></div>'
      );
    });
    return '<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;">'+
      shapes.join('')+'</div>';
  }

  /* ─── COMPONENTES ────────────────────────────────────────────── */

  function secTitle(txt) {
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'+
      '<div style="width:3px;height:18px;border-radius:2px;'+
        'background:linear-gradient(180deg,'+COR.verde+','+COR.magenta+');"></div>'+
      '<span style="font-family:'+FONT+';font-size:'+TY.t3+';font-weight:800;'+
        'text-transform:uppercase;letter-spacing:2px;color:'+COR.roxo+';">'+txt+'</span>'+
      '<div style="flex:1;height:1px;'+
        'background:linear-gradient(90deg,'+COR.cinzaMedio+',transparent);"></div>'+
    '</div>';
  }

  function infoCard(label, val) {
    return '<div style="background:rgba(255,255,255,.08);'+
      'border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 14px;">'+
      '<div style="font-family:'+FONT+';color:rgba(255,255,255,.45);font-size:'+TY.t6+';'+
        'text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">'+label+'</div>'+
      '<div style="font-family:'+FONT+';color:'+COR.verde+';font-size:'+TY.t4+';font-weight:700;">'+val+'</div>'+
    '</div>';
  }

  /* ─── [ALTER #2+#4] STEPCARD ─────────────────────────────────── */
  /* PASSO: verde limão → magenta (contraste em fundo claro)        */
  /* Fundo: cinzaClaro → cinza levemente escurecido (mais peso)     */
  function stepCard(num, txt, icon) {
    return '<div style="background:#EAE6F5;border-radius:10px;'+
      'padding:14px 16px;border-top:3px solid '+COR.magenta+';">'+
      '<div style="font-size:18px;margin-bottom:6px;">'+icon+'</div>'+
      '<div style="font-family:'+FONT+';font-size:'+TY.t6+';font-weight:800;color:'+COR.magenta+';'+
        'letter-spacing:1px;margin-bottom:4px;">PASSO '+num+'</div>'+
      '<div style="font-family:'+FONT+';font-size:'+TY.t5+';color:'+COR.cinzaTexto+';line-height:1.55;">'+txt+'</div>'+
    '</div>';
  }

  function infoItem(icone, titulo, texto) {
    return '<div style="display:flex;gap:12px;align-items:flex-start;'+
      'padding:10px 0;border-bottom:1px solid '+COR.cinzaMedio+';">'+
      '<div style="font-size:16px;flex-shrink:0;margin-top:1px;">'+icone+'</div>'+
      '<div>'+
        '<div style="font-family:'+FONT+';font-weight:700;font-size:'+TY.t5+';'+
          'color:'+COR.roxo+';margin-bottom:2px;">'+titulo+'</div>'+
        '<div style="font-family:'+FONT+';font-size:'+TY.t5+';color:#555;line-height:1.55;">'+texto+'</div>'+
      '</div>'+
    '</div>';
  }

  function pgtoCard(icone, titulo, corpo) {
    return '<div style="background:linear-gradient(135deg,'+
      COR.roxoEscuro+','+COR.roxoMedio+');'+
      'border-radius:10px;padding:16px 18px;border:1px solid rgba(170,255,0,.15);">'+
      '<div style="font-size:22px;margin-bottom:8px;">'+icone+'</div>'+
      '<div style="font-family:'+FONT+';color:'+COR.verdeClaro+';font-size:'+TY.t6+';'+
        'font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">'+titulo+'</div>'+
      '<div style="font-family:'+FONT+';color:rgba(255,255,255,.75);font-size:'+TY.t5+';line-height:1.6;">'+corpo+'</div>'+
    '</div>';
  }

  function selo(num, label) {
    return '<div style="background:linear-gradient(135deg,'+
      COR.roxoEscuro+','+COR.roxoMedio+');'+
      'border-radius:10px;padding:10px 18px;text-align:center;'+
      'border:1px solid rgba(170,255,0,.2);">'+
      '<div style="font-family:'+FONT+';color:'+COR.verde+';font-size:'+TY.t2+';font-weight:900;'+
        'text-shadow:0 0 10px rgba(170,255,0,.4);">'+num+'</div>'+
      '<div style="font-family:'+FONT+';color:rgba(255,255,255,.5);font-size:'+TY.t6+';letter-spacing:.5px;">'+label+'</div>'+
    '</div>';
  }

  /* ─── QR CODE VIA QRCODEJS (substitui Google Chart) ─────────── */
  /* ATENÇÃO: adicione no HTML antes deste script:                  */
  /*   <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"></script> */
  function qrCodeWA(waNum, msgWA) {
    var waUrl = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msgWA);

    if (typeof window.QRCode !== 'undefined') {
      var containerId = 'qr432up_' + Date.now();
      return '<div style="text-align:center;" data-qr-url="'+waUrl+'" data-qr-id="'+containerId+'">'+
        '<div id="'+containerId+'" style="width:100px;height:100px;margin:0 auto 8px;'+
          'border-radius:8px;border:3px solid '+COR.verde+';overflow:hidden;'+
          'box-shadow:0 0 12px rgba(170,255,0,.3);background:#fff;display:flex;'+
          'align-items:center;justify-content:center;"></div>'+
        '<div style="font-family:'+FONT+';color:'+COR.verdeClaro+';font-size:'+TY.t6+';'+
          'font-weight:700;letter-spacing:1px;text-transform:uppercase;">Aponte a câmera</div>'+
        '<div style="font-family:'+FONT+';color:rgba(255,255,255,.4);font-size:'+TY.t6+';margin-top:2px;">para falar conosco</div>'+
      '</div>';
    }

    var qrSrc = 'https://chart.googleapis.com/chart?cht=qr&chs=120x120&chl='+
      encodeURIComponent(waUrl)+'&choe=UTF-8&chld=M|2';
    return '<div style="text-align:center;">'+
      '<img src="'+qrSrc+'" width="100" height="100" crossorigin="anonymous" '+
        'style="border-radius:8px;border:3px solid '+COR.verde+';'+
        'display:block;margin:0 auto 8px;box-shadow:0 0 12px rgba(170,255,0,.3);"/>'+
      '<div style="font-family:'+FONT+';color:'+COR.verdeClaro+';font-size:'+TY.t6+';'+
        'font-weight:700;letter-spacing:1px;text-transform:uppercase;">Aponte a câmera</div>'+
      '<div style="font-family:'+FONT+';color:rgba(255,255,255,.4);font-size:'+TY.t6+';margin-top:2px;">para falar conosco</div>'+
    '</div>';
  }

  /* Renderiza QR nos containers injetados no wrap (pós innerHTML)  */
  function _renderQR(wrap) {
    if (typeof window.QRCode === 'undefined') return;
    var nodes = wrap.querySelectorAll('[data-qr-url]');
    nodes.forEach(function (node) {
      var id  = node.getAttribute('data-qr-id');
      var url = node.getAttribute('data-qr-url');
      var el  = node.querySelector('#' + id);
      if (el) {
        new window.QRCode(el, {
          text:         url,
          width:        94,
          height:       94,
          colorDark:    '#1A0533',
          colorLight:   '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      }
    });
  }

  function header(pag, nOrc) {
    return '<div style="background:linear-gradient(135deg,'+
        COR.roxoEscuro+' 0%,'+COR.roxoMedio+' 40%,'+
        COR.roxo+' 70%,'+COR.magenta+' 100%);'+
      'padding:20px 48px;display:flex;justify-content:space-between;align-items:center;">'+
      '<div>'+
        '<div style="font-family:'+FONT+';color:'+COR.branco+';font-size:'+TY.t1+';font-weight:900;'+
          'letter-spacing:3px;line-height:1;">'+
          '432<span style="color:'+COR.verde+';'+
          'text-shadow:0 0 12px rgba(170,255,0,.5);">UP!</span>'+
        '</div>'+
        '<div style="font-family:'+FONT+';color:'+COR.magentaClaro+';font-size:'+TY.t6+';'+
          'letter-spacing:2px;font-weight:600;margin-top:3px;">PRODUÇÕES</div>'+
      '</div>'+
      '<div style="text-align:right;">'+
        '<div style="font-family:'+FONT+';color:rgba(255,255,255,.45);font-size:'+TY.t5+';letter-spacing:1px;">Página '+pag+' de 2</div>'+
        '<div style="font-family:'+FONT+';color:rgba(255,255,255,.75);font-size:'+TY.t4+';margin-top:3px;">'+dataHoje()+'</div>'+
        '<div style="font-family:'+FONT+';color:'+COR.dourado+';font-size:'+TY.t5+';font-weight:700;margin-top:3px;">Protocolo '+nOrc+'</div>'+
      '</div>'+
    '</div>';
  }

  function footer(nOrc) {
    return '<div style="background:'+COR.preto+';padding:12px 48px;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;'+
        'padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.07);">'+
        '<div style="font-family:'+FONT+';color:rgba(255,255,255,.4);font-size:'+TY.t5+';">'+
          '📱 (11) 94856-4577 &nbsp;|&nbsp; 📧 contato@432up.com'+
          ' &nbsp;|&nbsp; 🌐 www.432up.com &nbsp;|&nbsp; 📸 @432up.producoes'+
        '</div>'+
        '<div style="font-family:'+FONT+';color:rgba(255,255,255,.25);font-size:'+TY.t5+';">'+nOrc+'</div>'+
      '</div>'+
      '<div style="padding-top:7px;font-family:'+FONT+';color:rgba(255,255,255,.3);font-size:'+TY.t7+';line-height:1.6;">'+
        '⚠️ Este documento é uma '+
        '<strong style="color:rgba(255,255,255,.5);">simulação de pré-orçamento</strong> '+
        'gerada automaticamente. Os valores são '+
        '<strong style="color:rgba(255,255,255,.5);">meramente estimativos</strong> '+
        'e não constituem proposta firme, contrato ou vínculo obrigacional. '+
        'Valores e condições definitivos serão confirmados pela nossa equipe após contato formal. '+
        '· Protocolo '+nOrc+
      '</div>'+
    '</div>';
  }

  /* ─── MONTA HTML DAS 2 PÁGINAS ───────────────────────────────── */
  function buildHTML(dados, nOrc, waNum, msgWA) {

    /* ── PÁGINA 1 ── */
    var p1 =
      '<div style="width:794px;min-height:1122px;background:#fff;'+
      'font-family:'+FONT+';color:#1a1a1a;'+
      'box-sizing:border-box;display:flex;flex-direction:column;">'+
      header('1', nOrc)+
      '<div style="background:linear-gradient(160deg,'+
          COR.roxoEscuro+' 0%,'+COR.roxoMedio+' 55%,#3D1580 100%);'+
        'padding:36px 48px 28px;position:relative;overflow:hidden;">'+
        '<div style="position:absolute;top:-80px;right:-80px;width:260px;height:260px;'+
          'border-radius:50%;background:rgba(170,255,0,.06);"></div>'+
        '<div style="position:absolute;bottom:-50px;left:60px;width:160px;height:160px;'+
          'border-radius:50%;background:rgba(233,30,140,.07);"></div>'+
        '<div style="position:relative;z-index:1;">'+
          '<div style="display:inline-flex;align-items:center;gap:8px;'+
            'background:rgba(255,140,0,.15);border:1px solid rgba(255,140,0,.4);'+
            'border-radius:20px;padding:5px 16px;margin-bottom:14px;">'+
            '<div style="width:6px;height:6px;border-radius:50%;background:'+COR.laranja+';"></div>'+
            '<span style="font-family:'+FONT+';color:'+COR.laranjaClaro+';font-size:'+TY.t6+';'+
              'font-weight:700;letter-spacing:2px;text-transform:uppercase;">SIMULAÇÃO DE PRÉ-ORÇAMENTO</span>'+
          '</div>'+
          '<h1 style="font-family:'+FONT+';color:#fff;font-size:'+TY.t1+';font-weight:900;'+
            'margin:0 0 6px;line-height:1.2;">'+
            'PROPOSTA DE <span style="color:'+COR.verde+';text-shadow:0 0 16px rgba(170,255,0,.4);">'+
            'REALIZAÇÃO</span> DE EVENTO</h1>'+
          '<p style="font-family:'+FONT+';color:rgba(255,255,255,.55);font-size:'+TY.t5+';margin:0 0 5px;">'+
            'Valores estimados · sujeitos a confirmação pela equipe 432UP</p>'+
          '<p style="font-family:'+FONT+';color:rgba(255,255,255,.3);font-size:'+TY.t6+';margin:0 0 22px;">'+
            'Esta simulação foi gerada automaticamente e não representa contrato ou proposta firme.</p>'+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">'+
            infoCard('🎉 Tipo de Evento', dados.tipo || '—')+
            infoCard('📅 Data Desejada', fmtData(dados.dt))+
            infoCard('📍 Local', dados.local || '—')+
            infoCard('👥 Convidados', dados.guests + ' pessoas')+
            infoCard('⏱ Duração', dados.hours + ' horas')+
            infoCard('🔖 Protocolo', nOrc)+
          '</div>'+
        '</div>'+
      '</div>'+

      '<div style="padding:26px 48px;flex:1;">'+

        (dados.pkg ?
        '<div style="margin-bottom:20px;">'+
          secTitle('📦 PACOTE DE INTERESSE')+
          '<div style="background:linear-gradient(135deg,'+COR.roxoEscuro+','+COR.roxoMedio+');'+
            'border-radius:12px;padding:16px 20px;'+
            'display:flex;justify-content:space-between;align-items:center;'+
            'border:1px solid rgba(170,255,0,.2);">'+
            '<div>'+
              '<div style="font-family:'+FONT+';color:#fff;font-size:'+TY.t2+';font-weight:800;">📦 Pacote '+dados.pkg.nome+'</div>'+
              '<div style="font-family:'+FONT+';color:rgba(255,255,255,.55);font-size:'+TY.t5+';margin-top:4px;">'+
                (dados.pkg.itens.length ? dados.pkg.itens : dados.pkg.servicos_ids).join(' · ')+
              '</div>'+
              '<div style="font-family:'+FONT+';color:'+COR.dourado+';font-size:'+TY.t6+';margin-top:3px;font-weight:600;">'+
                dados.pkg.horas_inclusas+'h inclusas · '+dados.pkg.desconto_percentual+'% de desconto estimado'+
              '</div>'+
            '</div>'+
            '<div style="text-align:right;">'+
              '<div style="font-family:'+FONT+';color:'+COR.laranja+';font-size:'+TY.t6+';'+
                'font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Estimativa</div>'+
              '<div style="font-family:'+FONT+';color:'+COR.verde+';font-size:22px;font-weight:900;white-space:nowrap;">'+fmtMoeda(dados.pkg.preco)+'</div>'+
              (dados.eco > 0 ? '<div style="font-family:'+FONT+';color:'+COR.laranjaClaro+';font-size:'+TY.t6+';">🏷 potencial economia de '+fmtMoeda(dados.eco)+'</div>' : '')+
            '</div>'+
          '</div>'+
        '</div>' : '') +

        '<div style="margin-bottom:20px;">'+
          secTitle('🎛️ COMPOSIÇÃO ESTIMADA')+
          '<table style="width:100%;border-collapse:collapse;font-family:'+FONT+';font-size:'+TY.t4+';">'+
            '<thead>'+
              '<tr style="background:linear-gradient(90deg,'+COR.roxo+','+COR.magenta+');">'+
                '<th style="padding:10px 14px;text-align:left;color:#fff;font-weight:700;border-radius:8px 0 0 0;">Descrição</th>'+
                '<th style="padding:10px 14px;text-align:left;color:#fff;font-weight:700;">Detalhe</th>'+
                '<th style="padding:10px 14px;text-align:right;color:#fff;font-weight:700;border-radius:0 8px 0 0;">Valor Est.</th>'+
              '</tr>'+
            '</thead>'+
            '<tbody>'+
              (dados.lines.length ? dados.lines.map(function (l, i) {
                var bg   = i % 2 === 0 ? COR.cinzaClaro : '#fff';
                var bold = l.type === 'pkg' ? 'font-weight:700;' : '';
                var dim  = l.type === 'extra'
                  ? 'color:#999;font-style:italic;font-size:'+TY.t5+';' : '';
                var pre  = l.type === 'extra' ? '&nbsp;&nbsp;↳ ' : '';
                return '<tr style="background:'+bg+';">'+
                  '<td style="padding:9px 14px;'+bold+dim+'">'+pre+l.name+'</td>'+
                  '<td style="padding:9px 14px;font-size:'+TY.t6+';color:#888;">'+(l.detail || '')+'</td>'+
                  '<td style="padding:9px 14px;text-align:right;font-weight:700;white-space:nowrap;color:'+COR.roxo+';">'+fmtMoeda(l.val)+'</td>'+
                '</tr>';
              }).join('') :
              '<tr><td colspan="3" style="padding:14px;color:#aaa;font-style:italic;text-align:center;font-size:'+TY.t4+';">Nenhum item selecionado</td></tr>')+
            '</tbody>'+
          '</table>'+
        '</div>'+

        (dados.obs ?
        '<div style="background:#FFF8E7;border-left:4px solid '+COR.dourado+';'+
          'border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;'+
          'font-family:'+FONT+';font-size:'+TY.t4+';color:#5C4A00;">'+
          '<strong>📝 Observações informadas:</strong> '+dados.obs+
        '</div>' : '') +

        /* ─── [ALTER #1] BLOCO TOTAL — nowrap no valor ───────────── */
        /* white-space:nowrap no container direito garante que        */
        /* "R$" e o número nunca quebrem em linhas separadas          */
        '<div style="background:linear-gradient(135deg,'+COR.roxoEscuro+','+COR.preto+');'+
          'border-radius:14px;padding:20px 26px;'+
          'display:flex;justify-content:space-between;align-items:center;'+
          'border:1px solid rgba(170,255,0,.15);">'+
          '<div>'+
            '<div style="font-family:'+FONT+';color:rgba(255,255,255,.5);font-size:'+TY.t6+';'+
              'text-transform:uppercase;letter-spacing:2px;">Estimativa de Investimento</div>'+
            '<div style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;'+
              'background:rgba(255,140,0,.18);border:1px solid rgba(255,140,0,.35);'+
              'border-radius:20px;padding:4px 12px;">'+
              '<span style="font-family:'+FONT+';color:'+COR.laranjaClaro+';font-size:'+TY.t5+';font-weight:700;">'+
                '⚠️ Valor estimado · confirme com nossa equipe</span>'+
            '</div>'+
            (dados.eco > 0 ?
            '<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;'+
              'background:rgba(255,140,0,.1);border-radius:20px;padding:4px 12px;">'+
              '<span style="font-family:'+FONT+';color:'+COR.laranjaClaro+';font-size:'+TY.t5+';font-weight:700;">'+
                '🏷 Potencial economia de '+fmtMoeda(dados.eco)+'</span>'+
            '</div>' : '')+
          '</div>'+
          '<div style="text-align:right;white-space:nowrap;min-width:140px;">'+
            '<div style="font-family:'+FONT+';color:rgba(255,255,255,.35);font-size:'+TY.t6+';'+
              'text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">a partir de</div>'+
            '<div style="font-family:'+FONT+';color:'+COR.verde+';font-size:26px;font-weight:900;'+
              'white-space:nowrap;text-shadow:0 0 18px rgba(170,255,0,.3);">'+fmtMoeda(dados.total)+'</div>'+
            '<div style="font-family:'+FONT+';color:rgba(255,255,255,.3);font-size:'+TY.t6+';margin-top:3px;">'+
              'sujeito a confirmação</div>'+
          '</div>'+
        '</div>'+

      '</div>'+
      footer(nOrc)+
    '</div>';

    /* ── PÁGINA 2 ── */
    var p2 =
      '<div style="width:794px;min-height:1122px;background:#fff;'+
      'font-family:'+FONT+';color:#1a1a1a;'+
      'box-sizing:border-box;display:flex;flex-direction:column;position:relative;">'+
      fractalBg()+
      header('2', nOrc)+
      '<div style="padding:26px 48px;flex:1;position:relative;z-index:1;">'+

        '<div style="margin-bottom:24px;">'+
          secTitle('🚀 PRÓXIMOS PASSOS')+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">'+
            stepCard('01','Fale com nossa equipe para verificar disponibilidade e detalhar seu evento','💬')+
            stepCard('02','Receba uma proposta oficial personalizada com valores confirmados','📋')+
            stepCard('03','Com tudo alinhado, formalizamos e garantimos sua data','🎉')+
          '</div>'+
        '</div>'+

        '<div style="margin-bottom:24px;">'+
          secTitle('✨ COMO TRABALHAMOS')+
          '<div style="background:rgba(245,243,255,.92);border-radius:12px;padding:4px 20px;border:1px solid '+COR.cinzaMedio+';">'+
            infoItem('🎵','Repertório personalizado','Alinhamos o estilo musical ao perfil do seu evento antes de tudo.')+
            infoItem('⏰','Pontualidade e organização','Chegamos com antecedência para montagem, passagem de som e testes.')+
            infoItem('🔊','Estrutura técnica completa','Todo equipamento de som e iluminação necessário conforme o projeto acordado.')+
            infoItem('🤝','Atendimento humanizado','Você terá contato direto com nossa equipe do primeiro ao último momento.')+
            infoItem('📸','Registro do evento','Poderemos registrar momentos para nosso portfólio, salvo preferência contrária.')+
            infoItem('🌦️','Eventos ao ar livre','Para eventos externos, recomendamos cobertura e proteção dos equipamentos.')+
          '</div>'+
        '</div>'+

        '<div style="margin-bottom:24px;">'+
          secTitle('💳 FORMAS DE PAGAMENTO DISPONÍVEIS')+
          '<p style="font-family:'+FONT+';font-size:'+TY.t5+';color:#777;margin:0 0 12px;">'+
            'Condições e parcelamentos confirmados pela equipe após aprovação da proposta.</p>'+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">'+
            pgtoCard('💸','PIX','Transferência instantânea com possibilidade de condições especiais.')+
            pgtoCard('💳','Cartão de Crédito','Parcelamento disponível. Condições a confirmar com a equipe.')+
            pgtoCard('🔖','Pagamento à Vista','Consulte nossa equipe sobre condições exclusivas para pagamento antecipado.')+
          '</div>'+
        '</div>'+

        '<div style="background:linear-gradient(135deg,'+COR.roxoEscuro+','+COR.roxoMedio+');'+
          'border-radius:14px;padding:24px 28px;'+
          'display:flex;justify-content:space-between;align-items:center;'+
          'border:1px solid rgba(170,255,0,.2);margin-bottom:22px;">'+
          '<div style="flex:1;">'+
            '<div style="font-family:'+FONT+';color:#fff;font-size:'+TY.t2+';font-weight:800;margin-bottom:8px;">'+
              'VAMOS CRIAR ALGO<br>'+
              '<span style="color:'+COR.verde+';text-shadow:0 0 12px rgba(170,255,0,.4);">INCRÍVEL JUNTOS?</span>'+
            '</div>'+
            '<div style="font-family:'+FONT+';color:rgba(255,255,255,.55);font-size:'+TY.t5+';margin-bottom:16px;line-height:1.6;">'+
              'Esta simulação é o primeiro passo.<br>Fale com nossa equipe para transformar<br>esta estimativa em seu evento dos sonhos.'+
            '</div>'+
            '<div style="display:flex;flex-direction:column;gap:6px;">'+
              '<div style="display:inline-flex;align-items:center;gap:8px;'+
                'background:linear-gradient(90deg,'+COR.roxo+','+COR.magenta+');'+
                'border-radius:20px;padding:9px 20px;width:fit-content;">'+
                '<span style="font-family:'+FONT+';color:#fff;font-size:'+TY.t4+';font-weight:700;">💬 (11) 94856-4577</span>'+
              '</div>'+
              '<div style="font-family:'+FONT+';color:rgba(255,255,255,.3);font-size:'+TY.t6+';margin-left:4px;">'+
                'www.432up.com · @432up.producoes'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div style="margin-left:32px;flex-shrink:0;">'+qrCodeWA(waNum, msgWA)+'</div>'+
        '</div>'+

        '<div style="display:flex;gap:10px;justify-content:center;">'+
          selo('+500','Eventos Realizados')+
          selo('98%','Satisfação')+
          selo('10+','Anos de Experiência')+
          selo('24h','Resposta Garantida')+
        '</div>'+

      '</div>'+
      footer(nOrc)+
    '</div>';

    return p1 + p2;
  }

  /* ─── LOADING ────────────────────────────────────────────────── */
  function showLoading() { var el = g('pdf432-overlay'); if (el) el.style.display = 'flex'; }
  function hideLoading() { var el = g('pdf432-overlay'); if (el) el.style.display = 'none'; }

  /* ─── [ALTER #3] CAPTURA COM ALTURA EXPLÍCITA ────────────────── */
  /* html2canvas pode comprimir verticalmente a página 2 quando     */
  /* sua altura real difere de windowWidth. Passar height:1122      */
  /* garante proporção correta na captura de ambas as páginas.      */
  async function capturar(el) {
    return window.html2canvas(el, {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: '#ffffff', logging: false,
      windowWidth: 794, width: 794,
      height: el.offsetHeight || 1122,
      windowHeight: el.offsetHeight || 1122
    });
  }

  /* ══════════════════════════════════════════════════════════════
     MODAL PÓS-PDF — Apple Glass
  ══════════════════════════════════════════════════════════════ */
  function injetarModalCSS() {
    if (g('css-post-pdf-modal')) return;
    var style = document.createElement('style');
    style.id = 'css-post-pdf-modal';
    style.textContent = [
      '#postPdfModal{',
        'display:none;position:fixed;inset:0;z-index:999999;',
        'align-items:center;justify-content:center;',
        'background:rgba(0,0,0,.55);',
        'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
        'padding:20px;box-sizing:border-box;',
      '}',
      '#postPdfModal.ativo{display:flex;}',
      '#postPdfModal .gpdf-box{',
        'background:rgba(28,10,60,.72);',
        'backdrop-filter:blur(32px) saturate(180%);',
        '-webkit-backdrop-filter:blur(32px) saturate(180%);',
        'border:1px solid rgba(170,255,0,.18);',
        'border-radius:24px;',
        'box-shadow:0 8px 40px rgba(0,0,0,.6),0 1px 0 rgba(170,255,0,.08) inset;',
        'padding:40px 36px 32px;',
        'text-align:center;',
        'max-width:400px;width:100%;',
        'position:relative;',
        'font-family:'+FONT+';',
        'animation:gpdfIn .38s cubic-bezier(.34,1.56,.64,1) both;',
      '}',
      '@keyframes gpdfIn{from{opacity:0;transform:scale(.86) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '#postPdfModal .gpdf-close{',
        'position:absolute;top:14px;right:16px;',
        'background:rgba(255,255,255,.08);border:none;border-radius:50%;',
        'width:30px;height:30px;color:rgba(255,255,255,.5);',
        'font-size:17px;cursor:pointer;display:flex;',
        'align-items:center;justify-content:center;',
        'transition:background .2s;line-height:1;',
      '}',
      '#postPdfModal .gpdf-close:hover{background:rgba(255,255,255,.18);}',
      '#postPdfModal .gpdf-icon{',
        'font-size:52px;margin-bottom:14px;',
        'filter:drop-shadow(0 4px 14px rgba(170,255,0,.35));',
        'animation:gpdfBounce .6s .3s cubic-bezier(.34,1.56,.64,1) both;',
      '}',
      '@keyframes gpdfBounce{from{transform:scale(0)}to{transform:scale(1)}}',
      '#postPdfModal h3{font-size:1.25rem;font-weight:800;color:#fff;margin:0 0 10px;letter-spacing:.3px;}',
      '#postPdfModal p{color:rgba(255,255,255,.6);font-size:.88rem;line-height:1.65;margin:0 0 28px;}',
      '#postPdfModal .gpdf-btn-wa{',
        'display:flex;align-items:center;justify-content:center;gap:10px;',
        'width:100%;padding:14px 20px;',
        'background:linear-gradient(135deg,#7B2FBE,#E91E8C);',
        'border:none;border-radius:14px;',
        'color:#fff;font-size:1rem;font-weight:700;',
        'cursor:pointer;letter-spacing:.3px;',
        'box-shadow:0 4px 20px rgba(233,30,140,.35);',
        'transition:opacity .2s,transform .15s;margin-bottom:10px;',
      '}',
      '#postPdfModal .gpdf-btn-wa:hover{opacity:.9;transform:translateY(-1px);}',
      '#postPdfModal .gpdf-btn-no{',
        'display:block;width:100%;padding:11px;',
        'background:rgba(255,255,255,.06);',
        'border:1px solid rgba(255,255,255,.1);border-radius:12px;',
        'color:rgba(255,255,255,.45);font-size:.82rem;',
        'cursor:pointer;transition:background .2s;',
      '}',
      '#postPdfModal .gpdf-btn-no:hover{background:rgba(255,255,255,.12);}',
      '#postPdfModal .gpdf-hint{margin-top:18px;font-size:.72rem;color:rgba(255,255,255,.25);letter-spacing:.3px;}'
    ].join('');
    document.head.appendChild(style);
  }

  function injetarModalHTML() {
    if (g('postPdfModal')) return;
    var div = document.createElement('div');
    div.id = 'postPdfModal';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.innerHTML =
      '<div class="gpdf-box">'+
        '<button class="gpdf-close" id="postPdfClose" aria-label="Fechar">×</button>'+
        '<div class="gpdf-icon">🎉</div>'+
        '<h3>Orçamento salvo!</h3>'+
        '<p>Seu PDF foi gerado com sucesso.<br>'+
           'Que tal garantir sua data agora?<br>'+
           'Nossa equipe responde em até 2h. 🚀</p>'+
        '<button class="gpdf-btn-wa" id="postPdfWA">💬 Sim, quero garantir minha data!</button>'+
        '<button class="gpdf-btn-no" id="postPdfNo">Agora não, obrigado</button>'+
        '<div class="gpdf-hint">Sem compromisso · Atendimento humanizado</div>'+
      '</div>';
    div.addEventListener('click', function (e) { if (e.target === div) fecharModal(); });
    document.body.appendChild(div);
    g('postPdfClose').addEventListener('click', fecharModal);
    g('postPdfNo').addEventListener('click', fecharModal);
  }

  function abrirModal() {
    var m = g('postPdfModal');
    if (m) { m.classList.add('ativo'); document.body.style.overflow = 'hidden'; }
  }
  function fecharModal() {
    var m = g('postPdfModal');
    if (m) { m.classList.remove('ativo'); document.body.style.overflow = ''; }
  }

  /* ─── FUNÇÃO PRINCIPAL ───────────────────────────────────────── */
  async function gerarPDF432UP() {
    if (!libsOk()) {
      alert('Bibliotecas ainda carregando. Aguarde e tente novamente.');
      return;
    }

    var dados = getDados();
    var nOrc  = gerarNumOrc();
    var ev    = dados.tipo ? dados.tipo.replace(/\s+/g, '_') : 'Evento';
    var nomeArquivo = 'PreOrcamento_432UP_' + ev + '_' + nOrc + '.pdf';

    /* ══ PASSO 1 — Resolve número WA antes de tudo ══ */
    var waNum = WA_FALLBACK;
    try {
      if (window._supabase) {
        var res = await window._supabase
          .from('site_config')
          .select('valor')
          .eq('chave', 'whatsapp_numero')
          .single();
        if (!res.error && res.data && res.data.valor) {
          var n = res.data.valor.replace(/\D/g, '');
          waNum = n.startsWith('55') ? n : '55' + n;
        }
      } else if (window.CFG && window.CFG.whatsapp) {
        var n2 = String(window.CFG.whatsapp).replace(/\D/g, '');
        waNum = n2.startsWith('55') ? n2 : '55' + n2;
      }
    } catch (e) {
      console.warn('[432UP PDF] WA fallback ativado.', e);
    }

    /* ══ PASSO 2 — MENSAGEM WHATSAPP ════════════════════════════ */
    /* [ALTER #5] Remove separadores ━━━ que ficavam feios         */
    /* na prévia do WhatsApp. Substituídos por linha em branco     */
    /* e estrutura visual limpa com emojis e negrito.              */
    var dataFmt = dados.dt
      ? new Date(dados.dt + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric'
        })
      : '';

    var msg = '';
    msg += 'Olá, equipe 432UP! 👋\n\n';
    msg += 'Acabei de montar meu orçamento pela calculadora e gostaria de dar o próximo passo. ✨\n\n';

    msg += '🎯 *DETALHES DO MEU EVENTO*\n';
    if (dados.tipo)  msg += '🎉 Tipo: *' + dados.tipo + '*\n';
    if (dataFmt)     msg += '📅 Data desejada: *' + dataFmt + '*\n';
    if (dados.local) msg += '📍 Local: *' + dados.local + '*\n';
    msg += '👥 Convidados: *' + dados.guests + ' pessoas*\n';
    msg += '⏱ Duração: *' + dados.hours + ' horas*\n';

    if (dados.pkg) {
      msg += '\n📦 *PACOTE SELECIONADO*\n';
      msg += '• ' + dados.pkg.nome + ' — ' + fmtMoeda(dados.pkg.preco) + '\n';
      msg += '  (' + dados.pkg.horas_inclusas + 'h inclusas · ' + dados.pkg.desconto_percentual + '% de desconto)\n';
    }

    var svcsExtras = dados.lines.filter(function (l) {
      return l.type === 'svc' || l.type === 'extra';
    });
    if (svcsExtras.length) {
      msg += '\n🎛️ *SERVIÇOS / EXTRAS*\n';
      svcsExtras.forEach(function (l) {
        var prefix = l.type === 'extra' ? '  ↳ ' : '• ';
        msg += prefix + l.name + ' — ' + fmtMoeda(l.val) + '\n';
      });
    }

    if (dados.obs) {
      msg += '\n📝 *Observações:* ' + dados.obs + '\n';
    }

    msg += '\n💰 *ESTIMATIVA TOTAL: ' + fmtMoeda(dados.total) + '*\n';
    if (dados.eco > 0)
      msg += '🏷 Potencial economia de ' + fmtMoeda(dados.eco) + ' com o pacote\n';

    msg += '\nGostaria de confirmar a disponibilidade da data e receber a proposta oficial. 🙏\n';
    msg += 'Podem me chamar por aqui mesmo!';

    var waURL = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);

    showLoading();

    var wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;left:-9999px;top:0;z-index:-1;'+
      'width:794px;background:#fff;font-family:'+FONT+';';
    wrap.innerHTML = buildHTML(dados, nOrc, waNum, msg);
    document.body.appendChild(wrap);

    await new Promise(function (res) {
      requestAnimationFrame(function () { setTimeout(res, 200); });
    });

    _renderQR(wrap);

    try {
      var pages  = wrap.children;
      var jsPDF  = window.jspdf.jsPDF;
      var pdf    = new jsPDF({
        orientation: 'portrait', unit: 'px',
        format: 'a4', hotfixes: ['px_scaling']
      });
      var pdfW = pdf.internal.pageSize.getWidth();
      var pdfH = pdf.internal.pageSize.getHeight();

      for (var i = 0; i < pages.length; i++) {
        var canvas  = await capturar(pages[i]);
        var imgData = canvas.toDataURL('image/jpeg', 0.92);
        var imgH    = (canvas.height * pdfW) / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, Math.min(imgH, pdfH));
      }

      pdf.setProperties({
        title:   'Pré-Orçamento 432UP' +
                 (dados.tipo  ? ' — ' + dados.tipo  : '') +
                 (dataFmt     ? ' — ' + dataFmt     : ''),
        subject: 'Simulação de pré-orçamento · não constitui proposta firme',
        author:  '432UP Produções',
        keywords:'432up, eventos, ' + (dados.tipo || 'evento') + ', orçamento, São Paulo',
        creator: '432UP Sistema v3.5.1'
      });

      if (!isEmbed) {
        var blob    = pdf.output('blob');
        var blobURL = URL.createObjectURL(blob);

        var linkDirect = document.createElement('a');
        linkDirect.style.display = 'none';
        linkDirect.href     = blobURL;
        linkDirect.download = nomeArquivo;
        document.body.appendChild(linkDirect);
        linkDirect.click();

        setTimeout(function () {
          document.body.removeChild(linkDirect);
          URL.revokeObjectURL(blobURL);
        }, 30000);

        injetarModalCSS();
        injetarModalHTML();

        var btnWA = g('postPdfWA');
        if (btnWA) {
          var novo = btnWA.cloneNode(true);
          btnWA.parentNode.replaceChild(novo, btnWA);
          novo.addEventListener('click', function () {
            window.open(waURL, '_blank');
            fecharModal();
          });
        }

        if (typeof window.toast === 'function')
          window.toast('📄 PDF gerado com sucesso!');

        await new Promise(function (r) { setTimeout(r, 700); });
        abrirModal();

      } else {
        var pdfBase64 = pdf.output('datauristring');

        try {
          window.parent.postMessage({
            type:     '432up-pdf-download',
            filename: nomeArquivo,
            base64:   pdfBase64,
            waURL:    waURL
          }, '*');
        } catch (e) {
          console.warn('[432UP PDF] postMessage falhou, fallback base64.', e);
          var fbLink = document.createElement('a');
          fbLink.href     = pdfBase64;
          fbLink.download = nomeArquivo;
          fbLink.style.display = 'none';
          document.body.appendChild(fbLink);
          fbLink.click();
          setTimeout(function () { document.body.removeChild(fbLink); }, 2000);
        }
      }

    } catch (err) {
      console.error('[432UP PDF]', err);
      if (typeof window.toast === 'function')
        window.toast('Erro ao gerar PDF. Tente novamente.');
      else alert('Erro: ' + err.message);
    } finally {
      document.body.removeChild(wrap);
      hideLoading();
    }
  }

  /* ─── EXPÕE ──────────────────────────────────────────────────── */
  window.gerarPDF432UP = gerarPDF432UP;

  /* ─── BOTÃO NO RESUMO ────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var actions = g('resumoActions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.id        = 'btnResumoPDF';
    btn.className = 'btn-resumo-pdf';
    btn.innerHTML = '📄 Baixar PDF';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      btn.innerHTML = '⏳ Gerando...';
      btn.disabled  = true;
      gerarPDF432UP().finally(function () {
        setTimeout(function () {
          btn.innerHTML = '📄 Baixar PDF';
          btn.disabled  = false;
        }, 2500);
      });
    });
    actions.appendChild(btn);
  });

})();
