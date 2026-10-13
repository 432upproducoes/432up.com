/*
 * cadastro-cliente.js — 432UP Partner
 * Depende de: partner-config.js (sbPartner, partnerRequireAuth, partnerFillSidebar, partnerLogout)
 * Requer no banco (ver SQL enviado): co_clientes.responsavel_legal_cargo e contato_eh_responsavel
 */
(function () {
  'use strict';

  var parceiroAtual = null;
  var MODO_MODAL = new URLSearchParams(window.location.search).get('modo') === 'modal';
  var COLS_RETORNO = 'id, nome_razao, nome_fantasia, cidade, bairro, cep, cpf_cnpj, telefone, responsavel_legal, responsavel_legal_cargo, contato_nome, contato_cargo, contato_eh_responsavel';
  var mcClienteEditandoId = null;
  var ultimoCepConsultadoModal = null;

  var TIPOS_DATA = [];
  var OPCOES_TIPO_CLIENTE = [];
  var OPCOES_ORIGEM_CLIENTE = [];
  var RECORRENCIAS = ['nenhuma', 'anual', 'mensal'];
  var opcoesCarregadasPromise = null;

  var UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  /* ================= UTILITÁRIOS ================= */

  function $(id) { return document.getElementById(id); }

  function ordenarOpcoesNome(lista) {
    var arr = (lista || []).slice();
    arr.sort(function (a, b) {
      var an = String(a || ''), bn = String(b || '');
      var aOutro = an === 'Outro' ? 1 : 0, bOutro = bn === 'Outro' ? 1 : 0;
      if (aOutro !== bOutro) return aOutro - bOutro;
      return an.localeCompare(bn, 'pt-BR', { sensitivity: 'base' });
    });
    return arr;
  }

  function preencherSelectOpcoes(selectEl, nomes, opts) {
    if (!selectEl) return;
    opts = opts || {};
    var valorAtual = opts.valorSalvo != null ? String(opts.valorSalvo) : '';
    var incluirVazio = opts.incluirVazio !== false;
    var html = incluirVazio ? '<option value="">Selecionar</option>' : '';
    var vistos = {};
    var lista = ordenarOpcoesNome(nomes || []);
    for (var i = 0; i < lista.length; i++) {
      var nome = String(lista[i] || '');
      if (!nome || vistos[nome]) continue;
      vistos[nome] = true;
      html += '<option value="' + nome.replace(/"/g, '&quot;') + '">' + nome + '</option>';
    }
    if (valorAtual && !vistos[valorAtual]) {
      html += '<option value="' + valorAtual.replace(/"/g, '&quot;') + '">' + valorAtual + ' (inativo)</option>';
    }
    selectEl.innerHTML = html;
    if (valorAtual) selectEl.value = valorAtual;
    else if (incluirVazio) selectEl.value = '';
  }

  function showAlert(msg, type) {
    var el = $('formAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = 'p-3 rounded-xl text-xs font-semibold show ' +
      (type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function mcShowAlert(msg) {
    var el = $('mcAlert');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function normalizarNumeros(str) { return str ? String(str).replace(/\D/g, '') : ''; }

  function aplicarMascaraCep(valor) {
    var v = String(valor || '').replace(/\D/g, '').substring(0, 8);
    if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
    return v;
  }

  function optionsHtml(lista, selecionado) {
    var html = '';
    for (var i = 0; i < lista.length; i++) {
      var val = lista[i];
      html += '<option value="' + val + '"' + (val === selecionado ? ' selected' : '') + '>' + val + '</option>';
    }
    return html;
  }

  function semAcento(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /* ================= OPÇÕES DO BANCO ================= */

  async function carregarOpcoesClientes() {
    if (opcoesCarregadasPromise) return opcoesCarregadasPromise;
    opcoesCarregadasPromise = (async function () {
      try {
        var res = await sbPartner
          .from('co_clientes_opcoes')
          .select('categoria, nome, ativo')
          .eq('ativo', true)
          .in('categoria', ['origem_cliente', 'tipo_cliente', 'tipo_data_importante']);
        if (res.error) { console.error('[432UP Partner] Erro ao carregar co_clientes_opcoes:', res.error); return; }

        var tipo = [], origem = [], dataTipo = [];
        (res.data || []).forEach(function (row) {
          var nome = row.nome != null ? String(row.nome).trim() : '';
          if (!nome) return;
          if (row.categoria === 'tipo_cliente') tipo.push(nome);
          else if (row.categoria === 'origem_cliente') origem.push(nome);
          else if (row.categoria === 'tipo_data_importante') dataTipo.push(nome);
        });

        OPCOES_TIPO_CLIENTE = ordenarOpcoesNome(tipo);
        OPCOES_ORIGEM_CLIENTE = ordenarOpcoesNome(origem);
        TIPOS_DATA = ordenarOpcoesNome(dataTipo);

        preencherSelectOpcoes($('mcTipoCliente'), OPCOES_TIPO_CLIENTE, { incluirVazio: true });
        preencherSelectOpcoes($('mcOrigemCliente'), OPCOES_ORIGEM_CLIENTE, { incluirVazio: true });
      } catch (e) {
        console.error('[432UP Partner] Exceção ao carregar co_clientes_opcoes:', e);
      }
    })();
    return opcoesCarregadasPromise;
  }

  /* ================= DATAS IMPORTANTES ================= */

  function adicionarLinhaData(item) {
    item = item || {};
    var wrap = $('mcDatasImportantesList');
    if (!wrap) return;
    var row = document.createElement('div');
    row.className = 'mc-data-row space-y-2';
    row.innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' +
        '<div>' +
          '<label class="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Tipo da data</label>' +
          '<select class="mc-data-tipo w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"></select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Data</label>' +
          '<input type="text" class="mc-data-data w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none" placeholder="15/12 ou 15-12 ou 2026-12-15" value="' + String(item.data || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' +
        '<div>' +
          '<label class="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Descrição</label>' +
          '<input type="text" class="mc-data-desc w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none" placeholder="Festa anual da empresa" value="' + String(item.descricao || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<div class="flex items-end gap-2">' +
          '<div class="flex-1">' +
            '<label class="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Recorrência</label>' +
            '<select class="mc-data-recorrencia w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none">' +
              optionsHtml(RECORRENCIAS, item.recorrencia || 'anual') +
            '</select>' +
          '</div>' +
          '<button type="button" class="mc-data-remove px-2.5 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 text-sm font-bold cursor-pointer transition">−</button>' +
        '</div>' +
      '</div>';
    row.querySelector('.mc-data-remove').addEventListener('click', function () { row.remove(); });
    preencherSelectOpcoes(row.querySelector('.mc-data-tipo'), TIPOS_DATA, { incluirVazio: true, valorSalvo: item.tipo || '' });
    wrap.appendChild(row);
  }

  function limparDatasImportantes() {
    var wrap = $('mcDatasImportantesList');
    if (wrap) wrap.innerHTML = '';
  }

  function carregarDatasImportantes(lista) {
    limparDatasImportantes();
    var arr = [];
    if (Array.isArray(lista)) arr = lista;
    else if (typeof lista === 'string') { try { arr = JSON.parse(lista); } catch (e) { arr = []; } }
    (arr || []).forEach(function (item) { adicionarLinhaData(item || {}); });
  }

  function coletarDatasImportantes() {
    var wrap = $('mcDatasImportantesList');
    if (!wrap) return [];
    var out = [];
    wrap.querySelectorAll('.mc-data-row').forEach(function (row) {
      var tipo = (row.querySelector('.mc-data-tipo') || {}).value || '';
      var data = ((row.querySelector('.mc-data-data') || {}).value || '').trim();
      var desc = ((row.querySelector('.mc-data-desc') || {}).value || '').trim();
      var rec = (row.querySelector('.mc-data-recorrencia') || {}).value || '';
      if (!tipo && !data && !desc) return;
      out.push({ tipo: tipo || null, data: data || null, descricao: desc || null, recorrencia: rec || null });
    });
    return out;
  }

  function resetCamposComerciaisNovos() {
    if ($('mcTipoCliente')) $('mcTipoCliente').value = '';
    if ($('mcOrigemCliente')) $('mcOrigemCliente').value = '';
    if ($('mcOrigemDetalhe')) $('mcOrigemDetalhe').value = '';
    if ($('mcStatusComercial')) $('mcStatusComercial').value = 'Novo';
    limparDatasImportantes();
  }

  /* ================= CEP ================= */

  async function buscarEnderecoPorCEP(cep) {
    var cepLimpo = String(cep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) return null;
    try {
      var resp = await fetch('https://viacep.com.br/ws/' + cepLimpo + '/json/');
      if (!resp.ok) return null;
      var data = await resp.json();
      if (!data || data.erro) return null;
      return { logradouro: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', uf: data.uf || '' };
    } catch (e) {
      console.error('[432UP Partner] Erro ao buscar CEP:', e);
      return null;
    }
  }

  function onMcCepInput(e) {
    e.target.value = aplicarMascaraCep(e.target.value);
    var cepLimpo = e.target.value.replace(/\D/g, '');
    var statusEl = $('mcCepStatus');
    if (cepLimpo.length < 8) {
      ultimoCepConsultadoModal = null;
      if (statusEl) { statusEl.textContent = ''; statusEl.className = 'mt-1 text-[11px]'; }
      return;
    }
    if (cepLimpo === ultimoCepConsultadoModal) return;
    ultimoCepConsultadoModal = cepLimpo;
    if (statusEl) { statusEl.textContent = 'Buscando endereço...'; statusEl.className = 'mt-1 text-[11px] text-cyan-400'; }

    buscarEnderecoPorCEP(cepLimpo).then(function (end) {
      if (!end) {
        if (statusEl) { statusEl.textContent = 'CEP não encontrado.'; statusEl.className = 'mt-1 text-[11px] text-red-400'; }
        return;
      }
      if (end.logradouro) $('mcLogradouro').value = end.logradouro;
      if (end.bairro) $('mcBairro').value = end.bairro;
      if (end.cidade) $('mcCidade').value = end.cidade;
      if (end.uf) $('mcUf').value = end.uf;
      if (statusEl) { statusEl.textContent = 'Endereço preenchido automaticamente.'; statusEl.className = 'mt-1 text-[11px] text-emerald-400'; }
    });
  }

  /* ================= PF / PJ ================= */

  function setMcTipo(tipo) {
    $('mcTipoPessoa').value = tipo;
    $('mcBtnPF').classList.toggle('active', tipo === 'PF');
    $('mcBtnPJ').classList.toggle('active', tipo === 'PJ');
    $('mcBlocoPJ').classList.toggle('hidden', tipo !== 'PJ');
    $('mcLabelNome').textContent = tipo === 'PJ' ? 'Razão Social *' : 'Nome Completo *';
    $('mcLabelDoc').textContent = tipo === 'PJ' ? 'CNPJ (Opcional)' : 'CPF (Opcional)';
    atualizarBlocoResponsavel();
  }

  // Caixa "O contato é o responsável legal": marcada = usa o contato; desmarcada = abre os campos do responsável
  function atualizarBlocoResponsavel() {
    var marcada = $('mcContatoEhResp').checked;
    $('mcBlocoResponsavel').classList.toggle('hidden', marcada);
    if (marcada) {
      $('mcRespNome').value = '';
      $('mcRespCargo').value = '';
    }
  }

  function formatarDocumento(valor) {
    var value = String(valor || '').replace(/\D/g, '');
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

  function handleMcDocTyping(e) {
    e.target.value = formatarDocumento(e.target.value);
    var digitos = e.target.value.replace(/\D/g, '');
    var tipoAtual = $('mcTipoPessoa').value;
    var tipoDetectado = digitos.length > 11 ? 'PJ' : 'PF';
    if (digitos.length > 0 && tipoDetectado !== tipoAtual) setMcTipo(tipoDetectado);
  }

  /* ================= LEITOR DO WHATSAPP ================= */

  function mcSetWhatsappStatus(msg, tipo) {
    var el = $('mcWhatsappStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'text-[11px] flex-1 min-w-0 ' + (tipo === 'ok' ? 'text-emerald-400' : tipo === 'err' ? 'text-red-400' : 'text-slate-400');
  }

  function limpa(v) {
    return String(v || '').replace(/\s{2,}/g, ' ').replace(/^[\s:.\-–—*•]+/, '').replace(/[\s;]+$/, '').trim();
  }

  function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

  function interpretarTextoWhatsapp(textoBruto) {
    var original = String(textoBruto || '').replace(/\u00a0/g, ' ');
    if (!original.trim()) return null;

    var resultado = {
      nome_razao: null, nome_fantasia: null, telefone: null, cpf_cnpj: null,
      email: null, responsavel_legal: null, responsavel_legal_cargo: null,
      contato_nome: null, contato_cargo: null, cep: null, logradouro: null,
      numero: null, complemento: null, bairro: null, cidade: null, uf: null,
      tipo_pessoa: null, observacoes: null
    };

    var porRotulo = {};

    // Rótulos (sem acento). A ordem importa: o primeiro que casar vence.
    var ROTULOS = [
      { campo: 'razao',       re: /^(razao social|razao|empresa|nome da empresa|nome empresa)$/ },
      { campo: 'fantasia',    re: /^(nome fantasia|fantasia|nome comercial)$/ },
      { campo: 'responsavel', re: /^(responsavel legal|responsavel|representante legal|representante|resp legal|resp\. legal)$/ },
      { campo: 'cargo',       re: /^(cargo|funcao|função|cargo do responsavel|cargo do contato)$/ },
      { campo: 'contato',     re: /^(contato|nome do contato|secretaria|contato comercial)$/ },
      { campo: 'nome',        re: /^(nome|nome completo|nome do cliente|cliente)$/ },
      { campo: 'doc',         re: /^(cnpj|cpf|cpf\/cnpj|cpf ou cnpj|documento|doc)$/ },
      { campo: 'telefone',    re: /^(telefone|tel|telefone\/whatsapp|whatsapp|whats|celular|cel|fone)$/ },
      { campo: 'email',       re: /^(e-?mail|e mail)$/ },
      { campo: 'cep',         re: /^cep$/ },
      { campo: 'logradouro',  re: /^(logradouro|endereco|endereco completo|rua|avenida|av)$/ },
      { campo: 'numero',      re: /^(numero|num|n|n°|nº)$/ },
      { campo: 'complemento', re: /^(complemento|compl|apto|apartamento|sala|bloco)$/ },
      { campo: 'bairro',      re: /^bairro$/ },
      { campo: 'cidade',      re: /^(cidade|municipio)$/ },
      { campo: 'uf',          re: /^(uf|estado)$/ },
      { campo: 'obs',         re: /^(observacoes|observacao|obs)$/ }
    ];

    var linhas = original.split(/\r?\n/).map(function (l) {
      return l.replace(/^\s*[-•*▪>]+\s*/, '').trim();
    }).filter(Boolean);

    var linhasSemRotulo = [];

    // 1) "Rótulo: valor" ou "Rótulo - valor"
    linhas.forEach(function (linha) {
      var m = linha.match(/^([^:\-–—]{1,40}?)\s*[:\-–—]\s*(.+)$/);
      if (m) {
        var rot = semAcento(m[1]);
        var val = limpa(m[2]);
        for (var i = 0; i < ROTULOS.length; i++) {
          if (ROTULOS[i].re.test(rot)) {
            if (val && porRotulo[ROTULOS[i].campo] === undefined) porRotulo[ROTULOS[i].campo] = val;
            return;
          }
        }
      }
      linhasSemRotulo.push(linha);
    });

    // 2) Documento (CNPJ/CPF)
    var docTexto = porRotulo.doc || null;
    if (!docTexto) {
      var mDoc = original.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) || original.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
      if (mDoc) docTexto = mDoc[0];
    }
    var docDigitos = docTexto ? soDigitos(docTexto) : '';
    if (docDigitos.length === 14 || docDigitos.length === 11) resultado.cpf_cnpj = docDigitos;
    else docDigitos = '';

    // 3) E-mail
    var mEmail = (porRotulo.email || original).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (mEmail) resultado.email = mEmail[0];

    // 4) Telefone (rótulo primeiro; senão procura no texto sem o documento)
    var telBruto = porRotulo.telefone || null;
    if (!telBruto) {
      var semDoc = docTexto ? original.split(docTexto).join(' ') : original;
      var mTel = semDoc.match(/(?:\+?55[\s-]*)?\(?\d{2}\)?[\s-]*9?\d{4}[\s-]?\d{4}/);
      if (mTel) telBruto = mTel[0];
    }
    if (telBruto) {
      var td = soDigitos(telBruto);
      if (td.indexOf('55') === 0 && (td.length === 12 || td.length === 13)) td = td.slice(2);
      if (td.length === 10 || td.length === 11) {
        resultado.telefone = td.length === 11
          ? '(' + td.slice(0, 2) + ') ' + td.slice(2, 7) + '-' + td.slice(7)
          : '(' + td.slice(0, 2) + ') ' + td.slice(2, 6) + '-' + td.slice(6);
      }
    }

    // 5) CEP
    var cepTexto = porRotulo.cep || null;
    if (!cepTexto) {
      var mCep = original.match(/\b\d{5}-?\d{3}\b/);
      if (mCep) cepTexto = mCep[0];
    }
    if (cepTexto && soDigitos(cepTexto).length === 8) resultado.cep = soDigitos(cepTexto);

    // 6) Nome: empresa (CNPJ, razão social ou fantasia) x pessoa física
    var razao = porRotulo.razao || null;
    var fantasia = porRotulo.fantasia || null;
    var nomeGeral = porRotulo.nome || null;
    var ehPJ = docDigitos.length === 14 || !!razao || !!fantasia;

    if (ehPJ) {
      resultado.tipo_pessoa = 'PJ';
      resultado.nome_razao = razao || nomeGeral || null;
      resultado.nome_fantasia = fantasia || null;
      // Em empresa, "Contato" é a pessoa com quem se fala (ex.: secretária)
      resultado.contato_nome = porRotulo.contato || (razao ? nomeGeral : null) || null;
      resultado.contato_cargo = porRotulo.cargo || null;
    } else {
      resultado.tipo_pessoa = docDigitos.length === 11 ? 'PF' : null;
      resultado.nome_razao = nomeGeral || porRotulo.contato || null;
    }

    if (!resultado.nome_razao) {
      for (var k = 0; k < linhasSemRotulo.length; k++) {
        var L = linhasSemRotulo[k];
        if (/@/.test(L) || /\d/.test(L) || L.length < 4) continue;
        if (/^(rua|r\.|av\.?|avenida|alameda|travessa|estrada|rodovia|pra[cç]a|bairro|cidade|cep|uf)\b/i.test(semAcento(L))) continue;
        resultado.nome_razao = limpa(L);
        break;
      }
    }

    // 7) Responsável legal (e cargo, se vier como "Nome - Cargo" ou "Nome (Cargo)")
    if (porRotulo.responsavel) {
      var rv = porRotulo.responsavel;
      var mRc = rv.match(/^(.+?)\s*(?:[-–—]|\()\s*([^)]+?)\)?$/);
      if (mRc) {
        resultado.responsavel_legal = limpa(mRc[1]);
        resultado.responsavel_legal_cargo = limpa(mRc[2]);
      } else {
        resultado.responsavel_legal = limpa(rv);
      }
    }
    if (porRotulo.cargo && !resultado.responsavel_legal_cargo && !ehPJ) { /* cargo solto não se aplica a PF */ }

    // 8) Endereço
    var logr = porRotulo.logradouro || null;
    if (!logr) {
      for (var j = 0; j < linhasSemRotulo.length; j++) {
        if (/^(rua|r\.|av\.?|avenida|alameda|travessa|estrada|rodovia|pra[cç]a)\b/i.test(semAcento(linhasSemRotulo[j]))) {
          logr = linhasSemRotulo[j];
          break;
        }
      }
    }
    if (logr) {
      var mNum = logr.match(/^(.*?)[,\s]+(\d{1,6})\s*[A-Za-z]?\s*(.*)$/);
      if (mNum && !porRotulo.numero) {
        resultado.logradouro = limpa(mNum[1]);
        resultado.numero = mNum[2];
        if (mNum[3]) resultado.complemento = limpa(mNum[3]);
      } else {
        resultado.logradouro = limpa(logr);
      }
    }
    if (porRotulo.numero) resultado.numero = porRotulo.numero;
    if (porRotulo.complemento) resultado.complemento = porRotulo.complemento;
    if (porRotulo.bairro) resultado.bairro = porRotulo.bairro;
    if (porRotulo.cidade) resultado.cidade = porRotulo.cidade;
    if (porRotulo.uf) {
      var ufL = porRotulo.uf.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
      if (UFS.indexOf(ufL) >= 0) resultado.uf = ufL;
    }
    if (!resultado.cidade || !resultado.uf) {
      var mCidUf = original.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .']{2,}?)\s*[\/\-–]\s*([A-Za-z]{2})\b/);
      if (mCidUf) {
        var ufC = mCidUf[2].toUpperCase();
        if (UFS.indexOf(ufC) >= 0) {
          if (!resultado.cidade) resultado.cidade = limpa(mCidUf[1]);
          if (!resultado.uf) resultado.uf = ufC;
        }
      }
    }
    if (!resultado.uf) {
      var mUf = original.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
      if (mUf) resultado.uf = mUf[1];
    }

    if (porRotulo.obs) resultado.observacoes = porRotulo.obs;

    if (!resultado.tipo_pessoa) {
      if (docDigitos.length === 14) resultado.tipo_pessoa = 'PJ';
      else if (docDigitos.length === 11) resultado.tipo_pessoa = 'PF';
    }

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
    if (dados.tipo_pessoa === 'PJ' || dados.tipo_pessoa === 'PF') setMcTipo(dados.tipo_pessoa);

    function setIf(id, val, fmt) {
      if (val == null || String(val).trim() === '') return;
      var el = $(id);
      if (!el) return;
      el.value = fmt ? fmt(val) : String(val).trim();
      n++;
    }

    setIf('mcNomeRazao', dados.nome_razao);
    setIf('mcNomeFantasia', dados.nome_fantasia);
    setIf('mcContatoNome', dados.contato_nome);
    setIf('mcContatoCargo', dados.contato_cargo);
    setIf('mcRespNome', dados.responsavel_legal);
    setIf('mcRespCargo', dados.responsavel_legal_cargo);
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
      var docEl = $('mcDocNumero');
      if (docEl) { docEl.value = formatarDocumento(dados.cpf_cnpj); n++; }
    }
    if (dados.cep) {
      var cepEl = $('mcCep');
      if (cepEl) { cepEl.value = aplicarMascaraCep(dados.cep); onMcCepInput({ target: cepEl }); n++; }
    }
    // Se veio responsável legal diferente do contato, desmarca a caixa para o campo aparecer
    if (dados.responsavel_legal && dados.responsavel_legal !== dados.contato_nome) {
      $('mcContatoEhResp').checked = false;
    }
    atualizarBlocoResponsavel();
    return n;
  }

  function onInterpretarWhatsapp() {
    var texto = $('mcWhatsappPaste').value;
    if (!String(texto || '').trim()) { mcSetWhatsappStatus('Cole o texto do WhatsApp antes de interpretar.', 'err'); return; }
    var dados = interpretarTextoWhatsapp(texto);
    if (!dados || !dados._preenchidos) {
      mcSetWhatsappStatus('Não foi possível extrair dados úteis. Tente colar de novo ou preencha manualmente.', 'err');
      return;
    }
    var qtd = aplicarDadosWhatsappNoForm(dados);
    if (qtd > 0) mcSetWhatsappStatus('✓ ' + qtd + ' campo(s) preenchido(s). Confira e ajuste se necessário.', 'ok');
    else mcSetWhatsappStatus('Texto interpretado, mas nenhum campo pôde ser aplicado. Preencha manualmente.', 'err');
  }

  function onLimparWhatsappPaste() {
    $('mcWhatsappPaste').value = '';
    mcSetWhatsappStatus('', '');
  }

  /* ================= EDIÇÃO ================= */

  async function carregarClienteParaEdicao(clienteId) {
    try {
      await carregarOpcoesClientes();
      var res = await sbPartner
        .from('co_clientes')
        .select('id, tipo_pessoa, nome_razao, telefone, cpf_cnpj, email, nome_fantasia, contato_nome, contato_cargo, contato_eh_responsavel, responsavel_legal, responsavel_legal_cargo, cep, logradouro, numero, complemento, bairro, cidade, uf, observacoes_comerciais, tipo_cliente, origem_cliente, origem_detalhe, status_comercial, datas_importantes')
        .eq('id', clienteId)
        .maybeSingle();

      if (res.error || !res.data) {
        console.error('[432UP Partner] Falha ao carregar cliente:', res.error);
        showAlert('Não foi possível carregar os dados deste cliente para edição.', 'error');
        return;
      }

      var c = res.data;
      mcClienteEditandoId = c.id;

      setMcTipo(c.tipo_pessoa === 'PJ' ? 'PJ' : 'PF');
      $('mcNomeRazao').value = c.nome_razao || '';
      $('mcTelefone').value = c.telefone || '';
      $('mcDocNumero').value = c.cpf_cnpj ? formatarDocumento(c.cpf_cnpj) : '';
      $('mcEmail').value = c.email || '';
      $('mcNomeFantasia').value = c.nome_fantasia || '';
      $('mcContatoNome').value = c.contato_nome || '';
      $('mcContatoCargo').value = c.contato_cargo || '';
      $('mcContatoEhResp').checked = c.contato_eh_responsavel === true;
      $('mcRespNome').value = c.responsavel_legal || '';
      $('mcRespCargo').value = c.responsavel_legal_cargo || '';
      atualizarBlocoResponsavel();
      $('mcCep').value = c.cep ? aplicarMascaraCep(c.cep) : '';
      $('mcLogradouro').value = c.logradouro || '';
      $('mcNumero').value = c.numero || '';
      $('mcComplemento').value = c.complemento || '';
      $('mcBairro').value = c.bairro || '';
      $('mcCidade').value = c.cidade || '';
      $('mcUf').value = c.uf || '';
      $('mcObs').value = c.observacoes_comerciais || '';

      preencherSelectOpcoes($('mcTipoCliente'), OPCOES_TIPO_CLIENTE, { incluirVazio: true, valorSalvo: c.tipo_cliente || '' });
      preencherSelectOpcoes($('mcOrigemCliente'), OPCOES_ORIGEM_CLIENTE, { incluirVazio: true, valorSalvo: c.origem_cliente || '' });
      $('mcOrigemDetalhe').value = c.origem_detalhe || '';
      $('mcStatusComercial').value = c.status_comercial || 'Novo';
      carregarDatasImportantes(c.datas_importantes);

      if (c.cep) ultimoCepConsultadoModal = String(c.cep).replace(/\D/g, '');

      $('pageTitle').textContent = 'Editar Cliente';
      $('mcBtnSalvar').textContent = 'Salvar Alterações';
      document.title = '432UP Partner | Editar Cliente';
    } catch (e) {
      console.error('[432UP Partner] Exceção ao carregar cliente:', e);
      showAlert('Erro técnico ao abrir a edição do cliente.', 'error');
    }
  }

  /* ================= SALVAR ================= */

  async function submitCadastroCliente(e) {
    e.preventDefault();
    var btn = $('mcBtnSalvar');
    var original = btn.textContent;
    $('mcAlert').classList.add('hidden');

    var tipoPessoa = $('mcTipoPessoa').value;
    var nomeRazao = $('mcNomeRazao').value.trim();
    var telefone = $('mcTelefone').value.trim();
    var docNumero = $('mcDocNumero').value.trim();
    var email = $('mcEmail').value.trim();
    var nomeFantasia = $('mcNomeFantasia').value.trim();
    var contatoNome = $('mcContatoNome').value.trim();
    var contatoCargo = $('mcContatoCargo').value.trim();
    var contatoEhResp = $('mcContatoEhResp').checked;
    var respNome = $('mcRespNome').value.trim();
    var respCargo = $('mcRespCargo').value.trim();
    var cep = $('mcCep').value.trim();
    var logradouro = $('mcLogradouro').value.trim();
    var numero = $('mcNumero').value.trim();
    var complemento = $('mcComplemento').value.trim();
    var bairro = $('mcBairro').value.trim();
    var cidade = $('mcCidade').value.trim();
    var uf = $('mcUf').value.trim();
    var obsComerciais = $('mcObs').value.trim();
    var tipoCliente = $('mcTipoCliente').value.trim();
    var origemCliente = $('mcOrigemCliente').value.trim();
    var origemDetalhe = $('mcOrigemDetalhe').value.trim();
    var statusComercial = $('mcStatusComercial').value.trim() || 'Novo';
    var datasImportantes = coletarDatasImportantes();

    if (!nomeRazao || !telefone) {
      mcShowAlert('Preencha ' + (tipoPessoa === 'PJ' ? 'a razão social' : 'o nome') + ' e o telefone.');
      return;
    }

    // Pessoa jurídica: se o contato for o responsável legal, usa os dados do contato
    var repNomeFinal = null, repCargoFinal = null;
    if (tipoPessoa === 'PJ') {
      if (contatoEhResp) {
        repNomeFinal = contatoNome || null;
        repCargoFinal = contatoCargo || null;
      } else {
        repNomeFinal = respNome || null;
        repCargoFinal = respCargo || null;
      }
    }

    var docNormalizado = normalizarNumeros(docNumero);
    var editandoId = mcClienteEditandoId;

    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.textContent = 'Salvando...';

    try {
      if (docNormalizado.length > 0) {
        var dupQuery = sbPartner.from('co_clientes').select('id').eq('cpf_cnpj', docNormalizado);
        if (editandoId) dupQuery = dupQuery.neq('id', editandoId);
        var dup = await dupQuery.maybeSingle();
        if (dup.error) console.error('[432UP Partner] Erro na checagem de duplicidade:', dup.error);
        if (dup.data) {
          mcShowAlert('Este cliente já possui cadastro em nossa base comercial e está vinculado a outro responsável. Para verificar a situação, entre em contato com a administração.');
          return;
        }
      }

      var payload = {
        tipo_pessoa: tipoPessoa,
        nome_razao: nomeRazao,
        telefone: telefone,
        cpf_cnpj: docNormalizado || null,
        email: email || null,
        nome_fantasia: tipoPessoa === 'PJ' ? (nomeFantasia || null) : null,
        contato_nome: tipoPessoa === 'PJ' ? (contatoNome || null) : null,
        contato_cargo: tipoPessoa === 'PJ' ? (contatoCargo || null) : null,
        contato_eh_responsavel: tipoPessoa === 'PJ' ? contatoEhResp : false,
        responsavel_legal: repNomeFinal,
        responsavel_legal_cargo: repCargoFinal,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf: uf || null,
        observacoes_comerciais: obsComerciais || null,
        tipo_cliente: tipoCliente || null,
        origem_cliente: origemCliente || null,
        origem_detalhe: origemDetalhe || null,
        status_comercial: statusComercial,
        datas_importantes: datasImportantes
      };

      var saveResult;
      if (editandoId) {
        saveResult = await sbPartner.from('co_clientes').update(payload).eq('id', editandoId).select(COLS_RETORNO).single();
      } else {
        payload.parceiro_responsavel_id = parceiroAtual.id;
        saveResult = await sbPartner.from('co_clientes').insert([payload]).select(COLS_RETORNO).single();
      }

      if (saveResult.error) {
        console.error('[432UP Partner] Erro no salvamento do cliente:', saveResult.error);
        mcShowAlert('Não foi possível salvar os dados do cliente. Tente novamente ou contate o suporte.');
      } else {
        showAlert(editandoId ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.', 'success');
        if (MODO_MODAL) {
          // Aberto dentro da Nova Proposta: devolve o cliente salvo e não reseta o formulário
          window.parent.postMessage({ tipo: 'cliente-salvo', cliente: saveResult.data }, window.location.origin);
          return;
        }
        if (!editandoId) {
          setTimeout(function () {
            $('formCadastroCliente').reset();
            setMcTipo('PF');
            onLimparWhatsappPaste();
            resetCamposComerciaisNovos();
            ultimoCepConsultadoModal = null;
            $('mcCepStatus').textContent = '';
            $('mcAlert').classList.add('hidden');
          }, 600);
        }
      }
    } catch (err) {
      console.error('[432UP Partner] Exceção no salvamento do cliente:', err);
      mcShowAlert('Erro técnico ao salvar o cliente. Tente novamente.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.textContent = original;
    }
  }

  /* ================= INICIALIZAÇÃO ================= */

  window.toggleMobileMenu = function () {
    var mobNav = $('mobile-menu');
    if (mobNav) mobNav.classList.toggle('active');
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var mobNav = $('mobile-menu');
      if (mobNav && mobNav.classList.contains('active')) mobNav.classList.remove('active');
    }
  });

  partnerRequireAuth().then(function (parceiro) {
    parceiroAtual = parceiro;
    if (typeof partnerFillSidebar === 'function') partnerFillSidebar(parceiro);

    $('mcBtnPF').addEventListener('click', function () { setMcTipo('PF'); });
    $('mcBtnPJ').addEventListener('click', function () { setMcTipo('PJ'); });
    $('mcContatoEhResp').addEventListener('change', atualizarBlocoResponsavel);
    $('mcDocNumero').addEventListener('input', handleMcDocTyping);
    $('mcCep').addEventListener('input', onMcCepInput);
    $('formCadastroCliente').addEventListener('submit', submitCadastroCliente);
    $('btnInterpretarWhatsapp').addEventListener('click', onInterpretarWhatsapp);
    $('btnLimparWhatsappPaste').addEventListener('click', onLimparWhatsappPaste);
    $('btnAddDataImportante').addEventListener('click', function () {
      adicionarLinhaData({ tipo: '', data: '', descricao: '', recorrencia: 'anual' });
    });

    var idEdicao = new URLSearchParams(window.location.search).get('id');
    var nomeParam = new URLSearchParams(window.location.search).get('nome');
    if (MODO_MODAL) {
      document.body.classList.add('modo-modal');
      $('btnCancelarModal').addEventListener('click', function () {
        window.parent.postMessage({ tipo: 'cliente-cancelado' }, window.location.origin);
      });
      $('btnSalvarModal').addEventListener('click', function () { $('mcBtnSalvar').click(); });
      // Recebe o nome digitado fora do modal (enviado pela Nova Proposta após o aviso 'cliente-pronto')
      window.addEventListener('message', function (ev) {
        if (ev.origin !== window.location.origin) return;
        var d = ev.data || {};
        if (d.tipo === 'prefill' && d.nome && !$('mcNomeRazao').value) $('mcNomeRazao').value = d.nome;
      });
    }
    carregarOpcoesClientes().then(function () {
      if (idEdicao) carregarClienteParaEdicao(idEdicao);
      if (MODO_MODAL) window.parent.postMessage({ tipo: 'cliente-pronto' }, window.location.origin);
    });

    var btnDesk = $('btnLogoutDesk');
    var btnMob = $('btnLogoutMob');
    if (btnDesk) btnDesk.addEventListener('click', partnerLogout);
    if (btnMob) btnMob.addEventListener('click', partnerLogout);
  });
})();
