/* Checklist do evento: um único componente, usado no admin (cartão do projeto),
   na tela de projetos, na tela de checklist do colaborador/parceiro. Cliente só visualiza (sem slider) na área do cliente.
   Uso: ChecklistEvento.montar(elemento, { propostaId, sb, modo: 'admin' | 'colaborador' | 'parceiro' | 'cliente', confirmar })
   - admin: tudo, inclusive desfazer etapa concluída e remover instruções
   - colaborador: adiciona, edita hora, reordena, avança etapa (slider). Não desfaz.
   - parceiro: só desliza para concluir + pode escrever observações. Não edita a lista.
   - cliente: somente leitura (sem slider). Confirmação operacional é do fornecedor/parceiro. */
(function () {
  'use strict';

  var CSS = '' +
    '.ce-wrap{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e2e8f0;}' +
    '.ce-sec{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;margin-bottom:14px;}' +
    '.ce-sec strong{display:block;margin-bottom:4px;}' +
    '.ce-hint{font-size:12px;color:#94a3b8;margin-bottom:8px;}' +
    '.ce-row{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);flex-wrap:wrap;}' +
    '.ce-row.feita{opacity:.6;}' +
    '.ce-nome{flex:1;min-width:120px;font-size:14px;}' +
    '.ce-row.feita .ce-nome{text-decoration:line-through;color:#94a3b8;}' +
    '.ce-in{background:#020617;color:#e2e8f0;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px;font:inherit;font-size:13px;}' +
    '.ce-btn{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#e2e8f0;cursor:pointer;font-size:12px;}' +
    '.ce-btn.ok{background:#a3e635;color:#0b1020;border:none;font-weight:800;}' +
    '.ce-btn:disabled{opacity:.4;cursor:default;}' +
    '.ce-tag{font-size:11px;color:#a3e635;font-weight:700;}' +
    '.ce-slider{position:relative;width:100%;height:58px;border-radius:999px;background:rgba(163,230,53,.08);border:1px solid rgba(163,230,53,.35);overflow:hidden;user-select:none;touch-action:none;margin-top:6px;}' +
    '.ce-slider-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(163,230,53,.2);}' +
    '.ce-knob{position:absolute;left:4px;top:4px;width:50px;height:50px;border-radius:50%;background:#a3e635;color:#0b1020;font-size:24px;font-weight:900;display:flex;align-items:center;justify-content:center;cursor:grab;transform:translateX(0);}' +
    '.ce-slider-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#cbd5e1;padding-left:50px;pointer-events:none;}' +
    '.ce-slider.done{border-color:rgba(148,163,184,.4);background:rgba(148,163,184,.1);}' +
    '.ce-slider.done .ce-knob{background:#64748b;cursor:default;}' +
    '.ce-slider.done .ce-slider-txt{color:#94a3b8;}' +
    '.ce-obs{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px;}' +
    '.ce-drag-over{outline:1px dashed #a3e635;}';

  function injetarCss() {
    if (document.getElementById('ce-css')) return;
    var st = document.createElement('style');
    st.id = 'ce-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function E(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function montar(el, opts) {
    injetarCss();
    var modo = opts.modo || 'colaborador';
    var pid = opts.propostaId;
    var sb = opts.sb;
    // admin e colaborador podem editar a estrutura; parceiro e cliente não
    var podeEditar = (modo === 'admin' || modo === 'colaborador');
    var ehAdmin = modo === 'admin';
    var soConcluir = (modo === 'parceiro' || modo === 'cliente');
    el.classList.add('ce-wrap');
    el.innerHTML = '<div class="ce-hint">Carregando checklist…</div>';

    async function carregar() {
      var et = [], cat = [], ob = [];
      var erroEtapas = null;
      if (sb) {
        var rc = await sb.from('evento_etapas_catalogo').select('nome, hora_padrao, ordem').eq('ativo', true).order('ordem');
        cat = rc.data || [];
        var re = await sb.from('evento_etapas')
          .select('id, nome, hora, situacao, ordem, concluida_por, concluida_em')
          .eq('proposta_id', pid)
          .order('ordem');
        if (re.error) {
          erroEtapas = re.error.message || 'Sem permissão para ler etapas';
          console.error('evento_etapas', re.error);
          et = [];
        } else {
          et = re.data || [];
        }
        var ro = await sb.from('evento_observacoes').select('id, texto, criado_por').eq('proposta_id', pid).is('removido_em', null).order('criado_em');
        ob = ro.data || [];
      } else if (opts.dados) {
        et = opts.dados.etapas || [];
        ob = opts.dados.observacoes || [];
      }
      desenhar(cat, et, ob, erroEtapas);
    }

    function desenhar(cat, et, ob, erroEtapas) {
      var marcadas = {};
      et.forEach(function (x) { marcadas[x.nome] = x; });
      var nomes = cat.map(function (c) { return c.nome; });
      et.forEach(function (x) { if (nomes.indexOf(x.nome) < 0) nomes.push(x.nome); });

      var linhas = '';
      if (erroEtapas) {
        linhas = '<div class="ce-hint" style="color:#fca5a5">Não foi possível carregar as etapas: ' + E(erroEtapas) +
          '<br><span style="opacity:.85;font-size:12px">Confirme se você está em Colaboradores do projeto e se a policy de evento_etapas permite SELECT ao colaborador.</span></div>';
      } else if (soConcluir) {
        // parceiro: etapas existentes + slider (cliente NÃO usa mais este modo na área do cliente)
        linhas = et.length
          ? et.map(function (e) { return linhaCliente(e); }).join('')
          : '<div class="ce-hint">Ainda não há etapas neste evento. O administrador precisa montar o checklist no projeto.</div>';
      } else {
        linhas = nomes.map(function (n) {
          var m = marcadas[n];
          var c1 = cat.find(function (c) { return c.nome === n; });
          return linhaEditavel(n, m, c1);
        }).join('') || '<div class="ce-hint">Nenhuma etapa cadastrada.</div>';
      }

      var addHtml = podeEditar
        ? '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
          '<input id="ce-nova" list="ce-cat" placeholder="Buscar ou criar etapa" class="ce-in" style="flex:1;min-width:180px;">' +
          '<datalist id="ce-cat">' + cat.map(function (c) { return '<option value="' + E(c.nome) + '">'; }).join('') + '</datalist>' +
          '<button class="ce-btn ok" id="ce-add">+ Adicionar</button></div>'
        : '';

      var obsHtml = (ob.length ? ob.map(function (o) {
        return '<div class="ce-obs"><span>' + E(o.texto) +
          (o.criado_por === 'cliente' ? ' <em style="color:#a3e635;font-size:11px;">(cliente)</em>' : '') + '</span>' +
          (ehAdmin ? '<button class="ce-btn" data-obs-del="' + E(o.id) + '">✕</button>' : '') + '</div>';
      }).join('') : '<div class="ce-hint">Nenhuma instrução ainda.</div>');
      // admin, colaborador e parceiro podem escrever observações; cliente não (usa outra tela)
      if (modo !== 'cliente') {
        obsHtml += '<div style="display:flex;gap:8px;margin-top:10px;"><input id="ce-obs-nova" maxlength="400" placeholder="' +
          (modo === 'parceiro' ? 'Ex.: Cheguei na portaria…' : 'Nova instrução') +
          '" class="ce-in" style="flex:1;">' +
          '<button class="ce-btn ok" id="ce-obs-add">+</button></div>';
      }

      var hintLista = soConcluir
        ? (modo === 'parceiro'
            ? 'Deslize para concluir cada etapa. Você pode deixar observações abaixo.'
            : 'Deslize para confirmar cada etapa. Depois de confirmada, não tem como desfazer.')
        : 'Marque as etapas, ajuste a hora e arraste para reordenar. Deslize para concluir. Concluir não se desfaz (só o admin desfaz).';

      el.innerHTML =
        '<div class="ce-sec"><strong>Checklist do evento</strong>' +
        '<div class="ce-hint">' + hintLista + '</div>' +
        '<div id="ce-lista">' + linhas + '</div>' + addHtml + '</div>' +
        (modo === 'cliente' ? '' :
        '<div class="ce-sec"><strong>Instruções / Observações</strong>' +
        '<div class="ce-hint">' + (modo === 'parceiro' ? 'Deixe um registro (ex.: “cheguei na portaria”).' : 'O cliente também escreve aqui.') + '</div>' +
        '<div id="ce-obs">' + obsHtml + '</div></div>');

      ligarEventos(cat, et);
    }

    function linhaCliente(e) {
      var feita = e.situacao === 'concluida';
      return '<div class="ce-row ' + (feita ? 'feita' : '') + '"><div class="ce-nome">' + E(e.nome) +
        ' <span class="ce-hint" style="display:inline">' + E(e.hora || '') + '</span></div>' +
        (feita
          ? '<span class="ce-tag">✓ confirmada</span>'
          : '<div style="width:100%;"><div class="ce-slider" data-slide="' + E(e.id) + '"><div class="ce-slider-fill"></div>' +
            '<div class="ce-knob">›</div><span class="ce-slider-txt">Deslize para confirmar →</span></div></div>') +
        '</div>';
    }

    function linhaEditavel(nome, m, c1) {
      var hora = (m && m.hora) || (c1 && c1.hora_padrao) || '';
      var feita = m && m.situacao === 'concluida';
      var incluida = !!m;
      var sliderHtml = (incluida && !feita)
        ? '<div style="width:100%;"><div class="ce-slider" data-slide="' + E(m.id) + '"><div class="ce-slider-fill"></div>' +
          '<div class="ce-knob">›</div><span class="ce-slider-txt">Deslize para concluir →</span></div></div>'
        : '';
      var acaoConcluida = (feita)
        ? '<span class="ce-tag">✓ concluída' + (m.concluida_por ? ' · ' + E(m.concluida_por) : '') + '</span>' +
          (ehAdmin ? ' <button class="ce-btn" data-desfazer="' + E(m.id) + '">Desfazer</button>' : '')
        : '';
      var setas = incluida && !feita
        ? '<button class="ce-btn" data-up="' + E(m.id) + '" title="Subir">↑</button>' +
          '<button class="ce-btn" data-down="' + E(m.id) + '" title="Descer">↓</button>'
        : '';
      return '<div class="ce-row ' + (feita ? 'feita' : '') + '" ' + (incluida && !feita ? 'draggable="true" data-drag="' + E(m.id) + '"' : '') + '>' +
        '<input type="checkbox" data-nome="' + E(nome) + '" ' + (incluida ? 'checked' : '') + ' ' + (feita || !podeEditar ? 'disabled' : '') + '>' +
        '<span class="ce-nome">' + E(nome) + '</span>' +
        '<input type="time" class="ce-in" data-hora="' + E(nome) + '" value="' + E(hora) + '" ' + (incluida && !feita ? '' : 'disabled') + '>' +
        setas + acaoConcluida + '<div style="width:100%;">' + sliderHtml + '</div></div>';
    }

    function ligarEventos(cat, et) {
      // Slider: arrastar da esquerda para a direita, concluir ao passar de 90%
      el.querySelectorAll('[data-slide]').forEach(function (s) {
        var knob = s.querySelector('.ce-knob');
        var fill = s.querySelector('.ce-slider-fill');
        var arrastando = false, x0 = 0, max = 0, pos = 0;
        function mover(p) {
          pos = Math.max(0, Math.min(p, max));
          knob.style.transform = 'translateX(' + pos + 'px)';
          fill.style.width = (pos + knob.offsetWidth) + 'px';
        }
        knob.addEventListener('pointerdown', function (ev) {
          arrastando = true;
          max = s.clientWidth - knob.offsetWidth - 8;
          x0 = ev.clientX - pos;
          knob.setPointerCapture(ev.pointerId);
        });
        knob.addEventListener('pointermove', function (ev) { if (arrastando) mover(ev.clientX - x0); });
        knob.addEventListener('pointerup', async function () {
          if (!arrastando) return;
          arrastando = false;
          if (pos >= max * 0.9) {
            mover(max);
            s.classList.add('done');
            await concluir(s.getAttribute('data-slide'));
          } else {
            mover(0);
          }
        });
      });

      // Checkbox: incluir ou tirar etapa (só pendentes podem sair)
      el.querySelectorAll('input[type=checkbox][data-nome]').forEach(function (cb) {
        cb.addEventListener('change', async function () {
          var nome = cb.getAttribute('data-nome');
          if (cb.checked) {
            var c1 = cat.find(function (c) { return c.nome === nome; });
            var ordem = c1 ? c1.ordem : (maiorOrdem(et) + 10);
            await sb.from('evento_etapas').insert({ proposta_id: pid, nome: nome, hora: c1 ? c1.hora_padrao : null, ordem: ordem, origem: c1 ? 'catalogo' : 'avulsa' });
          } else {
            await sb.from('evento_etapas').delete().eq('proposta_id', pid).eq('nome', nome).eq('situacao', 'pendente');
          }
          carregar();
        });
      });

      // Hora
      el.querySelectorAll('input[type=time][data-hora]').forEach(function (inp) {
        inp.addEventListener('change', async function () {
          await sb.from('evento_etapas').update({ hora: inp.value || null }).eq('proposta_id', pid).eq('nome', inp.getAttribute('data-hora')).eq('situacao', 'pendente');
        });
      });

      // Subir / descer: troca de ordem entre duas etapas pendentes
      el.querySelectorAll('[data-up],[data-down]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-up') || b.getAttribute('data-down');
          trocar(id, b.hasAttribute('data-up') ? -1 : 1, et);
        });
      });

      // Arrastar para reordenar
      var origem = null;
      el.querySelectorAll('[data-drag]').forEach(function (row) {
        row.addEventListener('dragstart', function () { origem = row.getAttribute('data-drag'); });
        row.addEventListener('dragover', function (ev) { ev.preventDefault(); row.classList.add('ce-drag-over'); });
        row.addEventListener('dragleave', function () { row.classList.remove('ce-drag-over'); });
        row.addEventListener('drop', function (ev) {
          ev.preventDefault();
          row.classList.remove('ce-drag-over');
          var destino = row.getAttribute('data-drag');
          if (origem && destino && origem !== destino) trocarIds(origem, destino, et);
          origem = null;
        });
      });

      // Desfazer (admin)
      el.querySelectorAll('[data-desfazer]').forEach(function (b) {
        b.addEventListener('click', async function () {
          await sb.from('evento_etapas').update({ situacao: 'pendente', concluida_por: null, concluida_em: null }).eq('id', b.getAttribute('data-desfazer'));
          carregar();
        });
      });

      // Adicionar etapa
      var add = document.getElementById('ce-add');
      if (add) add.addEventListener('click', async function () {
        var nome = (document.getElementById('ce-nova').value || '').trim();
        if (!nome) return;
        var c1 = cat.find(function (c) { return c.nome === nome; });
        if (et.some(function (x) { return x.nome === nome; })) { document.getElementById('ce-nova').value = ''; return; }
        await sb.from('evento_etapas').insert({ proposta_id: pid, nome: nome, hora: c1 ? c1.hora_padrao : null, ordem: c1 ? c1.ordem : (maiorOrdem(et) + 10), origem: c1 ? 'catalogo' : 'avulsa' });
        carregar();
      });

      // Instruções
      var oa = document.getElementById('ce-obs-add');
      if (oa) oa.addEventListener('click', async function () {
        var t = (document.getElementById('ce-obs-nova').value || '').trim();
        if (!t) return;
        await sb.from('evento_observacoes').insert({
          proposta_id: pid,
          texto: t,
          criado_por: ehAdmin ? 'admin' : (modo === 'parceiro' ? 'parceiro' : 'equipe')
        });
        carregar();
      });
      el.querySelectorAll('[data-obs-del]').forEach(function (b) {
        b.addEventListener('click', async function () {
          await sb.from('evento_observacoes').update({ removido_em: new Date().toISOString() }).eq('id', b.getAttribute('data-obs-del'));
          carregar();
        });
      });
    }

    async function concluir(etapaId) {
      if (modo === 'cliente') {
        if (opts.confirmar) await opts.confirmar(etapaId);
        return;
      }
      var et = await sb.from('evento_etapas').select('nome').eq('id', etapaId).maybeSingle();
      var nome = et.data ? et.data.nome : '';
      var up = await sb.from('evento_etapas')
        .update({ situacao: 'concluida', concluida_por: opts.nomeUsuario || (ehAdmin ? 'admin' : 'colaborador'), concluida_em: new Date().toISOString() })
        .eq('id', etapaId).eq('situacao', 'pendente');
      if (up.error) { alert(up.error.message); return carregar(); }
      try {
        await fetch('https://www.432up.com/avisos-telegram', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'etapa_concluida', proposta_id: pid, etapa: nome, mensagem: 'Etapa concluída: ' + nome })
        });
      } catch (e) {}
      try {
        await sb.functions.invoke('notificar-cliente-etapa', { body: { proposta_id: pid, etapa: nome } });
      } catch (e) {}
      carregar();
    }

    async function trocar(id, delta, et) {
      var idx = et.findIndex(function (x) { return x.id === id; });
      var alvo = et[idx + delta];
      if (!alvo || et[idx].situacao !== 'pendente' || alvo.situacao !== 'pendente') return;
      await trocarIds(id, alvo.id, et);
    }

    async function trocarIds(a, b, et) {
      var ea = et.find(function (x) { return x.id === a; });
      var eb = et.find(function (x) { return x.id === b; });
      if (!ea || !eb || ea.situacao !== 'pendente' || eb.situacao !== 'pendente') return;
      await sb.from('evento_etapas').update({ ordem: eb.ordem }).eq('id', a);
      await sb.from('evento_etapas').update({ ordem: ea.ordem }).eq('id', b);
      carregar();
    }

    function maiorOrdem(et) {
      return et.reduce(function (m, x) { return Math.max(m, Number(x.ordem) || 0); }, 0);
    }

    carregar();
    return { recarregar: carregar };
  }

  window.ChecklistEvento = { montar: montar };
})();
