 (function () {
      'use strict';
      var WHATSAPP_SUPORTE = '';
      var CATALOG_SB_URL = 'https://paetkspbfejtjjkngqej.supabase.co';
      var CATALOG_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
      var sbCatalog = supabase.createClient(CATALOG_SB_URL, CATALOG_SB_KEY);
      var parceiroAtual = null;
      var propostaEdicaoId = null;
      var formularioBloqueadoSomenteLeitura = false;
      var PKG = [];
      var SVC = [];
      var pkgOk = false;
      var svcOk = false;
      var CONFIG_TRANSPORTE = null; // { valor_por_km, origem_lat, origem_lng, origem_label }
      var activePkg = null;
      var svcState = {};          // 'off' | 'manual' | 'included'
      var svcMetragem = {};       // servico_id -> metragem atual (0 = desligado)
      var svcHoras = {};          // servico_id -> horas tarifadas (0 = desligado)
      var svcQuantidade = {};     // composer no card: servico_id -> qtd (0 = desligado no card)
      /** Carrinho do orçamento: cada entrada vira uma linha em propostas.itens (PDF/contrato). */
      var orcamentoItens = [];
      var _cartSeq = 1;
      var evConvidados = 80;
      var evTipoVal = 'Corporativo';
      var tiposEventoCarregados = [];
      // Estado da logística (ex-transporte): automático por CEP + valor editável
      var transporteAtivo = true;      // toggle "incluir logística"
      var transporteDistanciaKm = null;
      var transporteValor = 0;
      var transporteValorManual = false; // true quando o usuário sobrescreveu o valor automático
      var transporteCepValido = null;  // último CEP geocodificado com sucesso
      var transporteLatLng = null;
      // Estado da hospedagem (toggle + valor digitado; fora do desconto comercial)
      var hospedagemAtivo = false;
      var hospedagemValor = 0;
      // Estado do desconto comercial (incide APENAS sobre valor comercial / subtotal)
      // modoDesconto: 'percentual' | 'total_desejado' — controla qual campo foi a referência
      var descontoPercentual = 0;
      var descontoValor = 0;
      var valorSubtotal = 0;
      var modoDesconto = 'percentual';
      var totalDesejadoTemp = null; // apenas UI, NÃO persiste no banco
      var descontoUiUpdating = false; // evita loop entre inputs
      // Estado do pagamento (regra: PIX 100% -> desconto PIX; demais condições -> sem desconto)
      var formaPagamentoVal = null;       // 'pix' | 'cartao'
      var condicaoPagamentoVal = null;    // 'pix_integral' | 'pix_50_50' | 'cartao_parcelado_12x'
      var descontoPixPercentualConfig = 0; // valor vigente lido de co_config_financeiro.desconto_pix_percentual
      var acrescimoCartaoPercentualConfig = 0; // valor vigente lido de co_config_financeiro.acrescimo_cartao_percentual
      var descontoPixAplicadoVal = 0;      // percentual efetivamente aplicado nesta proposta (persistido)
      // Agenda de pagamento — datas, parcelas, status e descrição livre.
      // Persistido integralmente em propostas.pagamento_agenda (jsonb).
      // O Contrato apenas LÊ este objeto, sem recalcular nada.
      var pagamentoAgendaState = {
        data_pagamento: null,   // usado em pix_integral e cartao
        data_entrada: null,     // usado em pix_50_50
        data_saldo: null,       // usado em pix_50_50 (default: evento - 1 dia, editável)
        parcelas_cartao: null,  // usado em cartao
        descricao_outro: '',    // usado em outro
        status: 'pendente',           // usado em pix_integral, cartao, outro
        status_entrada: 'pendente',   // usado em pix_50_50
        status_saldo: 'pendente'      // usado em pix_50_50
      };
      // Estado do cliente (item 1 a 11 da regra de negócio: co_clientes = fonte única)
      // clienteSelecionado = { id, nome_razao, nome_fantasia, cidade, bairro, legacy }
      // legacy === true => proposta antiga com cliente_nome mas sem cliente_id vinculado
      var clienteSelecionado = null;
      var clienteBuscaTimer = null;
      // id do cliente em edição via modal (null = modal em modo "cadastrar novo")
      var mcClienteEditandoId = null;
      // Guarda o último CEP (8 dígitos) já consultado com sucesso em cada contexto,
      // para permitir nova consulta somente quando o CEP realmente mudar.
      var ultimoCepConsultadoModal = null;
      var ultimoCepConsultadoProposta = null;
      var ultimoCepConsultadoEvento = null;
      // Endereço do evento (independente do cadastro do cliente) — campos evento_*.
      // eventoEnderecoIgualCliente = true  -> endereço do evento = endereço do cliente
      // eventoEnderecoIgualCliente = false -> usa os campos evento_* preenchidos abaixo
      var eventoEnderecoIgualCliente = true;
      var eventoEndereco = {
        cep: null, logradouro: null, numero: null, complemento: null,
        bairro: null, cidade: null, uf: null, lat: null, lng: null
      };
      function getDuracaoHorasEvento() {
        var iniEl = document.getElementById('fHorarioInicio');
        var fimEl = document.getElementById('fHorarioFinal');
        var ini = iniEl ? String(iniEl.value || '').trim() : '';
        var fim = fimEl ? String(fimEl.value || '').trim() : '';
        if (!ini || !fim) return null;
        var p1 = ini.split(':');
        var p2 = fim.split(':');
        var h1 = parseInt(p1[0], 10);
        var m1 = parseInt(p1[1], 10) || 0;
        var h2 = parseInt(p2[0], 10);
        var m2 = parseInt(p2[1], 10) || 0;
        if (!isFinite(h1) || !isFinite(h2)) return null;
        var startMin = h1 * 60 + m1;
        var endMin = h2 * 60 + m2;
        if (endMin <= startMin) endMin += 24 * 60;
        return (endMin - startMin) / 60;
      }
      function formatarDuracaoHoras(horas) {
        if (horas == null || !isFinite(horas) || horas <= 0) return '—';
        var hInt = Math.floor(horas);
        var mins = Math.round((horas - hInt) * 60);
        if (mins === 60) { hInt += 1; mins = 0; }
        if (mins === 0) return hInt + 'h';
        return hInt + 'h' + String(mins).padStart(2, '0');
      }
      function atualizarLblDuracao() {
        var lbl = document.getElementById('lblHoras');
        if (!lbl) return;
        lbl.textContent = formatarDuracaoHoras(getDuracaoHorasEvento());
      }
      function normalizarUnidadeMetragem(raw) {
        var u = String(raw || '').toLowerCase().trim();
        if (u === 'm3' || u === 'm³' || u === 'metro_cubico' || u === 'metro cúbico' || u === 'cubico') return 'm3';
        if (u === 'm2' || u === 'm²' || u === 'metro_quadrado' || u === 'metro quadrado' || u === 'quadrado') return 'm2';
        return 'm';
      }
      function rotuloUnidadeMetragem(u) {
        var n = normalizarUnidadeMetragem(u);
        if (n === 'm3') return 'm³';
        if (n === 'm2') return 'm²';
        return 'm';
      }
      function fmtMoeda(n) { return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
      function fmtMoedaCurta(n) {
        var v = Number(n || 0);
        if (!isFinite(v)) v = 0;
        var arred = Math.round(v);
        if (Math.abs(v - arred) < 0.005) return 'R$ ' + arred.toLocaleString('pt-BR');
        return fmtMoeda(v);
      }
      function fmtData(d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }
      function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function toArr(v) {
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
        return [];
      }
      function showAlert(msg, type) {
        var el = document.getElementById('formAlert');
        if (!el) return;
        el.textContent = msg;
        el.className = 'p-3 rounded-xl text-xs font-semibold show ' +
          (type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30');
      }
      function waLink() {
        var msg = encodeURIComponent('Olá! Estou montando uma proposta no Portal Partner e os valores não carregaram. Podem me ajudar?');
        return 'https://wa.me/' + (window.CONTATO_WHATSAPP || WHATSAPP_SUPORTE) + '?text=' + msg;
      }
      function catalogUnavailableHTML(label) {
        return '<div class="catalog-unavailable">' +
          '<div class="cu-icon">✦</div>' +
          '<div class="cu-title">Nossos valores de ' + esc(label) + ' estão sendo atualizados no momento</div>' +
          '<div class="cu-desc">Para não te passar uma informação incorreta, preferimos não estimar agora. Se preferir, ou for urgente, fale direto com a nossa equipe.</div>' +
          '<a class="cu-wa" href="' + waLink() + '" target="_blank" rel="noopener noreferrer">💬 Chamar no WhatsApp</a>' +
        '</div>';
      }
      function normPkg(p) {
        p.servicos_ids = toArr(p.servicos_ids).map(function (s) { return String(s).toLowerCase().trim(); });
        p.itens = toArr(p.itens);
        p.horas = Number(p.horas_inclusas) || 4;
        p.desconto_pct = Number(p.desconto_percentual) || 0;
        p.preco = Number(p.preco_pacote != null ? p.preco_pacote : p.preco) || 0;
        p.nome = p.nome || '';
        p.descricao = p.ideal_para || '';
        p.pacote_id = String(p.pacote_id || '').toLowerCase().trim();
        return p;
      }
      function normSvc(s) {
        s.faixas = toArr(s.faixas);                 // faixas de convidados/som (economia de escala)
        s.faixas_metro = toArr(s.faixas_metro);      // faixas de economia de escala por metro
        s.valor_base = Number(s.valor_base) || 0;
        s.valor_hora = Number(s.valor_por_hora) || 0;
        s.servico_id = String(s.servico_id || '').toLowerCase().trim();
        s.nome = s.nome_exibicao || s.nome || '';
        s.descricao = s.descricao || '';
        s.icone = s.icone || '🎵';
        // Componente por pessoa/convidado
        s.valor_por_pessoa = Number(s.valor_por_pessoa) || 0;
        s.calc_por_pessoa = (s.calc_por_pessoa === true || s.calc_por_pessoa === 'true' || s.calc_por_pessoa === 't');
        s.calc_por_hora = (s.calc_por_hora === true || s.calc_por_hora === 'true' || s.calc_por_hora === 't');
        // Campos do tipo "por metro"
        s.metragem_minima = s.metragem_minima != null ? Number(s.metragem_minima) : null;
        s.metragem_maxima = s.metragem_maxima != null ? Number(s.metragem_maxima) : null; // null = sem teto
        s.valor_por_metro = Number(s.valor_por_metro) || 0;
        s.passo_metro = Number(s.passo_metro) || 1;
        s.isPorMetro = s.metragem_minima != null && s.metragem_minima > 0;
        s.unidade_metragem = normalizarUnidadeMetragem(s.unidade_metragem || s.unidade_metro || s.unidade);
        // Campos do tipo "por hora" (tarifação independente do METRO e de calc_por_hora)
        s.horas_minimas = s.horas_minimas != null ? Number(s.horas_minimas) : null;
        s.horas_maximas = s.horas_maximas != null ? Number(s.horas_maximas) : null;
        s.passo_hora = Number(s.passo_hora) || 1;
        s.isPorHora = s.horas_minimas != null && s.horas_minimas > 0;
        // Campos do tipo "por unidade" (pode coexistir com metro e/ou hora)
        s.quantidade_minima = s.quantidade_minima != null ? Number(s.quantidade_minima) : null;
        s.quantidade_maxima = s.quantidade_maxima != null ? Number(s.quantidade_maxima) : null;
        s.passo_quantidade = Number(s.passo_quantidade) || 1;
        s.valor_por_unidade = Number(s.valor_por_unidade) || 0;
        s.isPorUnidade = s.quantidade_minima != null && s.quantidade_minima > 0;
        return s;
      }
      async function carregarCatalogo() {
        pkgOk = false;
        svcOk = false;
        try {
          var rp = await sbCatalog.from('co_calc_pacotes').select('*').eq('ativo', true).order('ordem', { ascending: true });
          if (rp.error) throw rp.error;
          PKG = (rp.data || []).map(normPkg);
          pkgOk = true;
        } catch (e) {
          console.error('[432UP Partner] Falha ao carregar pacotes:', e);
          PKG = [];
          pkgOk = false;
        }
        try {
          var rs = await sbCatalog.from('co_calculadora_valores').select('*').eq('ativo', true);
          if (rs.error) throw rs.error;
          SVC = (rs.data || []).map(normSvc);
          svcOk = true;
        } catch (e) {
          console.error('[432UP Partner] Falha ao carregar serviços:', e);
          SVC = [];
          svcOk = false;
        }
        SVC.forEach(function (s) {
          svcState[s.servico_id] = 'off';
          svcMetragem[s.servico_id] = 0;
          svcHoras[s.servico_id] = 0;
          svcQuantidade[s.servico_id] = 0;
        });
      }
      async function carregarConfigTransporte() {
        try {
          var r = await sbCatalog.from('co_config_transporte').select('*').eq('ativo', true).limit(1).single();
          if (r.error) throw r.error;
          CONFIG_TRANSPORTE = {
            valor_por_km: Number(r.data.valor_por_km) || 0,
            origem_lat: Number(r.data.origem_lat),
            origem_lng: Number(r.data.origem_lng),
            origem_label: r.data.origem_label || 'Centro de São Paulo'
          };
        } catch (e) {
          console.error('[432UP Partner] Falha ao carregar config de logística:', e);
          CONFIG_TRANSPORTE = null;
        }
      }
      // Lê o percentual vigente do desconto PIX em public.co_config_financeiro.
      // O percentual NUNCA é hardcoded — vem sempre desta consulta. Se a leitura
      // falhar, o desconto PIX simplesmente não é aplicado (fica 0), sem travar
      // o restante da proposta.
      async function carregarConfigFinanceiro() {
        try {
          var r = await sbPartner.from('co_config_financeiro').select('*').limit(1).single();
          if (r.error) throw r.error;
          descontoPixPercentualConfig = Number(r.data.desconto_pix_percentual) || 0;
          acrescimoCartaoPercentualConfig = Number(r.data.acrescimo_cartao_percentual) || 0;
        } catch (e) {
          console.error('[432UP Partner] Falha ao carregar config financeiro:', e);
          descontoPixPercentualConfig = 0;
          acrescimoCartaoPercentualConfig = 0;
        }
      }
      async function carregarTiposEvento() {
        var container = document.getElementById('chipsTipo');
        if (!container) return;
        try {
          var res = await sbPartner
            .from('co_tipos_evento')
            .select('id, nome, ativo, ordem')
            .eq('ativo', true)
            .order('ordem', { ascending: true });
          if (res.error) throw res.error;
          tiposEventoCarregados = res.data || [];
          if (!tiposEventoCarregados.length) {
            container.innerHTML = '<span class="text-[11px] text-slate-500">Nenhum tipo ativo</span>';
            return;
          }
          var html = tiposEventoCarregados.map(function (t) {
            var ativo = (t.nome === evTipoVal) ? ' active' : '';
            return '<span class="chip-item' + ativo + '" data-val="' + esc(t.nome) + '">' + esc(t.nome) + '</span>';
          }).join('');
          container.innerHTML = html;
          // se nenhum chip ficou ativo (evTipoVal não está na lista), ativa o primeiro
          if (!container.querySelector('.chip-item.active') && tiposEventoCarregados.length) {
            var primeiro = container.querySelector('.chip-item');
            if (primeiro) {
              primeiro.classList.add('active');
              evTipoVal = primeiro.dataset.val;
            }
          }
          container.querySelectorAll('.chip-item').forEach(function (c) {
            c.addEventListener('click', function () {
              if (formularioBloqueadoSomenteLeitura) return;
              container.querySelectorAll('.chip-item').forEach(function (x) { x.classList.remove('active'); });
              c.classList.add('active');
              evTipoVal = c.dataset.val;
              recalc();
            });
          });
        } catch (e) {
          console.error('[432UP Partner] Falha ao carregar tipos de evento:', e);
          // fallback seguro: mantém chips estáticos mínimos para não quebrar a proposta
          if (!container.children.length) {
            container.innerHTML =
              '<span class="chip-item" data-val="Casamento">Casamento</span>' +
              '<span class="chip-item" data-val="Aniversário">Aniversário</span>' +
              '<span class="chip-item active" data-val="Corporativo">Corporativo</span>' +
              '<span class="chip-item" data-val="Formatura">Formatura</span>';
            container.querySelectorAll('.chip-item').forEach(function (c) {
              c.addEventListener('click', function () {
                if (formularioBloqueadoSomenteLeitura) return;
                container.querySelectorAll('.chip-item').forEach(function (x) { x.classList.remove('active'); });
                c.classList.add('active');
                evTipoVal = c.dataset.val;
                recalc();
              });
            });
          }
        }
      }
      partnerRequireAuth().then(async function (parceiro) {
        parceiroAtual = parceiro;
        partnerFillSidebar(parceiro);
        var roleNorm = String(parceiro.role || parceiro.nivel || '').toLowerCase().trim();
        var isAdmin = roleNorm === 'admin' || roleNorm === 'master';
        if (typeof window.updateAdminState === 'function') window.updateAdminState(isAdmin);
        document.getElementById('sumComissaoPct').textContent = Number(parceiro.comissao_padrao_pct).toFixed(0);
        await carregarCatalogo();
        await carregarConfigTransporte();
        await carregarConfigFinanceiro();
        await carregarTiposEvento();
        renderPacotes();
        renderServicos();
        bindEvents();
        bindClienteEvents();
        bindEventoEnderecoEvents();
        bindPagamentoEvents();
        atualizarLabelFCep();
        setupMobileBarAutoFade();
        aplicarPermissaoDesconto();
        var params = new URLSearchParams(window.location.search);
        propostaEdicaoId = params.get('id');
        if (propostaEdicaoId) {
          carregarPropostaExistente(propostaEdicaoId);
        } else {
          aplicarHorarioPadrao();
          recalc();
        }
      });
      // Preenche os campos de horário com a hora atual do dispositivo,
      // sempre com os minutos zerados (ex.: 16:37 -> 16:00). Só é chamado
      // ao criar uma proposta nova; não sobrescreve valores já salvos
      // (carregarPropostaExistente não chama esta função).
      function aplicarHorarioPadrao() {
        var agora = new Date();
        var hIni = agora.getHours();
        var horaAtual = String(hIni).padStart(2, '0') + ':00';
        var hFim = (hIni + 4) % 24;
        var horaFim = String(hFim).padStart(2, '0') + ':00';
        var campoInicio = document.getElementById('fHorarioInicio');
        var campoFinal = document.getElementById('fHorarioFinal');
        if (campoInicio && !campoInicio.value) campoInicio.value = horaAtual;
        if (campoFinal && !campoFinal.value) campoFinal.value = horaFim;
        atualizarLblDuracao();
      }
      function setupMobileBarAutoFade() {
        var target = document.getElementById('sidebarTargetAnchor');
        var mobileBar = document.getElementById('mobileBarraResumo');
        if (!target || !mobileBar) return;
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              mobileBar.classList.add('hide-bar');
            } else {
              mobileBar.classList.remove('hide-bar');
            }
          });
        }, { threshold: 0.15 });
        observer.observe(target);
      }
      function aplicarTravaSomenteLeitura(statusTexto) {
        formularioBloqueadoSomenteLeitura = true;
        showAlert('Esta proposta foi ' + statusTexto.toUpperCase() + ' e está bloqueada para edições pelo parceiro.', 'error');
        document.querySelectorAll('input, textarea, select').forEach(function (el) {
          el.disabled = true;
          el.classList.add('opacity-60', 'cursor-not-allowed');
        });
        var containerAcoes = document.getElementById('containerAcoesBotoes');
        if (containerAcoes) {
          containerAcoes.innerHTML =
            '<div class="p-3.5 rounded-xl bg-slate-900/90 text-center border border-white/10 space-y-2">' +
              '<span class="text-xs font-bold text-amber-400 block">🔒 Modo Somente Leitura</span>' +
              '<p class="text-[11px] text-slate-400">Pedidos ' + esc(statusTexto) + 's não podem sofrer alterações diretas.</p>' +
              '<a href="propostas.html" class="inline-block mt-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition">← Voltar para Minhas Propostas</a>' +
            '</div>';
        }
        var containerMob = document.getElementById('containerAcoesMobile');
        if (containerMob) {
          containerMob.innerHTML = '<a href="propostas.html" class="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/30">Voltar</a>';
        }
      }
      async function carregarClienteDaProposta(p) {
        if (p.cliente_id) {
          try {
            var res = await sbPartner
              .from('co_clientes')
              .select('id, nome_razao, nome_fantasia, cidade, bairro, cep, cpf_cnpj, responsavel_legal, contato_nome, contato_cargo')
              .eq('id', p.cliente_id)
              .maybeSingle();
            if (!res.error && res.data) {
              clienteSelecionado = res.data;
            } else {
              // cliente_id não encontrado/visível (RLS) — cai para compatibilidade por nome
              clienteSelecionado = p.cliente_nome ? { id: null, nome_razao: p.cliente_nome, legacy: true } : null;
            }
          } catch (e) {
            console.error('[432UP Partner] Falha ao carregar cliente vinculado:', e);
            clienteSelecionado = p.cliente_nome ? { id: null, nome_razao: p.cliente_nome, legacy: true } : null;
          }
        } else if (p.cliente_nome) {
          // Proposta antiga: possui cliente_nome mas não cliente_id (compatibilidade — regra 9)
          clienteSelecionado = { id: null, nome_razao: p.cliente_nome, legacy: true };
        } else {
          clienteSelecionado = null;
        }
        setClienteSelecionadoUI();
      }
      function carregarPropostaExistente(id) {
        sbPartner.from('propostas').select('*').eq('id', id).single().then(async function (res) {
          if (res.data) {
            var p = res.data;
            var stNorm = String(p.status || '').toLowerCase();
            document.getElementById('pageTitle').textContent = 'Proposta #' + (p.numero || id) + ' — ' + (p.cliente_nome || '');
            await carregarClienteDaProposta(p);
            document.getElementById('fData').value = p.data_evento || '';
            atualizarLblDuracao();
            if (p.local_evento) document.getElementById('fLocal').value = p.local_evento;
            if (p.observacoes) document.getElementById('fObs').value = p.observacoes;
            if (p.cep_cliente) {
              // Regra 3 (tela FORA): carrega o CEP salvo do cliente, aplicando a
              // máscara 00000-000, sem disparar autocomplete/duplicar dados.
              document.getElementById('fCep').value = aplicarMascaraCep(p.cep_cliente);
              var cepLimpoExistente = String(p.cep_cliente).replace(/\D/g, '');
              if (cepLimpoExistente.length === 8) ultimoCepConsultadoProposta = cepLimpoExistente;
            }
            transporteAtivo = p.transporte_incluido !== false;
            setToggleVisual(transporteAtivo);
            if (p.distancia_km != null) {
              transporteDistanciaKm = Number(p.distancia_km);
              transporteLatLng = (p.lat_cliente != null && p.lng_cliente != null) ? { lat: p.lat_cliente, lng: p.lng_cliente } : null;
              transporteCepValido = p.cep_cliente || null;
              atualizarStatusTransporte('ok', 'Distância: ' + transporteDistanciaKm.toFixed(1) + ' km de ' + (CONFIG_TRANSPORTE ? CONFIG_TRANSPORTE.origem_label : 'origem'));
            }
            if (p.valor_transporte != null && Number(p.valor_transporte) > 0) {
              transporteValor = Number(p.valor_transporte) || 0;
              transporteValorManual = true; // preserva valor salvo (pode ter sido editado)
              var elLogLoad = document.getElementById('fValorLogistica');
              if (elLogLoad) elLogLoad.value = fmtMoeda(transporteValor);
            }
            // Hospedagem
            hospedagemAtivo = p.hospedagem_incluida === true;
            hospedagemValor = Number(p.valor_hospedagem) || 0;
            setToggleHospedagemVisual(hospedagemAtivo);
            var elHospLoad = document.getElementById('fValorHospedagem');
            if (elHospLoad && hospedagemValor > 0) elHospLoad.value = fmtMoeda(hospedagemValor);
            // Desconto comercial — propostas antigas sem os campos ficam em 0 (sem desconto)
            descontoPercentual = Number(p.desconto_percentual) || 0;
            descontoValor = Number(p.desconto_valor) || 0;
            valorSubtotal = Number(p.valor_subtotal) || 0;
            if (descontoPercentual > 0 || descontoValor > 0) {
              modoDesconto = 'percentual';
              totalDesejadoTemp = null;
            } else {
              modoDesconto = 'percentual';
              totalDesejadoTemp = null;
              descontoPercentual = 0;
              descontoValor = 0;
            }
            // Pagamento — restaura forma/condição salvas e re-renderiza os chips
            formaPagamentoVal = p.forma_pagamento || null;
            condicaoPagamentoVal = p.condicao_pagamento || null;
            descontoPixAplicadoVal = Number(p.desconto_pix_aplicado) || 0;
            var elOutraFormaPagamento = document.getElementById('fOutraFormaPagamento');
            if (elOutraFormaPagamento) elOutraFormaPagamento.value = p.forma_pagamento_outro || '';
            // Agenda de pagamento (datas/parcelas/status/descrição) — restaura
            // exatamente o que foi salvo, sem inventar/recalcular nada.
            var agendaSalva = p.pagamento_agenda || {};
            pagamentoAgendaState = {
              data_pagamento: agendaSalva.data_pagamento || null,
              data_entrada: agendaSalva.data_entrada || null,
              data_saldo: agendaSalva.data_saldo || null,
              parcelas_cartao: agendaSalva.parcelas_cartao || null,
              descricao_outro: agendaSalva.descricao_outro || '',
              status: agendaSalva.status || 'pendente',
              status_entrada: agendaSalva.status_entrada || 'pendente',
              status_saldo: agendaSalva.status_saldo || 'pendente'
            };
            document.querySelectorAll('#chipsFormaPagamento .chip-item').forEach(function (c) {
              c.classList.toggle('active', c.dataset.val === formaPagamentoVal);
            });
            renderCondicoesPagamento();
            // Regras 7 e 9: propostas antigas não têm evento_endereco_igual_cliente
            // no retorno (undefined) e o banco trata registros antigos como true;
            // tratamos undefined/null da mesma forma que true.
            eventoEnderecoIgualCliente = (p.evento_endereco_igual_cliente !== false);
            document.getElementById('fEventoEnderecoIgualCliente').checked = eventoEnderecoIgualCliente;
            document.getElementById('blocoEnderecoEvento').classList.toggle('hidden', eventoEnderecoIgualCliente);
            atualizarLabelFCep();
            eventoEndereco = {
              cep: p.evento_cep || null,
              logradouro: p.evento_logradouro || null,
              numero: p.evento_numero || null,
              complemento: p.evento_complemento || null,
              bairro: p.evento_bairro || null,
              cidade: p.evento_cidade || null,
              uf: p.evento_uf || null,
              lat: p.evento_lat != null ? Number(p.evento_lat) : null,
              lng: p.evento_lng != null ? Number(p.evento_lng) : null
            };
            if (!eventoEnderecoIgualCliente) {
              if (eventoEndereco.cep) document.getElementById('fEventoCep').value = aplicarMascaraCep(eventoEndereco.cep);
              if (eventoEndereco.logradouro) document.getElementById('fEventoLogradouro').value = eventoEndereco.logradouro;
              if (eventoEndereco.numero) document.getElementById('fEventoNumero').value = eventoEndereco.numero;
              if (eventoEndereco.complemento) document.getElementById('fEventoComplemento').value = eventoEndereco.complemento;
              if (eventoEndereco.bairro) document.getElementById('fEventoBairro').value = eventoEndereco.bairro;
              if (eventoEndereco.cidade) document.getElementById('fEventoCidade').value = eventoEndereco.cidade;
              if (eventoEndereco.uf) document.getElementById('fEventoUf').value = eventoEndereco.uf;
              if (eventoEndereco.cep) ultimoCepConsultadoEvento = String(eventoEndereco.cep).replace(/\D/g, '');
              // Endereço do evento é o efetivo para transporte: usa os dados salvos.
              recalcularTransporteEfetivo();
            }
            if (p.horario_inicio) {
              var hi = String(p.horario_inicio);
              // aceita "19:30:00" ou "19:30"
              if (hi.length >= 5) document.getElementById('fHorarioInicio').value = hi.slice(0, 5);
            } else {
              document.getElementById('fHorarioInicio').value = '';
            }
            if (p.horario_final) {
              var hf = String(p.horario_final);
              // aceita "23:30:00" ou "23:30"
              if (hf.length >= 5) document.getElementById('fHorarioFinal').value = hf.slice(0, 5);
            } else {
              document.getElementById('fHorarioFinal').value = '';
            }
            atualizarLblDuracao();
            if (p.convidados_estimados) {
              evConvidados = Number(p.convidados_estimados) || 80;
              var matchChip = false;
              document.querySelectorAll('#chipsConvidados .chip-item').forEach(function (c) {
                var isMatch = parseInt(c.dataset.val, 10) === evConvidados;
                c.classList.toggle('active', isMatch);
                if (isMatch) matchChip = true;
              });
              var livreEl = document.getElementById('fConvidadosLivre');
              if (livreEl) {
                livreEl.value = matchChip ? '' : String(evConvidados);
              }
            }
            if (p.tipo_evento) {
              evTipoVal = p.tipo_evento;
              document.querySelectorAll('#chipsTipo .chip-item').forEach(function (c) {
                c.classList.toggle('active', c.dataset.val === evTipoVal);
              });
            }
            if (Array.isArray(p.itens)) {
              orcamentoItens = [];
              p.itens.forEach(function (it) {
                if (it.tipo === 'pacote') activePkg = it.id;
                if (it.tipo === 'servico') {
                  orcamentoItens.push({
                    cart_id: it.cart_id || novoCartId(),
                    tipo: 'servico',
                    id: it.id,
                    nome: it.nome || it.id,
                    quantidade: (it.quantidade != null && Number(it.quantidade) > 0) ? Number(it.quantidade) : 1,
                    valor: Number(it.valor) || 0,
                    preco_unitario: it.preco_unitario != null ? Number(it.preco_unitario) : null,
                    metragem: it.metragem != null ? Number(it.metragem) : null,
                    horas: it.horas != null ? Number(it.horas) : null,
                    unidade_metragem: it.unidade_metragem || null,
                    valor_por_metro_aplicado: it.valor_por_metro_aplicado,
                    valor_por_hora_aplicado: it.valor_por_hora_aplicado,
                    faixa_aplicada: it.faixa_aplicada || null
                  });
                }
              });
            }
            updateUI();
            renderServicos();
            recalc();
            if (stNorm === 'aprovada' || stNorm === 'cancelada') {
              aplicarTravaSomenteLeitura(stNorm);
            }
          }
        });
      }
      function renderPacotes() {
        var grid = document.getElementById('gridPacotes');
        if (!pkgOk) {
          grid.innerHTML = catalogUnavailableHTML('pacotes');
          return;
        }
        if (!PKG.length) {
          grid.innerHTML = '<div class="catalog-unavailable"><div class="cu-icon">✦</div><div class="cu-title">Nenhum pacote ativo no momento</div><div class="cu-desc">Você ainda pode montar a proposta com serviços avulsos abaixo.</div></div>';
          return;
        }
        grid.innerHTML = PKG.map(function (p) {
          var nomesInc = nomesServicosInclusosPacote(p);
          var linhaInclui = nomesInc.length
            ? '<span class="card-inclui">' + nomesInc.map(function (n) {
                return '<span class="card-inclui-item">' + esc(n) + '</span>';
              }).join('') + '</span>'
            : '';
          return '<div data-pkg="' + p.pacote_id + '" class="glass-card-interactive p-4 rounded-xl cursor-pointer">' +
            '<span class="block text-xs font-bold text-amber-400">Pacote ' + esc(p.nome) + '</span>' +
            '<span class="block text-base font-bold text-white mt-1">' + fmtMoeda(p.preco) + '</span>' +
            '<span class="block text-[10px] text-slate-400 mt-1">' + p.horas + 'h inclusas (' + p.desconto_pct + '% OFF)</span>' +
            linhaInclui +
            (p.descricao ? '<span class="card-desc">' + esc(p.descricao) + '</span>' : '') +
          '</div>';
        }).join('');
        grid.querySelectorAll('[data-pkg]').forEach(function (card) {
          card.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var pid = card.dataset.pkg;
            if (activePkg === pid) {
              activePkg = null;
              orcamentoItens = [];
              SVC.forEach(function (s) { svcState[s.servico_id] = 'off'; svcMetragem[s.servico_id] = 0; svcHoras[s.servico_id] = 0; svcQuantidade[s.servico_id] = 0; });
            } else {
              activePkg = pid;
              var pObj = PKG.find(function (x) { return x.pacote_id === pid; });
              var pacoteItens = (pObj.servicos_ids && pObj.servicos_ids.length) ? pObj.servicos_ids : pObj.itens;
              SVC.forEach(function (s) {
                var incluido = pacoteItens.indexOf(s.servico_id) >= 0;
                svcState[s.servico_id] = incluido ? 'included' : 'off';
                if (incluido && s.isPorMetro) {
                  svcMetragem[s.servico_id] = s.metragem_minima;
                } else if (!incluido) {
                  svcMetragem[s.servico_id] = 0;
                }
                if (incluido && s.isPorHora) {
                  svcHoras[s.servico_id] = s.horas_minimas;
                } else if (!incluido) {
                  svcHoras[s.servico_id] = 0;
                }
                if (incluido) {
                  svcQuantidade[s.servico_id] = 1;
                } else {
                  svcQuantidade[s.servico_id] = 0;
                }
              });
            }
            updateUI();
            renderServicos();
            recalc();
          });
        });
      }

      // ========================================================================
      // Wrappers que adaptam o estado da aplicação às funções puras de
      // nova-proposta-calculos.js (componentes de preço CUMULATIVOS).
      // ========================================================================
      function qtdServico(sid) {
        var q = Number(svcQuantidade[sid]) || 0;
        return q > 0 ? q : 0;
      }
      /** Multiplica o preço unitário já calculado pela quantidade (≥1 quando ligado). */
      function aplicarQuantidade(precoUnitario, sid) {
        var q = qtdServico(sid);
        if (q <= 0) return 0;
        return (Number(precoUnitario) || 0) * q;
      }
      // Resumo curto da forma de cobrança do serviço, exibido no card abaixo do
      // preço. Mostra apenas os componentes ativos (ex.: "Cobrado por hora +
      // pessoa"), sem valores, intervalos de faixa ou fórmulas.
      function composicaoPrecoTexto(s) {
        var partes = [];
        if ((s.calc_por_hora && s.valor_hora) || s.isPorHora) partes.push('hora');
        if (s.calc_por_pessoa && s.valor_por_pessoa) partes.push('pessoa');
        if (s.isPorMetro || (s.valor_por_metro && (s.metragem_minima != null))) partes.push('m²');
        if (s.faixas && s.faixas.some(function (f) { return f.adicional; })) partes.push('faixa');
        if (!partes.length) return '';
        return 'Cobrado por ' + partes.join(' + ');
      }
      function idsServicosInclusosPacote(p) {
        if (!p) return [];
        var raw = (p.servicos_ids && p.servicos_ids.length) ? p.servicos_ids : toArr(p.itens);
        return raw.map(function (x) { return String(x).toLowerCase().trim(); }).filter(Boolean);
      }
      function servicosInclusosPacote(p) {
        var ids = idsServicosInclusosPacote(p);
        if (!ids.length) return [];
        return SVC.filter(function (s) { return ids.indexOf(s.servico_id) >= 0; });
      }
      function nomesServicosInclusosPacote(p) {
        return servicosInclusosPacote(p).map(function (s) { return s.nome; });
      }
      function rotuloQtyIncluso(s, horasRef, metroRef, qtdRef) {
        var partes = [];
        if (s.isPorHora) {
          var h = horasRef != null ? horasRef : (s.horas_minimas || 0);
          if (h > 0) partes.push(h + 'h');
        }
        if (s.isPorMetro) {
          var m = metroRef != null ? metroRef : (s.metragem_minima || 0);
          if (m > 0) partes.push(m + ' ' + rotuloUnidadeMetragem(s.unidade_metragem));
        }
        var q = qtdRef != null ? Number(qtdRef) : 1;
        if (q > 1) partes.push(q + ' un');
        return partes.length ? ' (' + partes.join(' + ') + ')' : '';
      }

      function novoCartId() {
        return 'c' + (_cartSeq++);
      }
      function resetComposerServico(sid) {
        svcQuantidade[sid] = 0;
        svcMetragem[sid] = 0;
        svcHoras[sid] = 0;
        svcState[sid] = 'off';
      }
      function resetTodosComposers() {
        SVC.forEach(function (s) { resetComposerServico(s.servico_id); });
      }
      /** Preço unitário atual do composer (1 un) para o serviço s. */
      function precoUnitarioComposer(s) {
        var horasComposer = Number(svcHoras[s.servico_id]) || 0;
        var horasEvento = (typeof getDuracaoHorasEvento === 'function') ? getDuracaoHorasEvento() : null;
        var horasEfetivas = horasComposer > 0 ? horasComposer : (horasEvento != null ? horasEvento : 0);
        return window.precoUnitarioComposer(s, {
          metragem: svcMetragem[s.servico_id] || 0,
          horas: horasEfetivas,
          temPacoteAtivo: !!activePkg,
          convidados: typeof evConvidados !== 'undefined' ? evConvidados : 0
        });
      }
      function montarLinhaCarrinho(s) {
        var qtd = Number(svcQuantidade[s.servico_id]) || 0;
        if (qtd <= 0) qtd = 1;
        var horasComposer = Number(svcHoras[s.servico_id]) || 0;
        var horasEvento = (typeof getDuracaoHorasEvento === 'function') ? getDuracaoHorasEvento() : null;
        var horasEfetivas = horasComposer > 0 ? horasComposer : (horasEvento != null ? horasEvento : 0);
        return window.montarLinhaCarrinho(s, {
          qtd: qtd,
          metragem: svcMetragem[s.servico_id] || 0,
          horas: horasEfetivas,
          temPacoteAtivo: !!activePkg,
          convidados: typeof evConvidados !== 'undefined' ? evConvidados : 0,
          cartId: novoCartId()
        });
      }
      // valorReferenciaAvulso e calcularPrecoServico / calcularValor* vêm de calculos.js
      // Adaptamos apenas a assinatura usada internamente (convidados do evento).
      function valorReferenciaAvulsoLocal(s, horasRef, metroRef, qtdRef) {
        var conv = typeof evConvidados !== 'undefined' ? evConvidados : 0;
        return window.valorReferenciaAvulso(s, horasRef, metroRef, qtdRef, conv);
      }
      // Alias para não quebrar chamadas existentes que usam o nome local
      var valorReferenciaAvulso = valorReferenciaAvulsoLocal;

      function rotuloEspecificacaoItem(it) {
        var partes = [];
        if (it.quantidade != null && Number(it.quantidade) > 0) {
          partes.push(Number(it.quantidade) + ' un.');
        }
        if (it.metragem != null && Number(it.metragem) > 0) {
          var u = rotuloUnidadeMetragem(it.unidade_metragem || 'm');
          partes.push(Number(it.metragem) + ' ' + u);
        }
        if (it.horas != null && Number(it.horas) > 0) {
          partes.push(Number(it.horas) + ' h');
        }
        return partes.length ? partes.join(' · ') : '—';
      }
      function rotuloNomeResumo(it) {
        var esp = rotuloEspecificacaoItem(it);
        if (esp && esp !== '—') return it.nome + ' (' + esp + ')';
        return it.nome;
      }
      function adicionarAoCarrinho(sid) {
        if (formularioBloqueadoSomenteLeitura) return;
        var s = SVC.find(function (x) { return x.servico_id === sid; });
        if (!s) return;
        var ligado = (svcQuantidade[sid] > 0) || (svcMetragem[sid] > 0) || (svcHoras[sid] > 0) || svcState[sid] === 'manual';
        if (!ligado) {
          // liga com mínimos e adiciona na hora
          svcQuantidade[sid] = 1;
          svcState[sid] = 'manual';
          if (s.isPorMetro) svcMetragem[sid] = s.metragem_minima;
          if (s.isPorHora) svcHoras[sid] = s.horas_minimas;
        }
        var linha = montarLinhaCarrinho(s);
        if (!(linha.valor > 0) && !(linha.quantidade > 0)) {
          toast('Configure o item antes de adicionar', 'err');
          return;
        }
        orcamentoItens.push(linha);
        resetComposerServico(sid);
        if (typeof showToast === 'function') showToast('Item adicionado ao orçamento. Pode adicionar mais.', 'ok');
        updateUI();
        renderServicos();
        recalc();
      }
      function removerDoCarrinho(cartId) {
        if (formularioBloqueadoSomenteLeitura) return;
        orcamentoItens = orcamentoItens.filter(function (it) { return it.cart_id !== cartId; });
        renderServicos();
        recalc();
      }

      function renderServicos() {
        var grid = document.getElementById('gridServicos');
        if (!svcOk) {
          grid.innerHTML = catalogUnavailableHTML('serviços');
          return;
        }
        if (!SVC.length) {
          grid.innerHTML = '<div class="catalog-unavailable"><div class="cu-icon">✦</div><div class="cu-title">Nenhum serviço ativo no momento</div><div class="cu-desc">Fale com a equipe para montar a proposta manualmente.</div></div>';
          return;
        }
        grid.innerHTML = SVC.map(function (s) {
          var qtdAtual = svcQuantidade[s.servico_id] || 0;
          var metragemAtual = svcMetragem[s.servico_id] || 0;
          var horasAtual = svcHoras[s.servico_id] || 0;
          var st = svcState[s.servico_id];
          var ligado = qtdAtual > 0 || metragemAtual > 0 || horasAtual > 0 || st === 'manual';
          if (ligado && qtdAtual <= 0) {
            qtdAtual = 1;
            svcQuantidade[s.servico_id] = 1;
          }
          if (ligado && s.isPorMetro && !(metragemAtual > 0) && s.metragem_minima) {
            metragemAtual = s.metragem_minima;
            svcMetragem[s.servico_id] = metragemAtual;
          }
          if (ligado && s.isPorHora && !(horasAtual > 0) && s.horas_minimas) {
            horasAtual = s.horas_minimas;
            svcHoras[s.servico_id] = horasAtual;
          }

          var noCarrinho = orcamentoItens.some(function (it) { return it.id === s.servico_id; });
          var cls = 'glass-card-interactive p-4 rounded-xl';
          if (ligado) cls += ' selected';
          else if (noCarrinho) cls += ' in-cart';
          if (!ligado) cls += ' cursor-pointer';
          var attrs = 'data-svc="' + s.servico_id + '" id="card-svc-' + s.servico_id + '" class="' + cls + '" data-qtd="1"' +
            (s.isPorMetro ? ' data-metro="1"' : '') +
            (s.isPorHora ? ' data-hora="1"' : '');

          var precoUnit = precoUnitarioComposer(s);
          var precoLinha = ligado ? precoUnit * Math.max(1, qtdAtual) : precoUnit;
          var resumoCobranca = composicaoPrecoTexto(s);

          var html = '<div ' + attrs + '>';
          html += '<div class="flex items-start justify-between gap-2">';
          html += '<span class="block text-xs font-bold text-white">' + s.icone + ' ' + esc(s.nome) + '</span>';
          if (ligado) {
            html += '<button type="button" class="cart-add-btn" data-cart-add="' + s.servico_id + '" title="Adicionar ao orçamento" aria-label="Adicionar ao orçamento">+</button>';
          }
          html += '</div>';
          if (s.descricao) html += '<span class="card-desc">' + esc(s.descricao) + '</span>';

          html += '<div class="svc-qty-actions">';
          if (ligado) {
            // Quantidade (sempre)
            html += '<div class="ctrl-block">' +
              '<div class="qty-row">' +
                '<div class="metro-btn" data-qtd-menos="' + s.servico_id + '">−</div>' +
                '<div class="qty-mid"><input class="qty-input" type="number" inputmode="numeric" data-qty-un="' + s.servico_id + '" value="' + Math.max(1, qtdAtual) + '" min="1" step="1"><span class="qty-unit">un</span></div>' +
                '<div class="metro-btn" data-qtd-mais="' + s.servico_id + '">+</div>' +
              '</div>' +
              '<div class="qty-total">' + fmtMoedaCurta(precoLinha) +
                (Math.max(1, qtdAtual) > 1 ? ' <span style="opacity:.7;font-weight:500">(' + Math.max(1, qtdAtual) + ' × ' + fmtMoedaCurta(precoUnit) + ')</span>' : '') +
              '</div>' +
            '</div>';

            if (s.isPorMetro) {
              var uniM = rotuloUnidadeMetragem(s.unidade_metragem);
              var mVal = metragemAtual > 0 ? metragemAtual : s.metragem_minima;
              html += '<div class="ctrl-block">' +
                '<span class="ctrl-label">' + fmtMoedaCurta(s.valor_por_metro) + ' / ' + uniM +
                  (s.metragem_maxima ? ' (mín. ' + s.metragem_minima + ', máx. ' + s.metragem_maxima + ')' : ' (mín. ' + s.metragem_minima + ')') + '</span>' +
                '<div class="qty-row">' +
                  '<div class="metro-btn" data-metro-menos="' + s.servico_id + '">−</div>' +
                  '<div class="qty-mid"><input class="qty-input" type="number" inputmode="decimal" data-qty-metro="' + s.servico_id + '" value="' + mVal + '" min="' + s.metragem_minima + '"' +
                    (s.metragem_maxima != null ? ' max="' + s.metragem_maxima + '"' : '') + ' step="' + s.passo_metro + '"><span class="qty-unit">' + uniM + '</span></div>' +
                  '<div class="metro-btn' + (s.metragem_maxima != null && mVal >= s.metragem_maxima ? ' disabled' : '') + '" data-metro-mais="' + s.servico_id + '">+</div>' +
                '</div>' +
              '</div>';
            }

            if (s.isPorHora) {
              var vph = Number(s.valor_por_hora || s.valor_hora) || 0;
              var hVal = horasAtual > 0 ? horasAtual : s.horas_minimas;
              html += '<div class="ctrl-block">' +
                '<span class="ctrl-label">' + fmtMoedaCurta(vph) + ' / h' +
                  (s.horas_maximas ? ' (mín. ' + s.horas_minimas + 'h, máx. ' + s.horas_maximas + 'h)' : ' (mín. ' + s.horas_minimas + 'h)') + '</span>' +
                '<div class="qty-row">' +
                  '<div class="metro-btn" data-hora-menos="' + s.servico_id + '">−</div>' +
                  '<div class="qty-mid"><input class="qty-input" type="number" inputmode="decimal" data-qty-hora="' + s.servico_id + '" value="' + hVal + '" min="' + s.horas_minimas + '"' +
                    (s.horas_maximas != null ? ' max="' + s.horas_maximas + '"' : '') + ' step="' + s.passo_hora + '"><span class="qty-unit">h</span></div>' +
                  '<div class="metro-btn' + (s.horas_maximas != null && hVal >= s.horas_maximas ? ' disabled' : '') + '" data-hora-mais="' + s.servico_id + '">+</div>' +
                '</div>' +
              '</div>';
            }
          } else {
            html += '<span class="block text-[11px] font-semibold text-cyan-400 mt-2">' + fmtMoeda(precoUnit) + '</span>';
            if (resumoCobranca) html += '<span class="card-desc" style="margin-top:2px;">' + esc(resumoCobranca) + '</span>';
            if (s.isPorMetro) html += '<span class="card-desc" style="margin-top:2px;">Com seletor de ' + esc(rotuloUnidadeMetragem(s.unidade_metragem)) + '</span>';
            if (s.isPorHora) html += '<span class="card-desc" style="margin-top:2px;">Com seletor de horas</span>';
          }
          html += '</div></div>';
          return html;
        }).join('');

        // Clique no card desligado → abre composer
        grid.querySelectorAll('[data-svc].cursor-pointer').forEach(function (card) {
          card.addEventListener('click', function (e) {
            if (formularioBloqueadoSomenteLeitura) return;
            if (e.target.closest && e.target.closest('[data-cart-add]')) return;
            var sid = card.dataset.svc;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            if (!s) return;
            svcQuantidade[sid] = 1;
            svcState[sid] = 'manual';
            if (s.isPorMetro) svcMetragem[sid] = s.metragem_minima;
            if (s.isPorHora) svcHoras[sid] = s.horas_minimas;
            updateUI();
            renderServicos();
            recalc();
          });
        });

        // + no card → adiciona ao carrinho e zera composer
        grid.querySelectorAll('[data-cart-add]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            adicionarAoCarrinho(btn.getAttribute('data-cart-add'));
          });
        });

        grid.querySelectorAll('[data-qtd-mais]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = btn.dataset.qtdMais;
            var atual = svcQuantidade[sid] > 0 ? svcQuantidade[sid] : 1;
            svcQuantidade[sid] = atual + 1;
            svcState[sid] = 'manual';
            renderServicos();
            recalc();
          });
        });
        grid.querySelectorAll('[data-qtd-menos]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = btn.dataset.qtdMenos;
            var atual = svcQuantidade[sid] > 0 ? svcQuantidade[sid] : 1;
            var novo = atual - 1;
            if (novo < 1) {
              resetComposerServico(sid);
            } else {
              svcQuantidade[sid] = novo;
            }
            renderServicos();
            recalc();
          });
        });

        // ----------------------------------------------------------------
        // [data-qty-un] — quantidade manual
        // O listener 'input' atualiza estado + recalc() SEM renderServicos(),
        // preservando o foco e permitindo digitação de múltiplos dígitos.
        // 'change' e Enter fazem a validação final e recriam o card.
        // ----------------------------------------------------------------
        grid.querySelectorAll('[data-qty-un]').forEach(function (inp) {
          inp.addEventListener('click', function (e) { e.stopPropagation(); });
          inp.addEventListener('input', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = inp.dataset.qtyUn;
            var n = parseInt(String(inp.value).replace(/\D/g, ''), 10);
            if (isFinite(n) && n >= 1) {
              svcQuantidade[sid] = n;
              if (svcState[sid] !== 'included') svcState[sid] = 'manual';
              recalc();
            }
          });
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); aplicarQtyUnDigitada(inp.dataset.qtyUn, inp.value); }
          });
          inp.addEventListener('change', function () {
            aplicarQtyUnDigitada(inp.dataset.qtyUn, inp.value);
          });
        });

        grid.querySelectorAll('[data-metro-mais]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = btn.dataset.metroMais;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            if (!s) return;
            var atual = svcMetragem[sid] || s.metragem_minima;
            var novo = atual + s.passo_metro;
            if (s.metragem_maxima != null && novo > s.metragem_maxima) novo = s.metragem_maxima;
            svcMetragem[sid] = novo;
            if (!(svcQuantidade[sid] > 0)) svcQuantidade[sid] = 1;
            svcState[sid] = 'manual';
            renderServicos();
            recalc();
          });
        });
        grid.querySelectorAll('[data-metro-menos]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = btn.dataset.metroMenos;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            if (!s) return;
            var atual = svcMetragem[sid] || s.metragem_minima;
            var novo = atual - s.passo_metro;
            if (novo < s.metragem_minima) svcMetragem[sid] = s.metragem_minima;
            else svcMetragem[sid] = novo;
            renderServicos();
            recalc();
          });
        });

        // ----------------------------------------------------------------
        // [data-qty-metro] — metragem manual
        // ----------------------------------------------------------------
        grid.querySelectorAll('[data-qty-metro]').forEach(function (inp) {
          inp.addEventListener('click', function (e) { e.stopPropagation(); });
          inp.addEventListener('input', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = inp.dataset.qtyMetro;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            var n = parseFloat(String(inp.value).replace(',', '.'));
            if (s && isFinite(n) && n > 0) {
              svcMetragem[sid] = n;
              if (!(svcQuantidade[sid] > 0)) svcQuantidade[sid] = 1;
              if (svcState[sid] !== 'included') svcState[sid] = 'manual';
              recalc();
            }
          });
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); aplicarQtyMetroDigitada(inp.dataset.qtyMetro, inp.value); }
          });
          inp.addEventListener('change', function () {
            aplicarQtyMetroDigitada(inp.dataset.qtyMetro, inp.value);
          });
        });

        grid.querySelectorAll('[data-hora-mais]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = btn.dataset.horaMais;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            if (!s) return;
            var atual = svcHoras[sid] || s.horas_minimas;
            var novo = atual + s.passo_hora;
            if (s.horas_maximas != null && novo > s.horas_maximas) novo = s.horas_maximas;
            svcHoras[sid] = novo;
            if (!(svcQuantidade[sid] > 0)) svcQuantidade[sid] = 1;
            svcState[sid] = 'manual';
            renderServicos();
            recalc();
          });
        });
        grid.querySelectorAll('[data-hora-menos]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = btn.dataset.horaMenos;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            if (!s) return;
            var atual = svcHoras[sid] || s.horas_minimas;
            var novo = atual - s.passo_hora;
            if (novo < s.horas_minimas) svcHoras[sid] = s.horas_minimas;
            else svcHoras[sid] = novo;
            renderServicos();
            recalc();
          });
        });

        // ----------------------------------------------------------------
        // [data-qty-hora] — horas manual
        // ----------------------------------------------------------------
        grid.querySelectorAll('[data-qty-hora]').forEach(function (inp) {
          inp.addEventListener('click', function (e) { e.stopPropagation(); });
          inp.addEventListener('input', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var sid = inp.dataset.qtyHora;
            var s = SVC.find(function (x) { return x.servico_id === sid; });
            var n = parseFloat(String(inp.value).replace(',', '.'));
            if (s && isFinite(n) && n > 0) {
              svcHoras[sid] = n;
              if (!(svcQuantidade[sid] > 0)) svcQuantidade[sid] = 1;
              if (svcState[sid] !== 'included') svcState[sid] = 'manual';
              recalc();
            }
          });
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); aplicarQtyHoraDigitada(inp.dataset.qtyHora, inp.value); }
          });
          inp.addEventListener('change', function () {
            aplicarQtyHoraDigitada(inp.dataset.qtyHora, inp.value);
          });
        });

        updateUI();
      }

      function aplicarQtyUnDigitada(sid, raw) {
        var n = parseInt(String(raw).replace(/\D/g, ''), 10);
        if (!isFinite(n) || n < 1) {
          svcQuantidade[sid] = 0;
          svcMetragem[sid] = 0;
          svcHoras[sid] = 0;
          svcState[sid] = 'off';
        } else {
          svcQuantidade[sid] = n;
          if (svcState[sid] !== 'included') svcState[sid] = 'manual';
        }
        renderServicos();
        recalc();
      }

      // ----------------------------------------------------------------
      // aplicarQtyMetroDigitada — validação/normalização no change/Enter
      // ----------------------------------------------------------------
      function aplicarQtyMetroDigitada(sid, raw) {
        var s = SVC.find(function (x) { return x.servico_id === sid; });
        if (!s) return;
        var n = parseFloat(String(raw).replace(',', '.'));
        if (!isFinite(n) || n < s.metragem_minima) {
          svcMetragem[sid] = s.metragem_minima;
        } else if (s.metragem_maxima != null && n > s.metragem_maxima) {
          svcMetragem[sid] = s.metragem_maxima;
        } else {
          svcMetragem[sid] = n;
        }
        if (!(svcQuantidade[sid] > 0)) svcQuantidade[sid] = 1;
        if (svcState[sid] !== 'included') svcState[sid] = 'manual';
        renderServicos();
        recalc();
      }

      // ----------------------------------------------------------------
      // aplicarQtyHoraDigitada — validação/normalização no change/Enter
      // ----------------------------------------------------------------
      function aplicarQtyHoraDigitada(sid, raw) {
        var s = SVC.find(function (x) { return x.servico_id === sid; });
        if (!s) return;
        var n = parseFloat(String(raw).replace(',', '.'));
        if (!isFinite(n) || n < s.horas_minimas) {
          svcHoras[sid] = s.horas_minimas;
        } else if (s.horas_maximas != null && n > s.horas_maximas) {
          svcHoras[sid] = s.horas_maximas;
        } else {
          svcHoras[sid] = n;
        }
        if (!(svcQuantidade[sid] > 0)) svcQuantidade[sid] = 1;
        if (svcState[sid] !== 'included') svcState[sid] = 'manual';
        renderServicos();
        recalc();
      }

      function updateUI() {
        document.querySelectorAll('[data-pkg]').forEach(function (c) {
          c.classList.toggle('selected', c.dataset.pkg === activePkg);
        });
        SVC.forEach(function (s) {
          var el = document.getElementById('card-svc-' + s.servico_id);
          if (!el) return;
          var st = svcState[s.servico_id];
          el.classList.remove('selected', 'included');
          if (st === 'included') el.classList.add('included');
          if (st === 'manual') el.classList.add('selected');
        });
      }
      function setToggleVisual(ligado) {
        var el = document.getElementById('toggleTransporte');
        if (el) el.classList.toggle('on', ligado);
        var box = document.getElementById('boxLogisticaValor');
        if (box) box.classList.toggle('hidden', !ligado);
      }
      function setToggleHospedagemVisual(ligado) {
        var el = document.getElementById('toggleHospedagem');
        if (el) el.classList.toggle('on', ligado);
        var box = document.getElementById('boxHospedagemValor');
        if (box) box.classList.toggle('hidden', !ligado);
      }
      function atualizarStatusTransporte(tipo, msg) {
        var el = document.getElementById('transporteStatus');
        if (!el) return;
        el.className = tipo || '';
        el.textContent = msg || '';
      }
      /* FÓRMULA DE HAVERSINE — distância em km entre dois pontos lat/lng */
      function distanciaHaversine(lat1, lng1, lat2, lng2) {
        var R = 6371; // raio médio da Terra em km
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }
   async function geocodificarCep(cepBruto) {
  var cep = String(cepBruto || '').replace(/\D/g, '');
  if (cep.length !== 8) return null;
  var viacepResp = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
  var viacepData = await viacepResp.json();
  if (viacepData.erro) return null;
  async function buscarNominatim(query) {
    var nomUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(query);
    var nomResp = await fetch(nomUrl, { headers: { 'Accept-Language': 'pt-BR' } });
    if (!nomResp.ok) return null;
    var nomData = await nomResp.json();
    return (nomData && nomData.length) ? nomData[0] : null;
  }
  var enderecoCompleto = [viacepData.logradouro, viacepData.bairro, viacepData.localidade, viacepData.uf, 'Brasil']
    .filter(Boolean).join(', ');
  var resultado = enderecoCompleto ? await buscarNominatim(enderecoCompleto) : null;
  if (!resultado) {
    var enderecoBairro = [viacepData.bairro, viacepData.localidade, viacepData.uf, 'Brasil'].filter(Boolean).join(', ');
    resultado = await buscarNominatim(enderecoBairro);
  }
  if (!resultado) {
    var enderecoCidade = [viacepData.localidade, viacepData.uf, 'Brasil'].filter(Boolean).join(', ');
    resultado = await buscarNominatim(enderecoCidade);
  }
  if (!resultado) return null;
  return {
    lat: Number(resultado.lat),
    lng: Number(resultado.lon),
    enderecoFormatado: enderecoCompleto
  };
}
      /* ===================== CEP — MÁSCARA + BUSCA DE ENDEREÇO (ViaCEP) =====================
         Ponto 2/3 do briefing: função única, reutilizada no modal de Cadastro de Cliente
         e na tela principal da Nova Proposta. Não reimplementa geocodificação (isso já
         existe em geocodificarCep/distância); aqui é apenas a consulta de endereço por CEP. */
      function aplicarMascaraCep(valor) {
        var v = String(valor || '').replace(/\D/g, '').substring(0, 8);
        if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
        return v;
      }
      // Função única de busca de endereço por CEP, reaproveitada no modal (2) e na
      // tela principal (3). Não faz requisição a cada tecla — quem chama decide
      // quando (somente ao completar 8 dígitos). Erros/CEP inválido nunca lançam.
      async function buscarEnderecoPorCEP(cep) {
        var cepLimpo = String(cep || '').replace(/\D/g, '');
        if (cepLimpo.length !== 8) return null;
        try {
          var resp = await fetch('https://viacep.com.br/ws/' + cepLimpo + '/json/');
          if (!resp.ok) return null;
          var data = await resp.json();
          if (!data || data.erro) return null;
          return {
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || ''
          };
        } catch (e) {
          console.error('[432UP Partner] Erro ao buscar CEP:', e);
          return null;
        }
      }
      /* ---- CEP no modal de Cadastro de Cliente (Correção 2) ---- */
      function onMcCepInput(e) {
        e.target.value = aplicarMascaraCep(e.target.value);
        var cepLimpo = e.target.value.replace(/\D/g, '');
        var statusEl = document.getElementById('mcCepStatus');
        if (cepLimpo.length < 8) {
          ultimoCepConsultadoModal = null;
          if (statusEl) { statusEl.textContent = ''; statusEl.className = 'mt-1 text-[11px]'; }
          return;
        }
        if (cepLimpo.length !== 8) return;
        if (cepLimpo === ultimoCepConsultadoModal) return; // já consultado, evita repetir
        ultimoCepConsultadoModal = cepLimpo;
        if (statusEl) { statusEl.textContent = 'Buscando endereço...'; statusEl.className = 'mt-1 text-[11px] text-cyan-400'; }
        buscarEnderecoPorCEP(cepLimpo).then(function (end) {
          if (!end) {
            if (statusEl) { statusEl.textContent = 'CEP não encontrado.'; statusEl.className = 'mt-1 text-[11px] text-red-400'; }
            return;
          }
          if (end.logradouro) document.getElementById('mcLogradouro').value = end.logradouro;
          if (end.bairro) document.getElementById('mcBairro').value = end.bairro;
          if (end.cidade) document.getElementById('mcCidade').value = end.cidade;
          if (end.uf) document.getElementById('mcUf').value = end.uf;
          if (statusEl) { statusEl.textContent = 'Endereço preenchido automaticamente.'; statusEl.className = 'mt-1 text-[11px] text-emerald-400'; }
        }).catch(function (e) {
          console.error('[432UP Partner] Erro no autocomplete de CEP (modal):', e);
          if (statusEl) { statusEl.textContent = ''; statusEl.className = 'mt-1 text-[11px]'; }
        });
      }
      var cepDebounceTimer = null;
      function onCepChange() {
        var cepInput = document.getElementById('fCep');
        cepInput.value = aplicarMascaraCep(cepInput.value);
        var cepLimpo = cepInput.value.replace(/\D/g, '');
        clearTimeout(cepDebounceTimer);
        if (cepLimpo.length < 8) {
          transporteDistanciaKm = null;
          transporteLatLng = null;
          ultimoCepConsultadoProposta = null;
          if (!transporteValorManual) transporteValor = 0;
          atualizarStatusTransporte('', '');
          recalc();
          return;
        }
        cepDebounceTimer = setTimeout(async function () {
          if (!CONFIG_TRANSPORTE) {
            atualizarStatusTransporte('err', 'Tarifa de logística não configurada. Fale com a equipe.');
          } else {
            atualizarStatusTransporte('loading', 'Calculando distância…');
            try {
              var geo = await geocodificarCep(cepLimpo);
              if (!geo) {
                atualizarStatusTransporte('err', 'CEP não encontrado. Verifique e tente novamente.');
                transporteDistanciaKm = null;
                transporteLatLng = null;
                recalc();
              } else {
                var dist = distanciaHaversine(CONFIG_TRANSPORTE.origem_lat, CONFIG_TRANSPORTE.origem_lng, geo.lat, geo.lng);
                dist = Math.round(dist * 10) / 10;
                transporteDistanciaKm = dist;
                transporteLatLng = { lat: geo.lat, lng: geo.lng };
                transporteCepValido = cepLimpo;
                if (eventoEnderecoIgualCliente) {
                  eventoEndereco.cep = cepLimpo;
                  eventoEndereco.lat = geo.lat;
                  eventoEndereco.lng = geo.lng;
                }
                atualizarStatusTransporte('ok', 'Distância: ' + dist.toFixed(1) + ' km de ' + CONFIG_TRANSPORTE.origem_label);
                recalc();
              }
            } catch (e) {
              console.error('[432UP Partner] Erro ao geocodificar CEP:', e);
              atualizarStatusTransporte('err', 'Não foi possível calcular a distância agora.');
              transporteDistanciaKm = null;
              recalc();
            }
          }
          // Correção 3: autocomplete de Logradouro/Bairro/Cidade/UF na tela
          // principal, reutilizando a mesma função do modal (buscarEnderecoPorCEP),
          // sem duplicar dados do cliente nem mover/alterar campos existentes.
          if (cepLimpo !== ultimoCepConsultadoProposta) {
            ultimoCepConsultadoProposta = cepLimpo;
            try {
              var endProposta = await buscarEnderecoPorCEP(cepLimpo);
              if (endProposta) {
                var fLocalEl = document.getElementById('fLocal');
                if (fLocalEl && !fLocalEl.value.trim()) {
                  var refLocal = [endProposta.cidade, endProposta.uf].filter(Boolean).join(' - ');
                  if (refLocal) fLocalEl.value = refLocal;
                }
                if (eventoEnderecoIgualCliente) {
                  eventoEndereco.logradouro = endProposta.logradouro || eventoEndereco.logradouro;
                  eventoEndereco.bairro = endProposta.bairro || eventoEndereco.bairro;
                  eventoEndereco.cidade = endProposta.cidade || eventoEndereco.cidade;
                  eventoEndereco.uf = endProposta.uf || eventoEndereco.uf;
                }
              }
            } catch (e) {
              console.error('[432UP Partner] Erro no autocomplete de CEP (proposta):', e);
            }
          }
        }, 700);
      }
      /* ===================== ENDEREÇO DO EVENTO (evento_*) =====================
         Regra: quando eventoEnderecoIgualCliente = true, o endereço do evento é o
         endereço cadastrado do cliente (fCep/transporteLatLng/transporteDistanciaKm
         já calculados pelo fluxo existente). Quando false, usa os campos evento_*
         preenchidos aqui, com seu próprio CEP/geocodificação/distância — sem alterar
         o cadastro do cliente. */
      function atualizarLabelFCep() {
        var lbl = document.getElementById('lblFCep');
        if (!lbl) return;
        lbl.textContent = eventoEnderecoIgualCliente ? 'CEP do Local do Evento *' : 'CEP do Cliente (cadastro)';
      }
      function atualizarStatusEventoCep(tipo, msg) {
        var el = document.getElementById('eventoCepStatus');
        if (!el) return;
        el.className = 'mt-1 text-[11px]' + (tipo ? ' ' + (tipo === 'ok' ? 'text-emerald-400' : tipo === 'err' ? 'text-red-400' : 'text-cyan-400') : '');
        el.textContent = msg || '';
      }
      function toggleEventoEnderecoIgualCliente(ligado) {
        eventoEnderecoIgualCliente = !!ligado;
        var chk = document.getElementById('fEventoEnderecoIgualCliente');
        if (chk) chk.checked = eventoEnderecoIgualCliente;
        var bloco = document.getElementById('blocoEnderecoEvento');
        if (bloco) bloco.classList.toggle('hidden', eventoEnderecoIgualCliente);
        atualizarLabelFCep();
        if (eventoEnderecoIgualCliente) {
          // Volta a usar o endereço do cliente: transporte usa transporteLatLng/transporteDistanciaKm
          // já calculados a partir do fCep. Não apaga os campos evento_* preenchidos
          // (permite reativar sem perder o que foi digitado), mas eles deixam de valer.
          recalcularTransporteEfetivo();
        } else {
          // Passa a exigir endereço específico do evento; se já houver um CEP de evento
          // preenchido, recalcula a distância a partir dele.
          var cepEventoEl = document.getElementById('fEventoCep');
          if (cepEventoEl && cepEventoEl.value.trim()) {
            onEventoCepChange();
          } else {
            recalcularTransporteEfetivo();
          }
        }
        recalc();
      }
      // Centraliza a regra de item 5: origem do endereço para cálculo de transporte.
      // Preserva toda a lógica de distância/valor já existente (distanciaHaversine,
      // CONFIG_TRANSPORTE) — apenas escolhe de onde vem lat/lng e o CEP de referência.
      function recalcularTransporteEfetivo() {
        if (eventoEnderecoIgualCliente) {
          // endereço efetivo = endereço do cliente -> nada a fazer aqui, os valores
          // já vêm de transporteLatLng/transporteDistanciaKm/transporteCepValido
          // calculados pelo fluxo existente de fCep (onCepChange/geocodificarCep).
          return;
        }
        // endereço efetivo = endereço específico do evento
        if (eventoEndereco.lat != null && eventoEndereco.lng != null && CONFIG_TRANSPORTE) {
          var dist = distanciaHaversine(CONFIG_TRANSPORTE.origem_lat, CONFIG_TRANSPORTE.origem_lng, eventoEndereco.lat, eventoEndereco.lng);
          dist = Math.round(dist * 10) / 10;
          transporteDistanciaKm = dist;
          transporteLatLng = { lat: eventoEndereco.lat, lng: eventoEndereco.lng };
          transporteCepValido = eventoEndereco.cep;
          atualizarStatusTransporte('ok', 'Distância: ' + dist.toFixed(1) + ' km de ' + CONFIG_TRANSPORTE.origem_label);
        } else {
          transporteDistanciaKm = null;
          transporteLatLng = null;
        }
      }
      var eventoCepDebounceTimer = null;
      function onEventoCepChange() {
        var cepInput = document.getElementById('fEventoCep');
        cepInput.value = aplicarMascaraCep(cepInput.value);
        var cepLimpo = cepInput.value.replace(/\D/g, '');
        eventoEndereco.cep = cepLimpo || null;
        clearTimeout(eventoCepDebounceTimer);
        if (cepLimpo.length < 8) {
          eventoEndereco.lat = null;
          eventoEndereco.lng = null;
          ultimoCepConsultadoEvento = null;
          atualizarStatusEventoCep('', '');
          recalcularTransporteEfetivo();
          recalc();
          return;
        }
        eventoCepDebounceTimer = setTimeout(async function () {
          // Autocomplete de Logradouro/Bairro/Cidade/UF — reutiliza a mesma função
          // já usada no modal de cliente e na tela principal (item 4 do briefing).
          if (cepLimpo !== ultimoCepConsultadoEvento) {
            ultimoCepConsultadoEvento = cepLimpo;
            atualizarStatusEventoCep('loading', 'Buscando endereço...');
            try {
              var end = await buscarEnderecoPorCEP(cepLimpo);
              if (!end) {
                atualizarStatusEventoCep('err', 'CEP não encontrado.');
              } else {
                if (end.logradouro) { document.getElementById('fEventoLogradouro').value = end.logradouro; eventoEndereco.logradouro = end.logradouro; }
                if (end.bairro) { document.getElementById('fEventoBairro').value = end.bairro; eventoEndereco.bairro = end.bairro; }
                if (end.cidade) { document.getElementById('fEventoCidade').value = end.cidade; eventoEndereco.cidade = end.cidade; }
                if (end.uf) { document.getElementById('fEventoUf').value = end.uf; eventoEndereco.uf = end.uf; }
                atualizarStatusEventoCep('ok', 'Endereço preenchido automaticamente.');
              }
            } catch (e) {
              console.error('[432UP Partner] Erro no autocomplete de CEP (evento):', e);
              atualizarStatusEventoCep('', '');
            }
          }
          // Geocodificação para transporte (item 5) — reutiliza geocodificarCep já existente.
          if (!CONFIG_TRANSPORTE) {
            atualizarStatusTransporte('err', 'Tarifa de logística não configurada. Fale com a equipe.');
          } else {
            atualizarStatusTransporte('loading', 'Calculando distância…');
            try {
              var geo = await geocodificarCep(cepLimpo);
              if (!geo) {
                atualizarStatusTransporte('err', 'CEP do evento não encontrado. Verifique e tente novamente.');
                eventoEndereco.lat = null;
                eventoEndereco.lng = null;
              } else {
                eventoEndereco.lat = geo.lat;
                eventoEndereco.lng = geo.lng;
              }
              recalcularTransporteEfetivo();
              recalc();
            } catch (e) {
              console.error('[432UP Partner] Erro ao geocodificar CEP do evento:', e);
              atualizarStatusTransporte('err', 'Não foi possível calcular a distância agora.');
              eventoEndereco.lat = null;
              eventoEndereco.lng = null;
              recalcularTransporteEfetivo();
              recalc();
            }
          }
        }, 700);
      }
      function bindEventoEnderecoEvents() {
        var chk = document.getElementById('fEventoEnderecoIgualCliente');
        if (chk) {
          chk.addEventListener('change', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            toggleEventoEnderecoIgualCliente(this.checked);
          });
        }
        var camposTexto = ['fEventoNumero', 'fEventoLogradouro', 'fEventoComplemento', 'fEventoBairro', 'fEventoCidade', 'fEventoUf'];
        var mapaCampo = {
          fEventoNumero: 'numero', fEventoLogradouro: 'logradouro', fEventoComplemento: 'complemento',
          fEventoBairro: 'bairro', fEventoCidade: 'cidade', fEventoUf: 'uf'
        };
        camposTexto.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('input', function () {
            eventoEndereco[mapaCampo[id]] = this.value.trim() || null;
          });
        });
        var cepEl = document.getElementById('fEventoCep');
        if (cepEl) cepEl.addEventListener('input', onEventoCepChange);
      }
      // Preenche os campos evento_* com os dados do cliente selecionado, para que a
      // proposta fique completa mesmo com evento_endereco_igual_cliente = true
      // (item 3 do briefing). Não sobrescreve o cadastro do cliente.
      function sincronizarEventoComCliente(c) {
        if (!eventoEnderecoIgualCliente) return;
        eventoEndereco.cep = (c && c.cep) ? String(c.cep).replace(/\D/g, '') : eventoEndereco.cep;
        if (transporteLatLng) {
          eventoEndereco.lat = transporteLatLng.lat;
          eventoEndereco.lng = transporteLatLng.lng;
        }
      }
      /* ===================== CLIENTE (co_clientes) ===================== */
      function normalizarNumeros(str) { return str ? String(str).replace(/\D/g, '') : ''; }
      function clienteSubtitulo(c) {
        var partes = [];
        if (c.nome_fantasia) partes.push(c.nome_fantasia);
        var local = [c.cidade, c.bairro].filter(Boolean).join(' / ');
        if (local) partes.push(local);
        return partes.join(' — ');
      }
      function setClienteSelecionadoUI() {
        var wrapBusca = document.getElementById('clienteBuscaWrap');
        var box = document.getElementById('clienteSelecionadoBox');
        var btnEditar = document.getElementById('btnEditarCliente');
        if (clienteSelecionado) {
          wrapBusca.classList.add('hidden');
          box.classList.remove('hidden');
          box.classList.add('flex');
          document.getElementById('clienteSelNome').textContent = clienteSelecionado.nome_razao || '—';
          var sub = clienteSelecionado.legacy
            ? 'Cliente sem cadastro vinculado — busque para associar'
            : clienteSubtitulo(clienteSelecionado);
          document.getElementById('clienteSelSub').textContent = sub;
          btnEditar.classList.toggle('hidden', !clienteSelecionado.id);
        } else {
          wrapBusca.classList.remove('hidden');
          box.classList.add('hidden');
          box.classList.remove('flex');
          document.getElementById('fClienteBusca').value = '';
        }
      }
      function selecionarCliente(c) {
        clienteSelecionado = {
          id: c.id,
          nome_razao: c.nome_razao,
          nome_fantasia: c.nome_fantasia,
          cidade: c.cidade,
          bairro: c.bairro,
          cep: c.cep,
          cpf_cnpj: c.cpf_cnpj || null,
          responsavel_legal: c.responsavel_legal || null,
          contato_nome: c.contato_nome || null,
          contato_cargo: c.contato_cargo || null
        };
        document.getElementById('clienteResultados').classList.add('hidden');
        setClienteSelecionadoUI();
        // Correção: ao selecionar um cliente já cadastrado, carregar o CEP
        // salvo dele no campo da tela principal (fora do modal), aplicando a
        // máscara 00000-000 e disparando o mesmo autocomplete de endereço/
        // transporte já usado quando o CEP é digitado manualmente.
        var fCepEl = document.getElementById('fCep');
        if (fCepEl && c.cep) {
          fCepEl.value = aplicarMascaraCep(c.cep);
          onCepChange();
        }
        sincronizarEventoComCliente(c);
        recalc();
      }
      function trocarCliente() {
        if (formularioBloqueadoSomenteLeitura) return;
        clienteSelecionado = null;
        setClienteSelecionadoUI();
        recalc();
        var input = document.getElementById('fClienteBusca');
        if (input) input.focus();
      }
      function renderClienteResultados(lista, termoOriginal) {
        var el = document.getElementById('clienteResultados');
        if (!lista.length) {
          el.innerHTML =
            '<div class="p-3">' +
              '<span class="block text-xs text-slate-400 mb-2">Nenhum cliente encontrado para "' + esc(termoOriginal) + '".</span>' +
              '<button type="button" id="btnCadastrarClienteNovo" class="w-full py-2 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer">+ Cadastrar cliente</button>' +
            '</div>';
          el.classList.remove('hidden');
          var btnNovo = document.getElementById('btnCadastrarClienteNovo');
          if (btnNovo) btnNovo.addEventListener('click', function () { abrirModalCliente(termoOriginal); });
          return;
        }
        el.innerHTML = lista.map(function (c, i) {
          var sub = clienteSubtitulo(c);
          return '<div data-cliente-idx="' + i + '" class="px-4 py-2.5 cursor-pointer hover:bg-cyan-500/10 border-b border-white/5 last:border-b-0">' +
            '<span class="block text-sm font-semibold text-white truncate">' + esc(c.nome_razao) + '</span>' +
            (sub ? '<span class="block text-[11px] text-slate-400 truncate">' + esc(sub) + '</span>' : '') +
          '</div>';
        }).join('') +
          '<div class="px-4 py-2 border-t border-white/10">' +
            '<button type="button" id="btnCadastrarClienteNovo" class="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer">+ Não encontrou? Cadastrar cliente</button>' +
          '</div>';
        el.classList.remove('hidden');
        el.querySelectorAll('[data-cliente-idx]').forEach(function (row) {
          row.addEventListener('click', function () {
            selecionarCliente(lista[parseInt(row.dataset.clienteIdx, 10)]);
          });
        });
        var btnNovo2 = document.getElementById('btnCadastrarClienteNovo');
        if (btnNovo2) btnNovo2.addEventListener('click', function () { abrirModalCliente(termoOriginal); });
      }
      async function buscarClientes(termo) {
        var termoTrim = termo.trim();
        if (termoTrim.length < 2) {
          document.getElementById('clienteResultados').classList.add('hidden');
          return;
        }
        var termoNum = normalizarNumeros(termoTrim);
        var filtros = ['nome_razao.ilike.%' + termoTrim + '%'];
        if (termoNum.length >= 3) {
          filtros.push('cpf_cnpj.ilike.%' + termoNum + '%');
          filtros.push('telefone.ilike.%' + termoNum + '%');
        }
        try {
          var res = await sbPartner
            .from('co_clientes')
            .select('id, tipo_pessoa, nome_razao, nome_fantasia, cidade, bairro, cpf_cnpj, telefone, cep, responsavel_legal, contato_nome, contato_cargo')
            .or(filtros.join(','))
            .limit(8);
          if (res.error) {
            console.error('[432UP Partner] Erro na busca de clientes:', res.error);
            renderClienteResultados([], termoTrim);
            return;
          }
          renderClienteResultados(res.data || [], termoTrim);
        } catch (e) {
          console.error('[432UP Partner] Exceção na busca de clientes:', e);
          renderClienteResultados([], termoTrim);
        }
      }
      function onClienteBuscaInput() {
        var val = document.getElementById('fClienteBusca').value;
        clearTimeout(clienteBuscaTimer);
        clienteBuscaTimer = setTimeout(function () { buscarClientes(val); }, 350);
      }
      /* ---------- MODAL DE CADASTRO (reaproveita public.co_clientes) ---------- */
      function abrirModalCliente(termoPreenchido) {
        if (formularioBloqueadoSomenteLeitura) return;
        mcClienteEditandoId = null;
        document.getElementById('clienteResultados').classList.add('hidden');
        setMcTipo('PF');
        document.getElementById('formCadastroCliente').reset();
        document.getElementById('mcTipoPessoa').value = 'PF';
        if (termoPreenchido) document.getElementById('mcNomeRazao').value = termoPreenchido;
        document.getElementById('mcAlert').classList.add('hidden');
        setChipGroupSingle('mcChipsTipoCliente', 'mcTipoCliente', evTipoVal || '');
        setChipGroupMulti('mcChipsServico', 'mcServico', '');
        setChipGroupSingle('mcChipsOrigem', 'mcOrigemCliente', '');
        setChipGroupSingle('mcChipsStatusComercial', 'mcStatusComercial', '');
        ultimoCepConsultadoModal = null;
        var mcCepStatusEl = document.getElementById('mcCepStatus');
        if (mcCepStatusEl) { mcCepStatusEl.textContent = ''; mcCepStatusEl.className = 'mt-1 text-[11px]'; }
        mcSetWhatsappStatus('', '');
        var mcTitulo = document.getElementById('mcTitulo');
        if (mcTitulo) mcTitulo.textContent = 'Cadastrar Cliente';
        var mcBtnSalvarEl = document.getElementById('mcBtnSalvar');
        if (mcBtnSalvarEl) mcBtnSalvarEl.textContent = 'Salvar Cliente';
        var modal = document.getElementById('modalCliente');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
      // Correção: "Editar cliente" reaproveita o mesmo modal de cadastro,
      // já em uso e funcional, em vez de depender de ficha-cliente.html
      // (que hoje não abre nada). Busca os dados completos do cliente
      // selecionado e preenche o formulário para edição no local.
      async function abrirModalClienteParaEdicao(clienteId) {
        if (formularioBloqueadoSomenteLeitura || !clienteId) return;
        document.getElementById('clienteResultados').classList.add('hidden');
        document.getElementById('formCadastroCliente').reset();
        document.getElementById('mcAlert').classList.add('hidden');
        ultimoCepConsultadoModal = null;
        var mcCepStatusEl = document.getElementById('mcCepStatus');
        if (mcCepStatusEl) { mcCepStatusEl.textContent = ''; mcCepStatusEl.className = 'mt-1 text-[11px]'; }
        mcSetWhatsappStatus('', '');
        try {
          var res = await sbPartner
            .from('co_clientes')
            .select('id, tipo_pessoa, nome_razao, telefone, cpf_cnpj, email, nome_fantasia, responsavel_legal, contato_nome, contato_cargo, cep, logradouro, numero, complemento, bairro, cidade, uf, observacoes_comerciais, tipo_cliente, servico, origem_cliente, status_comercial')
            .eq('id', clienteId)
            .maybeSingle();
          if (res.error || !res.data) {
            console.error('[432UP Partner] Falha ao carregar cliente para edição:', res.error);
            showAlert('Não foi possível carregar os dados deste cliente para edição.', 'error');
            return;
          }
          var c = res.data;
          mcClienteEditandoId = c.id;
          setMcTipo(c.tipo_pessoa === 'PJ' ? 'PJ' : 'PF');
          document.getElementById('mcNomeRazao').value = c.nome_razao || '';
          document.getElementById('mcTelefone').value = c.telefone || '';
          document.getElementById('mcDocNumero').value = c.cpf_cnpj ? handleMcDocFormatarValor(c.cpf_cnpj) : '';
          document.getElementById('mcEmail').value = c.email || '';
          document.getElementById('mcContatoNome').value = c.contato_nome || '';
          document.getElementById('mcContatoCargo').value = c.contato_cargo || '';
          document.getElementById('mcNomeFantasia').value = c.nome_fantasia || '';
          document.getElementById('mcRepNome').value = c.responsavel_legal || '';
          document.getElementById('mcCep').value = c.cep ? aplicarMascaraCep(c.cep) : '';
          document.getElementById('mcLogradouro').value = c.logradouro || '';
          document.getElementById('mcNumero').value = c.numero || '';
          document.getElementById('mcComplemento').value = c.complemento || '';
          document.getElementById('mcBairro').value = c.bairro || '';
          document.getElementById('mcCidade').value = c.cidade || '';
          document.getElementById('mcUf').value = c.uf || '';
          document.getElementById('mcObs').value = c.observacoes_comerciais || '';
          setChipGroupSingle('mcChipsTipoCliente', 'mcTipoCliente', c.tipo_cliente || '');
          setChipGroupMulti('mcChipsServico', 'mcServico', c.servico || '');
          setChipGroupSingle('mcChipsOrigem', 'mcOrigemCliente', c.origem_cliente || '');
          setChipGroupSingle('mcChipsStatusComercial', 'mcStatusComercial', c.status_comercial || '');
          if (c.cep) ultimoCepConsultadoModal = String(c.cep).replace(/\D/g, '');
          var mcTitulo = document.getElementById('mcTitulo');
          if (mcTitulo) mcTitulo.textContent = 'Editar Cliente';
          var mcBtnSalvarEl = document.getElementById('mcBtnSalvar');
          if (mcBtnSalvarEl) mcBtnSalvarEl.textContent = 'Salvar Alterações';
          var modal = document.getElementById('modalCliente');
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        } catch (e) {
          console.error('[432UP Partner] Exceção ao carregar cliente para edição:', e);
          showAlert('Erro técnico ao abrir a edição do cliente.', 'error');
        }
      }
      // Aplica a máscara correta (CPF ou CNPJ) sobre um valor já salvo no
      // banco, para exibir corretamente ao abrir um cliente existente.
      function handleMcDocFormatarValor(docSalvo) {
        var value = String(docSalvo || '').replace(/\D/g, '');
        if (value.length <= 11) {
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
          value = value.substring(0, 14);
          value = value.replace(/^(\d{2})(\d)/, '$1.$2');
          value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
          value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
          value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        return value;
      }
      function fecharModalCliente() {
        mcClienteEditandoId = null;
        var modal = document.getElementById('modalCliente');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      function setMcTipo(tipo) {
        document.getElementById('mcTipoPessoa').value = tipo;
        document.getElementById('mcBtnPF').classList.toggle('active', tipo === 'PF');
        document.getElementById('mcBtnPJ').classList.toggle('active', tipo === 'PJ');
        document.getElementById('mcBlocoPJ').classList.toggle('hidden', tipo !== 'PJ');
        document.getElementById('mcLabelNome').textContent = tipo === 'PJ' ? 'Razão Social *' : 'Nome Completo *';
        document.getElementById('mcLabelDoc').textContent = tipo === 'PJ' ? 'CNPJ (Opcional)' : 'CPF (Opcional)';
      }
      // Correção 1: autorreconhecimento de CPF/CNPJ pela quantidade de dígitos,
      // sem depender do seletor PF/PJ. O seletor PF/PJ continua existindo e
      // controlando os demais campos (Razão Social, Nome Fantasia, etc.), mas
      // não é mais requisito para a máscara do documento funcionar.
      function handleMcDocTyping(e) {
        var value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
          e.target.value = value;
        } else {
          value = value.substring(0, 14);
          value = value.replace(/^(\d{2})(\d)/, '$1.$2');
          value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
          value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
          value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
          e.target.value = value;
        }
        // Ajusta o tipo de pessoa (PF/PJ) e o rótulo do campo automaticamente
        // conforme a quantidade de dígitos, sem alterar demais campos do form.
        var digitos = value.replace(/\D/g, '');
        var tipoAtual = document.getElementById('mcTipoPessoa').value;
        var tipoDetectado = digitos.length > 11 ? 'PJ' : 'PF';
        if (digitos.length > 0 && tipoDetectado !== tipoAtual) {
          setMcTipo(tipoDetectado);
        }
      }
      function mcShowAlert(msg) {
        var el = document.getElementById('mcAlert');
        el.textContent = msg;
        el.classList.remove('hidden');
      }
      async function submitCadastroCliente(e) {
        e.preventDefault();
        var btn = document.getElementById('mcBtnSalvar');
        var original = btn.textContent;
        document.getElementById('mcAlert').classList.add('hidden');
        var tipoPessoa = document.getElementById('mcTipoPessoa').value;
        var nomeRazao = document.getElementById('mcNomeRazao').value.trim();
        var telefone = document.getElementById('mcTelefone').value.trim();
        var docNumero = document.getElementById('mcDocNumero').value.trim();
        var email = document.getElementById('mcEmail').value.trim();
        var contatoNome = document.getElementById('mcContatoNome').value.trim();
        var contatoCargo = document.getElementById('mcContatoCargo').value.trim();
        var nomeFantasia = document.getElementById('mcNomeFantasia').value.trim();
        var repNome = document.getElementById('mcRepNome').value.trim();
        var cep = document.getElementById('mcCep').value.trim();
        var logradouro = document.getElementById('mcLogradouro').value.trim();
        var numero = document.getElementById('mcNumero').value.trim();
        var complemento = document.getElementById('mcComplemento').value.trim();
        var bairro = document.getElementById('mcBairro').value.trim();
        var cidade = document.getElementById('mcCidade').value.trim();
        var uf = document.getElementById('mcUf').value.trim();
        var obsComerciais = document.getElementById('mcObs').value.trim();
        var tipoClienteMc = (document.getElementById('mcTipoCliente') || {}).value || '';
        var servicoMc = (document.getElementById('mcServico') || {}).value || '';
        var origemMc = (document.getElementById('mcOrigemCliente') || {}).value || '';
        var statusMc = (document.getElementById('mcStatusComercial') || {}).value || '';
        tipoClienteMc = tipoClienteMc.trim();
        servicoMc = servicoMc.trim();
        origemMc = origemMc.trim();
        statusMc = statusMc.trim();
        if (origemMc && MC_ORIGENS_OFICIAIS.indexOf(origemMc) < 0) origemMc = '';
        if (!nomeRazao || !telefone) {
          mcShowAlert('Preencha nome/razão social e telefone.');
          return;
        }
        var docNormalizado = normalizarNumeros(docNumero);
        var editandoId = mcClienteEditandoId;
        btn.disabled = true;
        btn.textContent = editandoId ? 'Salvando...' : 'Salvando...';
        try {
          if (docNormalizado.length > 0) {
            var dupQuery = sbPartner.from('co_clientes').select('id').eq('cpf_cnpj', docNormalizado);
            if (editandoId) dupQuery = dupQuery.neq('id', editandoId);
            var dup = await dupQuery.maybeSingle();
            if (dup.error) console.error('[432UP Partner] Erro técnico na checagem de duplicidade:', dup.error);
            if (dup.data) {
              mcShowAlert('Este cliente já possui cadastro em nossa base comercial e está vinculado a outro responsável. Para verificar a situação, entre em contato com a administração.');
              btn.disabled = false;
              btn.textContent = original;
              return;
            }
          }
          var payload = {
            tipo_pessoa: tipoPessoa,
            nome_razao: nomeRazao,
            telefone: telefone,
            cpf_cnpj: docNormalizado || null,
            email: email || null,
            contato_nome: contatoNome || null,
            contato_cargo: contatoCargo || null,
            nome_fantasia: tipoPessoa === 'PJ' ? (nomeFantasia || null) : null,
            responsavel_legal: tipoPessoa === 'PJ' ? (repNome || null) : null,
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade: cidade || null,
            uf: uf || null,
            observacoes_comerciais: obsComerciais || null
          };
          if (tipoClienteMc) payload.tipo_cliente = tipoClienteMc;
          if (servicoMc) payload.servico = servicoMc;
          if (origemMc) payload.origem_cliente = origemMc;
          if (statusMc) payload.status_comercial = statusMc;
          var saveResult;
          if (editandoId) {
            saveResult = await sbPartner.from('co_clientes').update(payload).eq('id', editandoId)
              .select('id, nome_razao, nome_fantasia, cidade, bairro, cep, cpf_cnpj, responsavel_legal, contato_nome, contato_cargo').single();
          } else {
            payload.parceiro_responsavel_id = parceiroAtual.id;
            saveResult = await sbPartner.from('co_clientes').insert([payload])
              .select('id, nome_razao, nome_fantasia, cidade, bairro, cep, cpf_cnpj, responsavel_legal, contato_nome, contato_cargo').single();
          }
          if (saveResult.error) {
            console.error('[432UP Partner] Erro técnico no salvamento do cliente:', saveResult.error);
            mcShowAlert('Não foi possível salvar os dados do cliente. Tente novamente ou contate o suporte.');
          } else {
            mcClienteEditandoId = null;
            fecharModalCliente();
            selecionarCliente(saveResult.data);
          }
        } catch (err) {
          console.error('[432UP Partner] Exceção no salvamento do cliente:', err);
          mcShowAlert('Erro técnico ao salvar o cliente. Tente novamente.');
        } finally {
          btn.disabled = false;
          btn.textContent = original;
        }
      }
      /* ===================== WHATSAPP PASTE → PREENCHER FORMULÁRIO =====================
         Interpreta texto colado (mesmo bagunçado) e alimenta os inputs existentes do modal.
         Não substitui o cadastro manual: o usuário pode ignorar e digitar campo a campo. */
      function mcSetWhatsappStatus(msg, tipo) {
        var el = document.getElementById('mcWhatsappStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'text-[11px] flex-1 min-w-0 ' +
          (tipo === 'ok' ? 'text-emerald-400' : tipo === 'err' ? 'text-red-400' : 'text-slate-400');
      }
      function extrairRotuloValor(texto, rotulos, rotulosExcluir) {
        // Procura linhas no estilo "Nome: João" / "Nome - João" / "Nome João"
        // rotulosExcluir (opcional): se a linha começar com um destes rótulos
        // (pertencentes a OUTRO campo mais específico), ela é ignorada para
        // esta busca — evita que um rótulo curto (ex.: "Nome") roube o valor
        // de um campo distinto (ex.: "Nome Fantasia", "Nome do Contato").
        var linhas = texto.split(/\r?\n/);
        var i, j, linha, lower, rotulo, idx, val;
        for (i = 0; i < linhas.length; i++) {
          linha = linhas[i].replace(/^\s*[-•*]\s*/, '').trim();
          if (!linha) continue;
          lower = linha.toLowerCase();
          if (rotulosExcluir && rotulosExcluir.length) {
            var linhaExcluida = rotulosExcluir.some(function (rx) { return lower.indexOf(rx.toLowerCase()) === 0; });
            if (linhaExcluida) continue;
          }
          for (j = 0; j < rotulos.length; j++) {
            rotulo = rotulos[j].toLowerCase();
            if (lower.indexOf(rotulo) === 0) {
              val = linha.slice(rotulos[j].length).replace(/^[\s:.\-–—]+/, '').trim();
              if (val) return val;
            }
            // "rotulo: valor" em qualquer posição da linha
            idx = lower.indexOf(rotulo);
            if (idx >= 0) {
              var apos = linha.slice(idx + rotulos[j].length).replace(/^[\s:.\-–—]+/, '').trim();
              if (apos && apos.length >= 2) return apos;
            }
          }
        }
        return null;
      }
      function interpretarTextoWhatsapp(textoBruto) {
        var texto = String(textoBruto || '').replace(/\u00a0/g, ' ').trim();
        if (!texto) return null;
        var resultado = {
          nome_razao: null,
          nome_fantasia: null,
          telefone: null,
          cpf_cnpj: null,
          email: null,
          responsavel_legal: null,
          contato_nome: null,
          contato_cargo: null,
          cep: null,
          logradouro: null,
          numero: null,
          complemento: null,
          bairro: null,
          cidade: null,
          uf: null,
          tipo_pessoa: null,
          observacoes: null
        };
        // --- E-mail ---
        var mEmail = texto.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (mEmail) resultado.email = mEmail[0];
        // --- CEP (prioridade a padrões com hífen ou 8 dígitos isolados) ---
        var mCep = texto.match(/\b(\d{5})-?(\d{3})\b/);
        if (mCep) resultado.cep = mCep[1] + mCep[2];
        // --- CPF / CNPJ (coleta candidatos numéricos e escolhe pelo tamanho) ---
        var docs = [];
        var reDoc = /\b(\d{2,3}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2})\b/g;
        var md;
        while ((md = reDoc.exec(texto)) !== null) {
          var dig = md[1].replace(/\D/g, '');
          if (dig.length === 11 || dig.length === 14) docs.push(dig);
        }
        // fallback: sequências puras de 11 ou 14 dígitos
        var rePure = /\b(\d{11}|\d{14})\b/g;
        while ((md = rePure.exec(texto)) !== null) {
          if (docs.indexOf(md[1]) < 0) docs.push(md[1]);
        }
        if (docs.length) {
          // preferir CNPJ se houver, senão CPF
          var cnpj = docs.filter(function (d) { return d.length === 14; })[0];
          var cpf = docs.filter(function (d) { return d.length === 11; })[0];
          resultado.cpf_cnpj = cnpj || cpf || docs[0];
          if (resultado.cpf_cnpj.length === 14) resultado.tipo_pessoa = 'PJ';
          else if (resultado.cpf_cnpj.length === 11) resultado.tipo_pessoa = 'PF';
        }
        // --- Telefone / WhatsApp (BR: 10 ou 11 dígitos com DDD) ---
        var tels = [];
        var reTel = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4,5}[-\s]?\d{4}\b/g;
        var mt;
        while ((mt = reTel.exec(texto)) !== null) {
          var tdig = mt[0].replace(/\D/g, '');
          if (tdig.indexOf('55') === 0 && tdig.length >= 12) tdig = tdig.slice(2);
          if (tdig.length >= 10 && tdig.length <= 11) tels.push(tdig);
        }
        // também procura rótulos comuns
        var telRotulo = extrairRotuloValor(texto, ['Telefone', 'WhatsApp', 'Whats', 'Celular', 'Fone', 'Tel', 'Contato']);
        if (telRotulo) {
          var td2 = telRotulo.replace(/\D/g, '');
          if (td2.indexOf('55') === 0 && td2.length >= 12) td2 = td2.slice(2);
          if (td2.length >= 10 && td2.length <= 11) tels.unshift(td2);
        }
        if (tels.length) {
          // formata (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
          var t = tels[0];
          if (t.length === 11) resultado.telefone = '(' + t.slice(0, 2) + ') ' + t.slice(2, 7) + '-' + t.slice(7);
          else resultado.telefone = '(' + t.slice(0, 2) + ') ' + t.slice(2, 6) + '-' + t.slice(6);
        }
        // --- Campos por rótulo (linhas típicas de cadastro) ---
        // 'Nome' é propositalmente o rótulo mais genérico da lista; a exclusão
        // abaixo impede que ele capture linhas que pertencem a Nome Fantasia ou
        // a Nome/Cargo do Contato-Solicitante (campos distintos de nome_razao).
        var nomeRot = extrairRotuloValor(texto, [
          'Nome completo', 'Nome Completo', 'Razão Social', 'Razao Social', 'Razão social',
          'Nome do cliente', 'Cliente', 'Nome'
        ], [
          'Nome Fantasia', 'Nome fantasia', 'Fantasia',
          'Nome do contato', 'Nome do Contato', 'Nome solicitante', 'Nome do solicitante',
          'Contato / solicitante', 'Contato/solicitante', 'Solicitante', 'Contato nome'
        ]);
        var fantasiaRot = extrairRotuloValor(texto, ['Nome Fantasia', 'Nome fantasia', 'Fantasia']);
        var respRot = extrairRotuloValor(texto, [
          'Responsável Legal', 'Responsavel Legal', 'Representante Legal',
          'Responsável', 'Responsavel', 'Representante'
        ]);
        var contatoNomeRot = extrairRotuloValor(texto, [
          'Nome do contato', 'Nome do Contato', 'Contato / solicitante', 'Contato/solicitante',
          'Solicitante', 'Nome solicitante', 'Nome do solicitante', 'Contato nome'
        ]);
        var contatoCargoRot = extrairRotuloValor(texto, [
          'Cargo do contato', 'Cargo Contato', 'Cargo do solicitante', 'Cargo'
        ]);
        var logRot = extrairRotuloValor(texto, [
          'Logradouro', 'Endereço', 'Endereco', 'Rua', 'Av.', 'Avenida'
        ]);
        var numRot = extrairRotuloValor(texto, ['Número', 'Numero', 'Nº', 'No.', 'N.']);
        var compRot = extrairRotuloValor(texto, ['Complemento', 'Apto', 'Apartamento', 'Sala', 'Bloco']);
        var bairroRot = extrairRotuloValor(texto, ['Bairro']);
        var cidadeRot = extrairRotuloValor(texto, ['Cidade', 'Município', 'Municipio']);
        var ufRot = extrairRotuloValor(texto, ['UF', 'Estado']);
        var cepRot = extrairRotuloValor(texto, ['CEP', 'Cep']);
        var emailRot = extrairRotuloValor(texto, ['E-mail', 'Email', 'E mail']);
        var obsRot = extrairRotuloValor(texto, ['Observações', 'Observacoes', 'Obs', 'Observação', 'Observacao']);
        if (nomeRot) resultado.nome_razao = nomeRot.replace(/\s{2,}/g, ' ').trim();
        if (fantasiaRot) resultado.nome_fantasia = fantasiaRot.replace(/\s{2,}/g, ' ').trim();
        if (respRot) resultado.responsavel_legal = respRot.replace(/\s{2,}/g, ' ').trim();
        if (contatoNomeRot) resultado.contato_nome = contatoNomeRot.replace(/\s{2,}/g, ' ').trim();
        if (contatoCargoRot) resultado.contato_cargo = contatoCargoRot.replace(/\s{2,}/g, ' ').trim();
        if (logRot) resultado.logradouro = logRot.replace(/\s{2,}/g, ' ').trim();
        if (numRot) resultado.numero = numRot.replace(/\s{2,}/g, ' ').trim();
        if (compRot) resultado.complemento = compRot.replace(/\s{2,}/g, ' ').trim();
        if (bairroRot) resultado.bairro = bairroRot.replace(/\s{2,}/g, ' ').trim();
        if (cidadeRot) resultado.cidade = cidadeRot.replace(/\s{2,}/g, ' ').trim();
        if (ufRot) {
          var ufClean = ufRot.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
          if (ufClean.length === 2) resultado.uf = ufClean;
        }
        if (cepRot) {
          var c8 = cepRot.replace(/\D/g, '');
          if (c8.length === 8) resultado.cep = c8;
        }
        if (emailRot && !resultado.email) {
          var em = emailRot.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
          if (em) resultado.email = em[0];
        }
        if (obsRot) resultado.observacoes = obsRot;
        // Heurística de nome: se não achou por rótulo, pega a primeira linha "humana"
        // (sem muitos dígitos, sem @, com pelo menos 2 palavras ou 6 letras)
        if (!resultado.nome_razao) {
          var linhas = texto.split(/\r?\n/);
          for (var li = 0; li < linhas.length; li++) {
            var L = linhas[li].replace(/^\s*[-•*]\s*/, '').trim();
            if (!L || L.length < 4) continue;
            if (/@/.test(L)) continue;
            if (/\d{5,}/.test(L)) continue; // evita linhas de telefone/doc/cep
            if (/^(telefone|whats|celular|fone|tel|cpf|cnpj|email|e-mail|cep|endere[cç]o|rua|av\.?|bairro|cidade|uf|obs)/i.test(L)) continue;
            var palavras = L.split(/\s+/).filter(Boolean);
            if (palavras.length >= 2 || L.replace(/\s/g, '').length >= 6) {
              resultado.nome_razao = L.replace(/\s{2,}/g, ' ');
              break;
            }
          }
        }
        // Detectar UF sozinha (2 letras maiúsculas comuns de estado)
        if (!resultado.uf) {
          var mUf = texto.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
          if (mUf) resultado.uf = mUf[1];
        }
        // Se tem nome fantasia ou CNPJ → força PJ visualmente
        if (resultado.nome_fantasia || (resultado.cpf_cnpj && resultado.cpf_cnpj.length === 14)) {
          resultado.tipo_pessoa = 'PJ';
        }
        // Conta quantos campos úteis foram encontrados
        var preenchidos = 0;
        Object.keys(resultado).forEach(function (k) {
          if (resultado[k] != null && String(resultado[k]).trim() !== '') preenchidos++;
        });
        resultado._preenchidos = preenchidos;
        return resultado;
      }
      function aplicarDadosWhatsappNoForm(dados) {
        if (!dados) return 0;
        var n = 0;
        if (dados.tipo_pessoa === 'PJ' || dados.tipo_pessoa === 'PF') {
          setMcTipo(dados.tipo_pessoa);
        }
        function setIf(id, val, formatFn) {
          if (val == null || String(val).trim() === '') return;
          var el = document.getElementById(id);
          if (!el) return;
          el.value = formatFn ? formatFn(val) : String(val).trim();
          n++;
        }
        setIf('mcNomeRazao', dados.nome_razao);
        setIf('mcNomeFantasia', dados.nome_fantasia);
        setIf('mcRepNome', dados.responsavel_legal);
        setIf('mcContatoNome', dados.contato_nome);
        setIf('mcContatoCargo', dados.contato_cargo);
        setIf('mcTelefone', dados.telefone);
        setIf('mcEmail', dados.email);
        setIf('mcObs', dados.observacoes);
        setIf('mcLogradouro', dados.logradouro);
        setIf('mcNumero', dados.numero);
        setIf('mcComplemento', dados.complemento);
        setIf('mcBairro', dados.bairro);
        setIf('mcCidade', dados.cidade);
        setIf('mcUf', dados.uf, function (v) { return String(v).toUpperCase().slice(0, 2); });
        if (dados.cpf_cnpj) {
          var docFmt = handleMcDocFormatarValor(dados.cpf_cnpj);
          var docEl = document.getElementById('mcDocNumero');
          if (docEl) {
            docEl.value = docFmt;
            // dispara o handler para ajustar PF/PJ pela quantidade de dígitos
            try {
              handleMcDocTyping({ target: docEl });
            } catch (e) { /* ignore */ }
            n++;
          }
        }
        if (dados.cep) {
          var cepEl = document.getElementById('mcCep');
          if (cepEl) {
            cepEl.value = aplicarMascaraCep(dados.cep);
            // dispara autocomplete de endereço se o CEP estiver completo
            try { onMcCepInput({ target: cepEl }); } catch (e) { /* ignore */ }
            n++;
          }
        }
        // Abre o bloco de endereço se algum campo de endereço foi preenchido
        if (dados.cep || dados.logradouro || dados.bairro || dados.cidade || dados.uf || dados.numero) {
          var det = document.querySelector('#formCadastroCliente details');
          if (det) det.open = true;
        }
        return n;
      }
      function onInterpretarWhatsapp() {
        if (formularioBloqueadoSomenteLeitura) return;
        var ta = document.getElementById('mcWhatsappPaste');
        var texto = ta ? ta.value : '';
        if (!String(texto || '').trim()) {
          mcSetWhatsappStatus('Cole o texto do WhatsApp antes de interpretar.', 'err');
          return;
        }
        var dados = interpretarTextoWhatsapp(texto);
        if (!dados || !dados._preenchidos) {
          mcSetWhatsappStatus('Não foi possível extrair dados úteis. Tente colar de novo ou preencha manualmente.', 'err');
          return;
        }
        var qtd = aplicarDadosWhatsappNoForm(dados);
        if (qtd > 0) {
          mcSetWhatsappStatus('✓ ' + qtd + ' campo(s) preenchido(s). Confira e ajuste se necessário.', 'ok');
        } else {
          mcSetWhatsappStatus('Texto interpretado, mas nenhum campo pôde ser aplicado. Preencha manualmente.', 'err');
        }
      }
      function onLimparWhatsappPaste() {
        var ta = document.getElementById('mcWhatsappPaste');
        if (ta) ta.value = '';
        mcSetWhatsappStatus('', '');
      }
      function limparAreaWhatsappNoModal() {
        onLimparWhatsappPaste();
      }
      var MC_ORIGENS_OFICIAIS = ['GetNinjas', 'Contrata Show', 'Site 432UP', 'Equipamentos', 'Orgânico', 'Modelo Promote', 'Nova Prospecção'];
      var MC_FAMILIAS_SERVICO = ['DJ', 'Música ao vivo', 'Equipamentos'];
      function setChipGroupSingle(containerId, hiddenId, valor) {
        var box = document.getElementById(containerId);
        var hid = document.getElementById(hiddenId);
        var v = String(valor || '');
        if (hid) hid.value = v;
        if (!box) return;
        box.querySelectorAll('.chip-item').forEach(function (c) {
          c.classList.toggle('active', c.dataset.val === v);
        });
      }
      function setChipGroupMulti(containerId, hiddenId, valorCsv) {
        var box = document.getElementById(containerId);
        var hid = document.getElementById(hiddenId);
        var parts = String(valorCsv || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (hid) hid.value = parts.join(', ');
        if (!box) return;
        box.querySelectorAll('.chip-item').forEach(function (c) {
          c.classList.toggle('active', parts.indexOf(c.dataset.val) >= 0);
        });
      }
      function bindChipGroupSingle(containerId, hiddenId) {
        var box = document.getElementById(containerId);
        if (!box) return;
        box.querySelectorAll('.chip-item').forEach(function (c) {
          c.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var ja = c.classList.contains('active');
            setChipGroupSingle(containerId, hiddenId, ja ? '' : c.dataset.val);
          });
        });
      }
      function bindChipGroupMulti(containerId, hiddenId) {
        var box = document.getElementById(containerId);
        if (!box) return;
        box.querySelectorAll('.chip-item').forEach(function (c) {
          c.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            c.classList.toggle('active');
            var parts = [];
            box.querySelectorAll('.chip-item.active').forEach(function (x) { parts.push(x.dataset.val); });
            var hid = document.getElementById(hiddenId);
            if (hid) hid.value = parts.join(', ');
          });
        });
      }
      function classificarFamiliaServico(texto) {
        var t = String(texto || '').toLowerCase();
        if (!t) return null;
        if (/\bdj\b/.test(t) || t.indexOf('dj') >= 0) return 'DJ';
        if (/ao vivo|banda|m[uú]sica ao vivo|musica ao vivo|vocal|cantor/.test(t)) return 'Música ao vivo';
        if (/equip|som\b|luz|ilumina|estrutura|led|pista|tel[aã]o| palco/.test(t)) return 'Equipamentos';
        return null;
      }
      function montarServicoClienteDeItens(itens) {
        var achou = {};
        (itens || []).forEach(function (it) {
          if (!it || it.tipo === 'transporte' || it.tipo === 'horas_extras') return;
          var fam = classificarFamiliaServico(it.nome) || classificarFamiliaServico(it.id);
          if (!fam && it.id) {
            var sObj = SVC.find(function (x) { return x.servico_id === String(it.id).toLowerCase(); });
            if (sObj) fam = classificarFamiliaServico(sObj.nome) || classificarFamiliaServico(sObj.servico_id);
          }
          if (!fam && it.tipo === 'pacote') {
            var pObj = PKG.find(function (x) { return x.pacote_id === String(it.id).toLowerCase(); });
            if (pObj) {
              fam = classificarFamiliaServico(pObj.nome);
              var ids = (pObj.servicos_ids && pObj.servicos_ids.length) ? pObj.servicos_ids : (pObj.itens || []);
              ids.forEach(function (sid) {
                var sv = SVC.find(function (x) { return x.servico_id === String(sid).toLowerCase(); });
                var f2 = classificarFamiliaServico(sid) || (sv ? classificarFamiliaServico(sv.nome) : null);
                if (f2) achou[f2] = true;
              });
            }
          }
          if (fam) achou[fam] = true;
        });
        var lista = MC_FAMILIAS_SERVICO.filter(function (f) { return achou[f]; });
        if (lista.length) return lista.join(', ');
        return null;
      }
      async function atualizarClienteDaProposta(clienteId, statusProposta) {
        if (!clienteId) return;
        var st = String(statusProposta || '').toLowerCase();
        if (st !== 'enviada' && st !== 'hold') return;
        var upd = {};
        if (evTipoVal) upd.tipo_cliente = evTipoVal;
        var svcTxt = montarServicoClienteDeItens(window.currentItensPayload);
        if (svcTxt) upd.servico = svcTxt;
        if (st === 'enviada') upd.status_comercial = 'Cliente';
        if (!Object.keys(upd).length) return;
        try {
          var r = await sbPartner.from('co_clientes').update(upd).eq('id', clienteId);
          if (r.error) console.error('[432UP Partner] Falha ao gravar tipo/serviço no cliente:', r.error);
        } catch (e) {
          console.error('[432UP Partner] Exceção ao gravar tipo/serviço no cliente:', e);
        }
      }
      function bindClienteEvents() {
        document.getElementById('fClienteBusca').addEventListener('input', onClienteBuscaInput);
        document.getElementById('fClienteBusca').addEventListener('focus', onClienteBuscaInput);
        document.addEventListener('click', function (e) {
          var wrap = document.getElementById('clienteBuscaWrap');
          if (wrap && !wrap.contains(e.target)) {
            document.getElementById('clienteResultados').classList.add('hidden');
          }
        });
        document.getElementById('btnTrocarCliente').addEventListener('click', trocarCliente);
        document.getElementById('btnEditarCliente').addEventListener('click', function () {
          if (clienteSelecionado && clienteSelecionado.id) {
            abrirModalClienteParaEdicao(clienteSelecionado.id);
          }
        });
        document.getElementById('mcBtnPF').addEventListener('click', function () { setMcTipo('PF'); });
        document.getElementById('mcBtnPJ').addEventListener('click', function () { setMcTipo('PJ'); });
        document.getElementById('mcDocNumero').addEventListener('input', handleMcDocTyping);
        document.getElementById('mcCep').addEventListener('input', onMcCepInput);
        document.getElementById('btnFecharModalCliente').addEventListener('click', fecharModalCliente);
        document.getElementById('formCadastroCliente').addEventListener('submit', submitCadastroCliente);
        var btnInterp = document.getElementById('btnInterpretarWhatsapp');
        var btnLimparPaste = document.getElementById('btnLimparWhatsappPaste');
        if (btnInterp) btnInterp.addEventListener('click', onInterpretarWhatsapp);
        if (btnLimparPaste) btnLimparPaste.addEventListener('click', onLimparWhatsappPaste);
        bindChipGroupSingle('mcChipsTipoCliente', 'mcTipoCliente');
        bindChipGroupMulti('mcChipsServico', 'mcServico');
        bindChipGroupSingle('mcChipsOrigem', 'mcOrigemCliente');
        bindChipGroupSingle('mcChipsStatusComercial', 'mcStatusComercial');
      }
      /* =================================================================== */
      function bindEvents() {
        function onHorarioEventoChange() {
          if (formularioBloqueadoSomenteLeitura) return;
          atualizarLblDuracao();
          renderServicos();
          recalc();
        }
        var elIni = document.getElementById('fHorarioInicio');
        var elFim = document.getElementById('fHorarioFinal');
        if (elIni) elIni.addEventListener('change', onHorarioEventoChange);
        if (elFim) elFim.addEventListener('change', onHorarioEventoChange);
        document.getElementById('fData').addEventListener('change', recalc);
        document.getElementById('fCep').addEventListener('input', onCepChange);
        document.getElementById('toggleTransporte').addEventListener('click', function () {
          if (formularioBloqueadoSomenteLeitura) return;
          transporteAtivo = !transporteAtivo;
          setToggleVisual(transporteAtivo);
          if (!transporteAtivo) {
            transporteValor = 0;
            var elLog = document.getElementById('fValorLogistica');
            if (elLog) elLog.value = '';
          } else if (!transporteValorManual) {
            if (typeof CONFIG_TRANSPORTE !== 'undefined' && CONFIG_TRANSPORTE && transporteDistanciaKm != null) {
              transporteValor = Math.round(transporteDistanciaKm * CONFIG_TRANSPORTE.valor_por_km * 100) / 100;
            }
          }
          recalc();
        });
        var elValorLog = document.getElementById('fValorLogistica');
        if (elValorLog) {
          elValorLog.addEventListener('input', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var n = parseMoedaInput(this.value);
            if (isFinite(n) && n >= 0) {
              transporteValorManual = true;
              transporteValor = n;
              recalc();
            }
          });
          elValorLog.addEventListener('blur', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var n = parseMoedaInput(this.value);
            if (isFinite(n) && n >= 0) {
              transporteValorManual = true;
              transporteValor = Math.round(n * 100) / 100;
              this.value = transporteValor > 0 ? fmtMoeda(transporteValor) : '';
              recalc();
            }
          });
        }
        var elToggleHosp = document.getElementById('toggleHospedagem');
        if (elToggleHosp) {
          elToggleHosp.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            hospedagemAtivo = !hospedagemAtivo;
            setToggleHospedagemVisual(hospedagemAtivo);
            if (!hospedagemAtivo) hospedagemValor = 0;
            recalc();
          });
        }
        var elValorHosp = document.getElementById('fValorHospedagem');
        if (elValorHosp) {
          elValorHosp.addEventListener('input', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var n = parseMoedaInput(this.value);
            if (isFinite(n) && n >= 0) {
              hospedagemValor = n;
              recalc();
            }
          });
          elValorHosp.addEventListener('blur', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var n = parseMoedaInput(this.value);
            if (isFinite(n) && n >= 0) {
              hospedagemValor = Math.round(n * 100) / 100;
              this.value = hospedagemValor > 0 ? fmtMoeda(hospedagemValor) : '';
              recalc();
            }
          });
        }
        // chipsTipo: binding feito em carregarTiposEvento()
        document.querySelectorAll('#chipsConvidados .chip-item').forEach(function (c) {
          c.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            document.querySelectorAll('#chipsConvidados .chip-item').forEach(function (x) { x.classList.remove('active'); });
            c.classList.add('active');
            evConvidados = parseInt(c.dataset.val, 10);
            var livre = document.getElementById('fConvidadosLivre');
            if (livre) livre.value = '';
            renderServicos();
            recalc();
          });
        });
        var fConvidadosLivre = document.getElementById('fConvidadosLivre');
        if (fConvidadosLivre) {
          fConvidadosLivre.addEventListener('input', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var n = parseInt(this.value, 10);
            if (isFinite(n) && n > 0) {
              evConvidados = n;
              document.querySelectorAll('#chipsConvidados .chip-item').forEach(function (x) { x.classList.remove('active'); });
              renderServicos();
              recalc();
            }
          });
          fConvidadosLivre.addEventListener('change', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            var n = parseInt(this.value, 10);
            if (isFinite(n) && n > 0) {
              evConvidados = n;
              document.querySelectorAll('#chipsConvidados .chip-item').forEach(function (x) { x.classList.remove('active'); });
              renderServicos();
              recalc();
            } else if (!this.value) {
              // se limpar, volta para o chip padrão 80 se nenhum chip ativo
              var ativo = document.querySelector('#chipsConvidados .chip-item.active');
              if (!ativo) {
                var c80 = document.querySelector('#chipsConvidados .chip-item[data-val="80"]');
                if (c80) {
                  c80.classList.add('active');
                  evConvidados = 80;
                }
              }
              renderServicos();
              recalc();
            }
          });
        }
        /* AÇÕES DE BOTÃO */
        var btnEnviar = document.getElementById('btnFinalizarEnviar');
        var btnRascunho = document.getElementById('btnSalvarRascunho');
        var btnHold = document.getElementById('btnCadastrarHold');
        if (btnEnviar) btnEnviar.addEventListener('click', function () { salvarProposta('enviada'); });
        if (btnRascunho) btnRascunho.addEventListener('click', function () { salvarProposta('rascunho'); });
        if (btnHold) btnHold.addEventListener('click', function () { salvarProposta('hold'); });
        var mBtnEnviar = document.getElementById('mobileBtnFinalizarEnviar');
        var mBtnRascunho = document.getElementById('mobileBtnSalvarRascunho');
        if (mBtnEnviar) mBtnEnviar.addEventListener('click', function () { salvarProposta('enviada'); });
        if (mBtnRascunho) mBtnRascunho.addEventListener('click', function () { salvarProposta('rascunho'); });
        // Desconto comercial — Admin edita; Vendedor só visualiza
        var fPct = document.getElementById('fDescontoPct');
        var fTot = document.getElementById('fTotalDesejado');
        if (fPct) {
          fPct.addEventListener('change', onDescontoPctChange);
          fPct.addEventListener('input', function () {
            // atualização em tempo quase real, sem forçar loop
            if (descontoUiUpdating) return;
            clearTimeout(fPct._t);
            fPct._t = setTimeout(onDescontoPctChange, 280);
          });
        }
        if (fTot) {
          fTot.addEventListener('change', onTotalDesejadoChange);
          fTot.addEventListener('blur', onTotalDesejadoChange);
        }
      }
      function ehAdmin() {
        return !!(parceiroAtual && String(parceiroAtual.role || '').toLowerCase() === 'admin');
      }
      function parseMoedaInput(str) {
        if (str == null || str === '') return NaN;
        var s = String(str).trim().replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.');
        var n = parseFloat(s);
        return isFinite(n) ? n : NaN;
      }
      function aplicarDescontoSobreSubtotal(subtotal, transporte) {
        // Valida e aplica desconto APENAS sobre o valor comercial (subtotal).
        // Transporte nunca recebe desconto.
        var sub = Number(subtotal) || 0;
        var transp = Number(transporte) || 0;
        var pct = Number(descontoPercentual) || 0;
        var dVal = Number(descontoValor) || 0;
        if (!isFinite(sub) || sub < 0) sub = 0;
        if (!isFinite(transp) || transp < 0) transp = 0;
        if (modoDesconto === 'total_desejado' && totalDesejadoTemp != null && isFinite(totalDesejadoTemp)) {
          // desconto_valor = subtotal + transporte - total_desejado
          var desejado = Math.max(0, Number(totalDesejadoTemp));
          dVal = sub + transp - desejado;
          if (dVal < 0) dVal = 0; // não gerar desconto negativo silenciosamente
          if (sub > 0) {
            pct = (dVal / sub) * 100;
          } else {
            pct = 0;
            dVal = 0;
          }
          // Bloquear se exigir desconto > 100% do comercial
          if (pct > 100 + 1e-9) {
            return { ok: false, msg: 'O total desejado exige desconto maior que 100% do valor comercial. Ajuste o valor.', sub: sub, transp: transp, pct: descontoPercentual, dVal: descontoValor, total: Math.max(0, sub - descontoValor + transp) };
          }
        } else {
          // modo percentual (padrão)
          if (pct < 0) pct = 0;
          if (pct > 100) pct = 100;
          dVal = sub * pct / 100;
        }
        if (!isFinite(pct) || pct < 0) pct = 0;
        if (!isFinite(dVal) || dVal < 0) dVal = 0;
        if (pct > 100) { pct = 100; dVal = sub; }
        var totalFinal = sub - dVal + transp;
        if (!isFinite(totalFinal) || totalFinal < 0) totalFinal = 0;
        descontoPercentual = Math.round(pct * 100) / 100;
        descontoValor = Math.round(dVal * 100) / 100;
        valorSubtotal = Math.round(sub * 100) / 100;
        return { ok: true, msg: '', sub: valorSubtotal, transp: transp, pct: descontoPercentual, dVal: descontoValor, total: Math.round(totalFinal * 100) / 100 };
      }
      function atualizarUIDesconto(res) {
        var pctEl = document.getElementById('fDescontoPct');
        var totalEl = document.getElementById('fTotalDesejado');
        var dValEl = document.getElementById('sumDescontoValor');
        var alertEl = document.getElementById('descontoAlert');
        var subEl = document.getElementById('sumValorSubtotal');
        var transpEl = document.getElementById('sumValorTransporte');
        var hospEl = document.getElementById('sumValorHospedagem');
        descontoUiUpdating = true;
        try {
          if (subEl) subEl.textContent = fmtMoeda(res.sub);
          if (transpEl) transpEl.textContent = fmtMoeda(res.transp);
          if (hospEl) hospEl.textContent = fmtMoeda(hospedagemAtivo ? hospedagemValor : 0);
          if (dValEl) dValEl.textContent = fmtMoeda(res.dVal);
          if (pctEl && document.activeElement !== pctEl) {
            pctEl.value = (res.pct != null ? Number(res.pct) : 0).toFixed(2);
          }
          if (totalEl && document.activeElement !== totalEl) {
            if (modoDesconto === 'total_desejado' && totalDesejadoTemp != null) {
              totalEl.value = fmtMoeda(totalDesejadoTemp);
            } else if (res.total > 0) {
              totalEl.value = fmtMoeda(res.total);
            } else {
              totalEl.value = '';
            }
          }
          if (alertEl) {
            if (!res.ok && res.msg) {
              alertEl.textContent = res.msg;
              alertEl.classList.remove('hidden');
            } else {
              alertEl.textContent = '';
              alertEl.classList.add('hidden');
            }
          }
        } finally {
          descontoUiUpdating = false;
        }
      }
      function aplicarPermissaoDesconto() {
        var isAdm = ehAdmin();
        var pctEl = document.getElementById('fDescontoPct');
        var totalEl = document.getElementById('fTotalDesejado');
        [pctEl, totalEl].forEach(function (el) {
          if (!el) return;
          el.disabled = !isAdm || formularioBloqueadoSomenteLeitura;
          el.classList.toggle('opacity-60', !isAdm || formularioBloqueadoSomenteLeitura);
          el.classList.toggle('cursor-not-allowed', !isAdm || formularioBloqueadoSomenteLeitura);
        });
      }
      /* ===================== PAGAMENTO (forma_pagamento / condicao_pagamento / desconto_pix_aplicado) ===================== */
      var CONDICOES_POR_FORMA = {
        pix: [
          { val: 'pix_50_50', label: '50% na reserva + 50% até 1 dia antes' },
          { val: 'pix_integral', label: 'Integral (100%) na reserva' }
        ],
        cartao: [
          { val: 'cartao_parcelado_12x', label: 'Parcelado em até 12x' }
        ],
        outro: []
      };
      function renderCondicoesPagamento() {
        var bloco = document.getElementById('blocoCondicaoPagamento');
        var container = document.getElementById('chipsCondicaoPagamento');
        if (!bloco || !container) return;
        var lista = CONDICOES_POR_FORMA[formaPagamentoVal] || [];
        var outraBloco = document.getElementById('blocoOutraFormaPagamento');
        if (outraBloco) outraBloco.classList.toggle('hidden', formaPagamentoVal !== 'outro');
        if (!formaPagamentoVal || !lista.length) {
          bloco.classList.add('hidden');
          container.innerHTML = '';
          renderAgendaPagamento();
          return;
        }
        bloco.classList.remove('hidden');
        container.innerHTML = lista.map(function (c) {
          var ativo = (c.val === condicaoPagamentoVal) ? ' active' : '';
          return '<span class="chip-item' + ativo + '" data-val="' + esc(c.val) + '">' + esc(c.label) + '</span>';
        }).join('');
        container.querySelectorAll('.chip-item').forEach(function (chip) {
          chip.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            container.querySelectorAll('.chip-item').forEach(function (x) { x.classList.remove('active'); });
            chip.classList.add('active');
            condicaoPagamentoVal = chip.dataset.val;
            renderAgendaPagamento();
            recalc();
          });
        });
        renderAgendaPagamento();
      }
      // Retorna a data do evento (fData) menos 1 dia, em formato YYYY-MM-DD,
      // usada como valor padrão (editável) do Saldo no PIX 50/50.
      function calcDataSaldoDefault() {
        var dataEv = (document.getElementById('fData') || {}).value;
        if (!dataEv) return '';
        var d = new Date(dataEv + 'T00:00:00');
        if (isNaN(d.getTime())) return '';
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
      }
      // Renderiza o bloco de agenda de pagamento (datas, parcelas, status,
      // descrição livre) de acordo com a forma/condição selecionada.
      // Apenas coleta/exibe dados em pagamentoAgendaState — não recalcula
      // nem altera valor_total. Quem lê esse estado no fim é salvarProposta().
      function renderAgendaPagamento() {
        var box = document.getElementById('blocoAgendaPagamento');
        if (!box) return;
        function chipsStatus(campo, valorAtual) {
          return '<div class="flex gap-1.5" data-status-field="' + campo + '">' +
            '<span class="chip-item' + (valorAtual === 'pendente' ? ' active' : '') + '" data-status-val="pendente">Pendente</span>' +
            '<span class="chip-item' + (valorAtual === 'pago' ? ' active' : '') + '" data-status-val="pago">Pago</span>' +
          '</div>';
        }
        var html = '';
        if (formaPagamentoVal === 'pix' && condicaoPagamentoVal === 'pix_integral') {
          html += '<div class="space-y-1">' +
            '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Data do Pagamento</span>' +
            '<input type="date" id="fAgendaDataPagamento" value="' + esc(pagamentoAgendaState.data_pagamento || '') + '" class="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition">' +
          '</div>' +
          '<div class="space-y-1">' +
            '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status</span>' +
            chipsStatus('status', pagamentoAgendaState.status) +
          '</div>';
        } else if (formaPagamentoVal === 'pix' && condicaoPagamentoVal === 'pix_50_50') {
          if (!pagamentoAgendaState.data_saldo) pagamentoAgendaState.data_saldo = calcDataSaldoDefault();
          html += '<div class="grid grid-cols-2 gap-2">' +
            '<div class="space-y-1">' +
              '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Data Entrada</span>' +
              '<input type="date" id="fAgendaDataEntrada" value="' + esc(pagamentoAgendaState.data_entrada || '') + '" class="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition">' +
            '</div>' +
            '<div class="space-y-1">' +
              '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Data Saldo</span>' +
              '<input type="date" id="fAgendaDataSaldo" value="' + esc(pagamentoAgendaState.data_saldo || '') + '" class="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition">' +
            '</div>' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2">' +
            '<div class="space-y-1">' +
              '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status Entrada</span>' +
              chipsStatus('status_entrada', pagamentoAgendaState.status_entrada) +
            '</div>' +
            '<div class="space-y-1">' +
              '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status Saldo</span>' +
              chipsStatus('status_saldo', pagamentoAgendaState.status_saldo) +
            '</div>' +
          '</div>';
        } else if (formaPagamentoVal === 'cartao') {
          html += '<div class="grid grid-cols-2 gap-2 items-end">' +
            '<div class="space-y-1 flex flex-col justify-end h-full">' +
              '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Nº de Parcelas</span>' +
              '<input type="number" min="1" max="12" id="fAgendaParcelasCartao" value="' + esc(pagamentoAgendaState.parcelas_cartao || '') + '" class="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition">' +
            '</div>' +
            '<div class="space-y-1 flex flex-col justify-end h-full">' +
              '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Data em que o Cartão foi Passado</span>' +
              '<input type="date" id="fAgendaDataPagamento" value="' + esc(pagamentoAgendaState.data_pagamento || '') + '" class="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition">' +
            '</div>' +
          '</div>' +
          '<div class="space-y-1">' +
            '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status</span>' +
            chipsStatus('status', pagamentoAgendaState.status) +
          '</div>';
        } else if (formaPagamentoVal === 'outro') {
          html += '<div class="space-y-1">' +
            '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Descrição da Negociação (valores e datas)</span>' +
            '<textarea id="fAgendaDescricaoOutro" rows="3" maxlength="500" placeholder="Ex.: R$ 1.000 na assinatura + R$ 2.000 até 10/12, transferência bancária" class="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition">' + esc(pagamentoAgendaState.descricao_outro || '') + '</textarea>' +
          '</div>' +
          '<div class="space-y-1">' +
            '<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status</span>' +
            chipsStatus('status', pagamentoAgendaState.status) +
          '</div>';
        }
        if (!html) {
          box.classList.add('hidden');
          box.innerHTML = '';
          return;
        }
        box.classList.remove('hidden');
        box.innerHTML = html;
        var elDataPagamento = document.getElementById('fAgendaDataPagamento');
        if (elDataPagamento) elDataPagamento.addEventListener('change', function () { pagamentoAgendaState.data_pagamento = this.value || null; });
        var elDataEntrada = document.getElementById('fAgendaDataEntrada');
        if (elDataEntrada) elDataEntrada.addEventListener('change', function () { pagamentoAgendaState.data_entrada = this.value || null; });
        var elDataSaldo = document.getElementById('fAgendaDataSaldo');
        if (elDataSaldo) elDataSaldo.addEventListener('change', function () { pagamentoAgendaState.data_saldo = this.value || null; });
        var elParcelas = document.getElementById('fAgendaParcelasCartao');
        if (elParcelas) elParcelas.addEventListener('change', function () {
          var n = parseInt(this.value, 10);
          pagamentoAgendaState.parcelas_cartao = (isFinite(n) && n > 0) ? n : null;
        });
        var elDescricao = document.getElementById('fAgendaDescricaoOutro');
        if (elDescricao) elDescricao.addEventListener('input', function () { pagamentoAgendaState.descricao_outro = this.value; });
        box.querySelectorAll('[data-status-field]').forEach(function (grupo) {
          var campo = grupo.dataset.statusField;
          grupo.querySelectorAll('.chip-item').forEach(function (chip) {
            chip.addEventListener('click', function () {
              if (formularioBloqueadoSomenteLeitura) return;
              grupo.querySelectorAll('.chip-item').forEach(function (x) { x.classList.remove('active'); });
              chip.classList.add('active');
              pagamentoAgendaState[campo] = chip.dataset.statusVal;
            });
          });
        });
      }
      // Se a data do evento mudar e o Saldo do PIX 50/50 ainda não tiver sido
      // editado manualmente, atualiza o default (evento - 1 dia).
      (function bindDataEventoParaSaldo() {
        var elData = document.getElementById('fData');
        if (!elData) return;
        elData.addEventListener('change', function () {
          if (condicaoPagamentoVal === 'pix_50_50' && !pagamentoAgendaState.data_saldo) {
            pagamentoAgendaState.data_saldo = calcDataSaldoDefault();
            renderAgendaPagamento();
          }
        });
      })();
      function selecionarFormaPagamento(forma) {
        formaPagamentoVal = forma;
        // Ao selecionar uma forma, mantém uma condição válida para que o estado
        // de pagamento seja efetivamente aplicado ao total já calculado.
        var lista = CONDICOES_POR_FORMA[forma] || [];
        if (forma === 'pix') {
          condicaoPagamentoVal = 'pix_50_50';
        } else if (!lista.some(function (c) { return c.val === condicaoPagamentoVal; })) {
          condicaoPagamentoVal = lista.length ? lista[0].val : null;
        }
        document.querySelectorAll('#chipsFormaPagamento .chip-item').forEach(function (c) {
          c.classList.toggle('active', c.dataset.val === forma);
        });
        renderCondicoesPagamento();
        recalc();
      }
      function bindPagamentoEvents() {
        document.querySelectorAll('#chipsFormaPagamento .chip-item').forEach(function (chip) {
          chip.addEventListener('click', function () {
            if (formularioBloqueadoSomenteLeitura) return;
            selecionarFormaPagamento(chip.dataset.val);
          });
        });
      }
      // Atualiza a mensagem informativa de pagamento exibida no boxPagamento
      // (desconto PIX ou acréscimo Cartão — nunca os dois ao mesmo tempo, pois
      // formaPagamentoVal só assume um valor por vez). Não recalcula nada —
      // apenas reflete o resultado já produzido em recalc().
      function atualizarUIPagamento(descontoPixValor, acrescimoCartaoValor) {
        var infoEl = document.getElementById('descontoPixInfo');
        if (!infoEl) return;
        if (condicaoPagamentoVal === 'pix_integral' && descontoPixValor > 0) {
          infoEl.textContent = 'Desconto PIX (' + descontoPixPercentualConfig.toFixed(0) + '%) aplicado: -' + fmtMoeda(descontoPixValor);
          infoEl.className = 'text-[11px] text-emerald-400 font-semibold';
          infoEl.classList.remove('hidden');
        } else if (formaPagamentoVal === 'cartao' && acrescimoCartaoValor > 0) {
          infoEl.textContent = 'Acréscimo Cartão (' + acrescimoCartaoPercentualConfig.toFixed(2) + '%) aplicado: +' + fmtMoeda(acrescimoCartaoValor);
          infoEl.className = 'text-[11px] text-amber-400 font-semibold';
          infoEl.classList.remove('hidden');
        } else {
          infoEl.textContent = '';
          infoEl.className = 'hidden text-[11px] font-semibold';
        }
      }
      function onDescontoPctChange() {
        if (descontoUiUpdating || formularioBloqueadoSomenteLeitura || !ehAdmin()) return;
        var el = document.getElementById('fDescontoPct');
        var raw = parseFloat(el.value);
        if (!isFinite(raw) || raw < 0) raw = 0;
        if (raw > 100) raw = 100;
        modoDesconto = 'percentual';
        totalDesejadoTemp = null;
        descontoPercentual = raw;
        recalc();
      }
      function onTotalDesejadoChange() {
        if (descontoUiUpdating || formularioBloqueadoSomenteLeitura || !ehAdmin()) return;
        var el = document.getElementById('fTotalDesejado');
        var raw = parseMoedaInput(el.value);
        if (!isFinite(raw) || raw < 0) {
          // input vazio/ inválido → volta para modo percentual sem forçar valor
          return;
        }
        modoDesconto = 'total_desejado';
        totalDesejadoTemp = raw;
        recalc();
      }
      function recalc() {
        var cliente = clienteSelecionado ? clienteSelecionado.nome_razao : '—';
        var dataEv = document.getElementById('fData').value;
        var duracaoEv = getDuracaoHorasEvento();
        var horas = duracaoEv != null ? duracaoEv : 4;
        atualizarLblDuracao();
        var totalComercial = 0; // valor comercial ANTES do desconto (sem transporte)
        var listaLinhas = [];
        var itensPayload = [];
        var pObj = PKG.find(function (x) { return x.pacote_id === activePkg; });
        if (pObj) {
          var inclusos = servicosInclusosPacote(pObj);
          var somaAvulsa = 0;
          inclusos.forEach(function (s) {
            var hRef = s.isPorHora ? (s.horas_minimas || 0) : null;
            var mRef = s.isPorMetro ? (s.metragem_minima || 0) : null;
            var refVal = valorReferenciaAvulso(s, hRef, mRef, 1);
            somaAvulsa += refVal;
            listaLinhas.push({
              nome: s.nome + rotuloQtyIncluso(s, hRef, mRef, 1),
              val: refVal,
              kind: 'incluso'
            });
          });
          if (somaAvulsa > 0) {
            listaLinhas.push({ nome: 'Soma avulsa (referência)', val: somaAvulsa, kind: 'ref' });
            var economiaPkg = Math.max(0, somaAvulsa - pObj.preco);
            if (economiaPkg > 0) {
              listaLinhas.push({ nome: 'Economia do pacote', val: -economiaPkg, kind: 'economia' });
            }
          }
          totalComercial += pObj.preco;
          listaLinhas.push({ nome: 'Pacote ' + pObj.nome, val: pObj.preco, kind: 'pacote' });
          itensPayload.push({
            tipo: 'pacote',
            id: pObj.pacote_id,
            nome: 'Pacote ' + pObj.nome,
            valor: pObj.preco,
            horas: pObj.horas,
            itens_inclusos: inclusos.map(function (s) {
              var hRef = s.isPorHora ? (s.horas_minimas || 0) : null;
              var mRef = s.isPorMetro ? (s.metragem_minima || 0) : null;
              return {
                nome: s.nome,
                valor_referencia: valorReferenciaAvulso(s, hRef, mRef, 1),
                horas: hRef || null,
                metragem: mRef || null,
                quantidade: 1,
                unidade_metragem: s.unidade_metragem || null,
                incluso_no_pacote: true
              };
            })
          });
          var extraH = Math.max(0, horas - pObj.horas);
          if (extraH > 0) {
            var valExtraH = extraH * 350;
            totalComercial += valExtraH;
            listaLinhas.push({ nome: '+' + extraH + 'h Horas Extras', val: valExtraH });
            itensPayload.push({
              tipo: 'horas_extras',
              id: 'horas_extras',
              nome: '+' + extraH + 'h Horas Extras',
              valor: valExtraH,
              horas: extraH
            });
          }
        }
        // Linhas do carrinho (serviços adicionados) — cada uma vira item no PDF/contrato
        orcamentoItens.forEach(function (it) {
          var val = Number(it.valor) || 0;
          if (val <= 0) return;
          totalComercial += val;
          listaLinhas.push({
            nome: rotuloNomeResumo(it),
            val: val,
            cart_id: it.cart_id,
            removivel: true
          });
          itensPayload.push({
            tipo: 'servico',
            id: it.id,
            nome: it.nome,
            valor: val,
            quantidade: it.quantidade != null ? Number(it.quantidade) : 1,
            preco_unitario: it.preco_unitario != null ? Number(it.preco_unitario) : null,
            metragem: it.metragem != null ? Number(it.metragem) : null,
            horas: it.horas != null ? Number(it.horas) : null,
            unidade_metragem: it.unidade_metragem || null,
            valor_por_metro_aplicado: it.valor_por_metro_aplicado != null ? it.valor_por_metro_aplicado : null,
            valor_por_hora_aplicado: it.valor_por_hora_aplicado != null ? it.valor_por_hora_aplicado : null,
            faixa_aplicada: it.faixa_aplicada || null,
            cart_id: it.cart_id
          });
        });

        // Composer ativo no card (ainda não enviado ao carrinho) — entra no total ao vivo
        SVC.forEach(function (s) {
          var qtd = Number(svcQuantidade[s.servico_id]) || 0;
          var metragemAtual = svcMetragem[s.servico_id] || 0;
          var horasAtual = svcHoras[s.servico_id] || 0;
          var st = svcState[s.servico_id];
          var ligado = qtd > 0 || metragemAtual > 0 || horasAtual > 0 || st === 'manual';
          if (!ligado) return;
          if (qtd <= 0) qtd = 1;
          var linha = montarLinhaCarrinho(s);
          // montarLinhaCarrinho gera cart_id novo — não usar no payload de cart; linha ao vivo
          var val = Number(linha.valor) || 0;
          if (val <= 0) return;
          totalComercial += val;
          listaLinhas.push({
            nome: rotuloNomeResumo(linha) + '',
            val: val,
            composer: true
          });
          itensPayload.push({
            tipo: 'servico',
            id: s.servico_id,
            nome: s.nome,
            valor: val,
            quantidade: qtd,
            preco_unitario: linha.preco_unitario,
            metragem: linha.metragem != null ? linha.metragem : null,
            horas: linha.horas != null ? linha.horas : null,
            unidade_metragem: linha.unidade_metragem || null,
            valor_por_metro_aplicado: linha.valor_por_metro_aplicado,
            valor_por_hora_aplicado: linha.valor_por_hora_aplicado,
            faixa_aplicada: linha.faixa_aplicada || null
          });
        });
        // LOGÍSTICA (ex-transporte) — automática por CEP e/ou valor editável manualmente.
        // NUNCA recebe desconto comercial.
        var transporteItem = null;
        if (transporteAtivo) {
          if (!transporteValorManual) {
            if (CONFIG_TRANSPORTE && transporteDistanciaKm != null) {
              transporteValor = Math.round(transporteDistanciaKm * CONFIG_TRANSPORTE.valor_por_km * 100) / 100;
            } else {
              transporteValor = 0;
            }
          }
          // Sincroniza input (se não estiver focado)
          var elLog = document.getElementById('fValorLogistica');
          if (elLog && document.activeElement !== elLog) {
            elLog.value = transporteValor > 0 ? fmtMoeda(transporteValor) : '';
          }
          if (transporteValor > 0) {
            var nomeLog = 'Logística';
            if (transporteDistanciaKm != null) nomeLog += ' (' + transporteDistanciaKm.toFixed(1) + 'km)';
            listaLinhas.push({ nome: nomeLog, val: transporteValor });
            transporteItem = {
              tipo: 'transporte', nome: 'Logística', valor: transporteValor,
              cep: transporteCepValido, distancia_km: transporteDistanciaKm,
              valor_por_km_aplicado: CONFIG_TRANSPORTE ? CONFIG_TRANSPORTE.valor_por_km : null,
              origem_label: CONFIG_TRANSPORTE ? CONFIG_TRANSPORTE.origem_label : null,
              valor_manual: !!transporteValorManual
            };
            itensPayload.push(transporteItem);
          }
        } else {
          // Toggle desligado: logística não entra no total nem no resumo
          transporteValor = 0;
          var elLogOff = document.getElementById('fValorLogistica');
          if (elLogOff && document.activeElement !== elLogOff) elLogOff.value = '';
        }
        // HOSPEDAGEM — valor digitado; NUNCA recebe desconto comercial.
        var hospedagemItem = null;
        if (hospedagemAtivo && hospedagemValor > 0) {
          listaLinhas.push({ nome: 'Hospedagem', val: hospedagemValor });
          hospedagemItem = { tipo: 'hospedagem', nome: 'Hospedagem', valor: hospedagemValor };
          itensPayload.push(hospedagemItem);
        }
        // DESCONTO — somente sobre o valor comercial (subtotal)
        var resDesc = aplicarDescontoSobreSubtotal(totalComercial, transporteValor);
        var total = resDesc.total;
        // Hospedagem fica fora do desconto (somada após o cálculo comercial)
        if (hospedagemAtivo && hospedagemValor > 0) {
          total = Math.round((total + hospedagemValor) * 100) / 100;
        }
        // Exibe linha de desconto na lista quando houver
        if (resDesc.dVal > 0) {
          listaLinhas.push({ nome: 'Desconto comercial (' + resDesc.pct.toFixed(2) + '%)', val: -resDesc.dVal });
        }
        // ACRÉSCIMO CARTÃO — percentual vigente lido de co_config_financeiro.
        // Incide sobre o total já calculado (após desconto comercial + transporte).
        var acrescimoCartaoValor = 0;
        if (formaPagamentoVal === 'cartao' && acrescimoCartaoPercentualConfig > 0) {
          acrescimoCartaoValor = Math.round((total * acrescimoCartaoPercentualConfig / 100) * 100) / 100;
          total = Math.round((total + acrescimoCartaoValor) * 100) / 100;
          listaLinhas.push({ nome: 'Acréscimo Cartão (' + acrescimoCartaoPercentualConfig.toFixed(2) + '%)', val: acrescimoCartaoValor });
        }
        // DESCONTO PIX — aplicado somente quando a condição selecionada é o
        // pagamento integral (100%) via PIX. O percentual usado é sempre o
        // vigente lido de co_config_financeiro (nunca hardcoded). Incide sobre
        // o total já calculado (após desconto comercial + transporte).
        var descontoPixValor = 0;
        if (condicaoPagamentoVal === 'pix_integral' && descontoPixPercentualConfig > 0) {
          descontoPixAplicadoVal = descontoPixPercentualConfig;
          descontoPixValor = Math.round((total * descontoPixPercentualConfig / 100) * 100) / 100;
          total = Math.round((total - descontoPixValor) * 100) / 100;
          listaLinhas.push({ nome: 'Desconto PIX (' + descontoPixPercentualConfig.toFixed(0) + '%)', val: -descontoPixValor });
        } else {
          descontoPixAplicadoVal = 0;
        }
        atualizarUIPagamento(descontoPixValor, acrescimoCartaoValor);
        atualizarUIDesconto(resDesc);
        aplicarPermissaoDesconto();
        var comissaoPct = parceiroAtual ? parceiroAtual.comissao_padrao_pct : 10;
        // Comissão sobre o valor final (após desconto), mantendo comportamento comercial atual
        var comissaoValor = (total * comissaoPct) / 100;
        document.getElementById('sumCliente').textContent = cliente;
        document.getElementById('sumData').textContent = fmtData(dataEv);
        document.getElementById('sumInfoBase').textContent = formatarDuracaoHoras(duracaoEv) + ' / ' + evConvidados + ' pessoas';
        var sumTotalEl = document.getElementById('sumValorTotal');
        var sumComissaoValEl = document.getElementById('sumComissaoValor');
        var boxComissaoEl = document.getElementById('boxComissao');
        var mobTotalEl = document.getElementById('mobileValorTotal');
        var mobComissaoValEl = document.getElementById('mobileComissaoValor');
        var mobComissaoBoxEl = document.getElementById('mobileComissaoBox');
        if (total > 0 || totalComercial > 0) {
          sumTotalEl.textContent = fmtMoeda(total);
          sumTotalEl.className = 'text-2xl font-bold text-white mt-0.5';
          sumComissaoValEl.textContent = fmtMoeda(comissaoValor);
          boxComissaoEl.classList.remove('hidden');
          if (mobTotalEl) {
            mobTotalEl.textContent = fmtMoeda(total);
            mobTotalEl.className = 'text-lg font-bold text-white';
          }
          if (mobComissaoValEl) mobComissaoValEl.textContent = fmtMoeda(comissaoValor);
          if (mobComissaoBoxEl) mobComissaoBoxEl.classList.remove('hidden');
        } else {
          sumTotalEl.textContent = 'Selecione um pacote ou serviço';
          sumTotalEl.className = 'text-sm font-semibold text-amber-400 mt-0.5';
          boxComissaoEl.classList.add('hidden');
          if (mobTotalEl) {
            mobTotalEl.textContent = 'Selecione as opções acima';
            mobTotalEl.className = 'text-xs font-semibold text-amber-400 leading-tight';
          }
          if (mobComissaoBoxEl) mobComissaoBoxEl.classList.add('hidden');
        }
        var containerLista = document.getElementById('sumListaItens');
        if (listaLinhas.length) {
          containerLista.innerHTML = listaLinhas.map(function (l) {
            if (l.kind === 'incluso') {
              return '<div class="flex justify-between text-[10px] text-slate-500 sum-sub">' +
                '<span class="truncate max-w-[140px]">' + esc(l.nome) + '</span>' +
                '<strong class="text-slate-500 font-medium sum-strike">' + fmtMoeda(l.val) + '</strong>' +
              '</div>';
            }
            if (l.kind === 'ref') {
              return '<div class="flex justify-between text-[10px] text-slate-500">' +
                '<span>' + esc(l.nome) + '</span>' +
                '<strong class="text-slate-500 font-medium">' + fmtMoeda(l.val) + '</strong>' +
              '</div>';
            }
            if (l.kind === 'economia') {
              return '<div class="flex justify-between text-[10px] text-emerald-400/90">' +
                '<span>' + esc(l.nome) + '</span>' +
                '<strong>' + fmtMoeda(l.val) + '</strong>' +
              '</div>';
            }
            if (l.kind === 'pacote') {
              return '<div class="flex justify-between text-[11px] text-amber-300">' +
                '<span class="truncate max-w-[140px] font-semibold">' + esc(l.nome) + '</span>' +
                '<strong class="text-white">' + fmtMoeda(l.val) + '</strong>' +
              '</div>';
            }
            var valClass = l.val < 0 ? 'text-emerald-400' : 'text-white';
            var removeBtn = (l.removivel && l.cart_id)
              ? '<button type="button" class="cart-remove-btn" data-cart-remove="' + esc(l.cart_id) + '" title="Remover">−</button>'
              : '';
            return '<div class="flex justify-between items-center gap-1 text-[11px] text-slate-300">' +
              '<span class="truncate max-w-[120px] flex-1">' + esc(l.nome) + '</span>' +
              '<strong class="' + valClass + ' whitespace-nowrap">' + fmtMoeda(l.val) + '</strong>' +
              removeBtn +
            '</div>';
          }).join('');
          containerLista.querySelectorAll('[data-cart-remove]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              removerDoCarrinho(btn.getAttribute('data-cart-remove'));
            });
          });
        } else {
          containerLista.innerHTML = '<div class="text-[11px] text-slate-500 italic">Nenhum item selecionado</div>';
        }
        window.currentItensPayload = itensPayload;
        window.currentTotal = total;
        window.currentTransporte = transporteItem;
        window.currentSubtotal = valorSubtotal;
        window.currentDescontoPercentual = descontoPercentual;
        window.currentDescontoValor = descontoValor;
        window.currentDescontoPixAplicado = descontoPixAplicadoVal;
      }
      async function avisarTelegramProposta(dados) {
        try {
          const resposta = await fetch('https://www.432up.com/avisos-telegram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
          });
          const texto = await resposta.text();
          console.log('[432UP Proposta → Telegram]', resposta.status, texto);
          return resposta.ok;
        } catch (erro) {
          console.error('[432UP Proposta → Telegram] Falha:', erro);
          return false;
        }
      }
      function salvarProposta(statusDesejado) {
        if (formularioBloqueadoSomenteLeitura) return;
        var dataEv = document.getElementById('fData').value;
        var local = document.getElementById('fLocal').value.trim();
        var obs = document.getElementById('fObs').value.trim();
        var duracaoEvSave = getDuracaoHorasEvento();
        var horas = duracaoEvSave != null ? duracaoEvSave : 4;
        var cepVal = document.getElementById('fCep').value.trim();
        var nomeCliente = clienteSelecionado && clienteSelecionado.nome_razao
          ? String(clienteSelecionado.nome_razao).trim()
          : String((document.getElementById('fClienteBusca') || {}).value || '').trim();
        var pct = parceiroAtual.comissao_padrao_pct;
        var stNorm = String(statusDesejado || 'enviada').toLowerCase();
        // Forma de pagamento "Outro": lê o texto livre digitado pelo usuário.
        // Antes, esse campo era apenas visual e nunca era persistido — agora
        // é lido, validado e enviado ao banco como forma_pagamento_outro.
        var formaPagamentoOutroVal = (document.getElementById('fOutraFormaPagamento') || {}).value || '';
        formaPagamentoOutroVal = formaPagamentoOutroVal.trim();
        // SANITIZAÇÃO DE SEGURANÇA NO FRONT-END
        if (stNorm === 'aprovada') {
          stNorm = 'enviada';
        }
        if (!nomeCliente) {
          showAlert('Preencha o nome do cliente.', 'error');
          return;
        }
        if (stNorm !== 'rascunho') {
          if (!dataEv) {
            showAlert('Preencha a Data Prevista.', 'error');
            return;
          }
          if (!clienteSelecionado || !clienteSelecionado.id) {
            showAlert('Selecione ou cadastre um cliente para enviar/homologar a proposta.', 'error');
            return;
          }
          if (eventoEnderecoIgualCliente) {
            if (!cepVal) {
              showAlert('Preencha o CEP do local do evento para calcular a logística.', 'error');
              return;
            }
          } else {
            if (!eventoEndereco.cep || String(eventoEndereco.cep).replace(/\D/g, '').length !== 8) {
              showAlert('Preencha o CEP específico do local do evento para calcular a logística.', 'error');
              return;
            }
          }
          if (!window.currentItensPayload || !window.currentItensPayload.filter(function (i) { return i.tipo !== 'transporte'; }).length) {
            showAlert('Selecione ao menos um Pacote ou Serviço do catálogo.', 'error');
            return;
          }
        }
        if (stNorm !== 'rascunho' && formaPagamentoVal === 'outro' && !formaPagamentoOutroVal) {
          showAlert('Descreva a forma de pagamento no campo "Outro".', 'error');
          return;
        }
        // Validação da agenda de pagamento — só exigida ao homologar/enviar,
        // igual às demais regras de obrigatoriedade desta função.
        if (stNorm !== 'rascunho') {
          if (formaPagamentoVal === 'pix' && condicaoPagamentoVal === 'pix_integral' && !pagamentoAgendaState.data_pagamento) {
            showAlert('Preencha a Data do Pagamento (PIX Integral).', 'error');
            return;
          }
          if (formaPagamentoVal === 'pix' && condicaoPagamentoVal === 'pix_50_50' && (!pagamentoAgendaState.data_entrada || !pagamentoAgendaState.data_saldo)) {
            showAlert('Preencha as datas de Entrada e Saldo (PIX 50/50).', 'error');
            return;
          }
          if (formaPagamentoVal === 'cartao' && (!pagamentoAgendaState.parcelas_cartao || !pagamentoAgendaState.data_pagamento)) {
            showAlert('Preencha o nº de parcelas e a data em que o cartão foi passado.', 'error');
            return;
          }
          if (formaPagamentoVal === 'outro' && !String(pagamentoAgendaState.descricao_outro || '').trim()) {
            showAlert('Descreva a negociação (valores e datas) no campo de pagamento "Outro".', 'error');
            return;
          }
        }
        function vazioParaNulo(v) {
          if (v == null) return null;
          var s = String(v).trim();
          return s === '' ? null : s;
        }
        var horarioInicioVal = (document.getElementById('fHorarioInicio') || {}).value || null;
        if (horarioInicioVal) horarioInicioVal = String(horarioInicioVal).slice(0, 5);
        var horarioFinalVal = (document.getElementById('fHorarioFinal') || {}).value || null;
        if (horarioFinalVal) horarioFinalVal = String(horarioFinalVal).slice(0, 5);
        var agendaEnvio = {
          data_pagamento: vazioParaNulo(pagamentoAgendaState.data_pagamento),
          data_entrada: vazioParaNulo(pagamentoAgendaState.data_entrada),
          data_saldo: vazioParaNulo(pagamentoAgendaState.data_saldo),
          parcelas_cartao: pagamentoAgendaState.parcelas_cartao || null,
          descricao_outro: pagamentoAgendaState.descricao_outro || '',
          status: pagamentoAgendaState.status || 'pendente',
          status_entrada: pagamentoAgendaState.status_entrada || 'pendente',
          status_saldo: pagamentoAgendaState.status_saldo || 'pendente'
        };
        var payload = {
          parceiro_id: parceiroAtual.id,
          cliente_id: clienteSelecionado ? clienteSelecionado.id : null,
          cliente_nome: clienteSelecionado ? clienteSelecionado.nome_razao : (nomeCliente || null),
          tipo_evento: evTipoVal,
          data_evento: vazioParaNulo(dataEv),
          horario_inicio: vazioParaNulo(horarioInicioVal),
          horario_final: vazioParaNulo(horarioFinalVal),
          convidados_estimados: evConvidados,
          duracao_horas: horas,
          local_evento: local,
          observacoes: obs,
          itens: window.currentItensPayload,
          valor_subtotal: window.currentSubtotal != null ? window.currentSubtotal : 0,
          desconto_percentual: window.currentDescontoPercentual != null ? window.currentDescontoPercentual : 0,
          desconto_valor: window.currentDescontoValor != null ? window.currentDescontoValor : 0,
          valor_total: Number(window.currentTotal) || 0,
          comissao_pct_efetiva: pct,
          status: stNorm,
          enviada_em: new Date().toISOString(),
          // Pagamento (item 1-6 do escopo de pagamento)
          forma_pagamento: formaPagamentoVal || null,
          forma_pagamento_outro: formaPagamentoVal === 'outro' ? formaPagamentoOutroVal : null,
          condicao_pagamento: condicaoPagamentoVal || null,
          pagamento_agenda: agendaEnvio,
          desconto_pix_aplicado: window.currentDescontoPixAplicado != null ? window.currentDescontoPixAplicado : 0,
          // Persistência de detalhamento para nota fiscal
          cep_cliente: transporteCepValido || cepVal,
          lat_cliente: transporteLatLng ? transporteLatLng.lat : null,
          lng_cliente: transporteLatLng ? transporteLatLng.lng : null,
          distancia_km: transporteDistanciaKm,
          transporte_incluido: transporteAtivo,
          valor_transporte: transporteValor,
          hospedagem_incluida: hospedagemAtivo,
          valor_hospedagem: hospedagemAtivo ? hospedagemValor : 0,
          // Endereço do evento (distinto do cadastro do cliente) — regras 2, 3 e 6.
          evento_endereco_igual_cliente: eventoEnderecoIgualCliente,
          evento_cep: eventoEndereco.cep || null,
          evento_logradouro: eventoEndereco.logradouro || null,
          evento_numero: eventoEndereco.numero || null,
          evento_complemento: eventoEndereco.complemento || null,
          evento_bairro: eventoEndereco.bairro || null,
          evento_cidade: eventoEndereco.cidade || null,
          evento_uf: eventoEndereco.uf || null,
          evento_lat: eventoEndereco.lat != null ? eventoEndereco.lat : null,
          evento_lng: eventoEndereco.lng != null ? eventoEndereco.lng : null
        };
        if (stNorm === 'hold') {
          var exp = new Date();
          exp.setHours(exp.getHours() + 48);
          payload.hold_expira_em = exp.toISOString();
        } else {
          payload.hold_expira_em = null;
        }
        var btn = null;
        if (stNorm === 'rascunho') btn = document.getElementById('btnSalvarRascunho');
        else if (stNorm === 'enviada') btn = document.getElementById('btnFinalizarEnviar');
        else if (stNorm === 'hold') btn = document.getElementById('btnCadastrarHold');
        if (btn) btn.classList.add('btn-loading');
        var query = propostaEdicaoId
          ? sbPartner.from('propostas').update(payload).eq('id', propostaEdicaoId)
          : sbPartner.from('propostas').insert(payload);
        query.select().single().then(async function (res) {
          if (res.error) {
            showAlert('Erro ao salvar proposta: ' + res.error.message, 'error');
            if (btn) btn.classList.remove('btn-loading');
          } else {
            var propostaSalva = res.data;
            if (payload.cliente_id) {
              await atualizarClienteDaProposta(payload.cliente_id, stNorm);
            }
            if (stNorm === 'enviada' || stNorm === 'hold') {
              var comissaoValor = (window.currentTotal * pct) / 100;
              await avisarTelegramProposta({
                event: stNorm === 'hold' ? 'proposta_hold' : 'proposta_enviada',
                proposta_id: propostaSalva ? (propostaSalva.numero || propostaSalva.id) : propostaEdicaoId,
                parceiro_nome: parceiroAtual ? (parceiroAtual.nome || parceiroAtual.empresa) : 'Parceiro',
                cliente_nome: payload.cliente_nome,
                tipo_evento: evTipoVal,
                data_evento: dataEv,
                local_evento: local,
                valor_total: window.currentTotal,
                comissao_valor: comissaoValor,
                hold_expira_em: payload.hold_expira_em
              });
            }
            window.location.href = 'propostas.html';
          }
        });
      }
    })();
