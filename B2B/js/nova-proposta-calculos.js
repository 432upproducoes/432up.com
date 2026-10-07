/**
 * nova-proposta-calculos.js
 * Funções de formação de preço e cálculo dos serviços.
 * Componentes de preço são CUMULATIVOS (não exclusivos):
 *   base + horas excedentes (se houver) + pessoas + metragem + faixa/adicional
 * Horas mínimas (horas_minimas ou 4 quando calc_por_hora) já estão no valor base;
 * só as horas excedentes são cobradas.
 * Funções puras: recebem todos os parâmetros necessários (sem fechar sobre estado da app).
 */
(function (global) {
  'use strict';

  /**
   * Valor por metragem, aplicando faixas de economia de escala se existirem.
   */
  function calcularValorPorMetro(s, metragem) {
    if (!metragem || metragem <= 0) return { valor: 0, valorPorMetroAplicado: 0, faixaAplicada: null };
    if (s.faixas_metro && s.faixas_metro.length) {
      var faixa = s.faixas_metro.find(function (f) {
        return metragem >= f.min && metragem <= (f.max != null ? f.max : Infinity);
      });
      if (faixa) {
        return {
          valor: metragem * Number(faixa.valor_metro || 0),
          valorPorMetroAplicado: Number(faixa.valor_metro || 0),
          faixaAplicada: faixa
        };
      }
    }
    return {
      valor: metragem * (Number(s.valor_por_metro) || 0),
      valorPorMetroAplicado: Number(s.valor_por_metro) || 0,
      faixaAplicada: null
    };
  }

  /**
   * Horas excedentes em relação às horas mínimas incluídas no base.
   * horas_minimas (se definida) ou 4 (quando calc_por_hora) ou 0.
   * Nunca cobra de novo as horas já incluídas no valor_base.
   */
  function calcularValorPorHora(s, horas) {
    var vph = Number(s.valor_por_hora || s.valor_hora) || 0;
    if (!horas || horas <= 0 || vph <= 0) {
      return { valor: 0, valorPorHoraAplicado: vph, horasExtras: 0, horasMin: 0 };
    }
    var horasMin = 0;
    if (s.horas_minimas != null && Number(s.horas_minimas) > 0) {
      horasMin = Number(s.horas_minimas);
    } else if (s.calc_por_hora) {
      horasMin = 4;
    }
    var extras = Math.max(0, Number(horas) - horasMin);
    return {
      valor: extras * vph,
      valorPorHoraAplicado: vph,
      horasExtras: extras,
      horasMin: horasMin
    };
  }

  /**
   * FONTE ÚNICA DE VERDADE para o preço unitário de um serviço.
   *
   * PREÇO FINAL = valor_base
   *             + horas excedentes (se isPorHora/calc_por_hora e rate)
   *             + (calc_por_pessoa ? convidados * valor_por_pessoa : 0)
   *             + (metragem configurada ? valor por metro : 0)
   *             + (faixas.length ? adicional da faixa : 0)
   *
   * Cada componente só entra se estiver configurado/aplicável.
   * opts: { convidados, horas, metragem, temPacoteAtivo }
   */
  function calcularPrecoServico(s, opts) {
    opts = opts || {};
    var convidados = opts.convidados != null ? Number(opts.convidados) : 0;
    var horas = opts.horas != null ? Number(opts.horas) : null;
    var metragem = opts.metragem != null ? Number(opts.metragem) : null;
    var temPacoteAtivo = !!opts.temPacoteAtivo;

    var v = Number(s.valor_base) || 0;
    var detalhe = {
      base: Number(s.valor_base) || 0,
      porHora: 0,
      porPessoa: 0,
      porMetro: 0,
      faixaAdicional: 0,
      faixaAplicada: null,
      total: 0
    };

    // --- Horas excedentes (cumulativo com base) ---
    var hasHoraRate = (Number(s.valor_hora || s.valor_por_hora) || 0) > 0;
    var usaHora = (s.isPorHora || s.calc_por_hora) && hasHoraRate;
    if (usaHora && !temPacoteAtivo) {
      var hEfetivas = horas;
      if (hEfetivas == null || !isFinite(hEfetivas)) {
        // fallback: usar mínimo se existir, senão não cobra hora
        hEfetivas = (s.horas_minimas != null && s.horas_minimas > 0) ? s.horas_minimas : null;
      }
      if (hEfetivas != null && hEfetivas > 0) {
        var ch = calcularValorPorHora(s, hEfetivas);
        detalhe.porHora = Number(ch.valor) || 0;
        v += detalhe.porHora;
      }
    }

    // --- Por pessoa ---
    if (s.calc_por_pessoa && s.valor_por_pessoa) {
      detalhe.porPessoa = convidados * Number(s.valor_por_pessoa);
      v += detalhe.porPessoa;
    }

    // --- Metragem (cumulativo) ---
    var usaMetro = s.isPorMetro || (s.valor_por_metro && s.metragem_minima != null);
    if (usaMetro) {
      var mEfetiva = metragem;
      if (mEfetiva == null || !isFinite(mEfetiva) || mEfetiva <= 0) {
        mEfetiva = (s.metragem_minima != null && s.metragem_minima > 0) ? s.metragem_minima : 0;
      }
      if (mEfetiva > 0) {
        var cm = calcularValorPorMetro(s, mEfetiva);
        detalhe.porMetro = Number(cm.valor) || 0;
        if (cm.faixaAplicada) detalhe.faixaAplicada = cm.faixaAplicada;
        v += detalhe.porMetro;
      }
    }

    // --- Faixas de convidados / adicional (ACUMULATIVAS) ---
    if (s.faixas && s.faixas.length) {
      var faixasAplicadas = [];
      s.faixas.forEach(function (f) {
        var min = Number(f.min);
        if (isFinite(min) && convidados >= min) {
          faixasAplicadas.push(f);
        }
      });
      if (faixasAplicadas.length) {
        faixasAplicadas.forEach(function (f) {
          detalhe.faixaAdicional += Number(f.adicional) || 0;
        });
        detalhe.faixaAplicada = faixasAplicadas[faixasAplicadas.length - 1];
        v += detalhe.faixaAdicional;
      }
    }

    detalhe.total = v;
    return detalhe;
  }

  /**
   * Valor de referência avulso (para comparação com pacote).
   * Usa as quantidades de referência (mins) e soma todos os componentes.
   */
  function valorReferenciaAvulso(s, horasRef, metroRef, qtdRef, convidadosRef) {
    if (!s) return 0;
    var pc = calcularPrecoServico(s, {
      temPacoteAtivo: false,
      horas: horasRef != null ? horasRef : (s.isPorHora ? (s.horas_minimas || null) : null),
      metragem: metroRef != null ? metroRef : (s.isPorMetro ? (s.metragem_minima || null) : null),
      convidados: convidadosRef != null ? convidadosRef : 0
    });
    var v = Number(pc.total) || 0;
    var q = qtdRef != null ? Number(qtdRef) : 1;
    if (!isFinite(q) || q < 1) q = 1;
    return v * q;
  }

  /**
   * Preço unitário a partir do estado do composer (metragem/horas atuais).
   * activePkg, svcMetragem, svcHoras, evConvidados são passados explicitamente.
   */
  function precoUnitarioComposer(s, ctx) {
    ctx = ctx || {};
    var metragemAtual = Number(ctx.metragem) || 0;
    var horasAtual = Number(ctx.horas) || 0;
    if (s.isPorMetro && metragemAtual <= 0 && s.metragem_minima) metragemAtual = s.metragem_minima;
    if (s.isPorHora && horasAtual <= 0 && s.horas_minimas) horasAtual = s.horas_minimas;
    var pc = calcularPrecoServico(s, {
      temPacoteAtivo: !!ctx.temPacoteAtivo,
      horas: (s.isPorHora || s.calc_por_hora) ? horasAtual : null,
      metragem: s.isPorMetro ? metragemAtual : null,
      convidados: ctx.convidados != null ? ctx.convidados : 0
    });
    return Number(pc.total) || 0;
  }

  /**
   * Monta o objeto de linha do carrinho com preço cumulativo.
   * ctx: { qtd, metragem, horas, temPacoteAtivo, convidados, cartId }
   */
  function montarLinhaCarrinho(s, ctx) {
    ctx = ctx || {};
    var qtd = Number(ctx.qtd) || 0;
    if (qtd <= 0) qtd = 1;
    var metragem = Number(ctx.metragem) || 0;
    var horas = Number(ctx.horas) || 0;
    if (s.isPorMetro && metragem <= 0 && s.metragem_minima) metragem = s.metragem_minima;
    if (s.isPorHora && horas <= 0 && s.horas_minimas) horas = s.horas_minimas;

    var pc = calcularPrecoServico(s, {
      temPacoteAtivo: !!ctx.temPacoteAtivo,
      horas: (s.isPorHora || s.calc_por_hora) ? horas : null,
      metragem: s.isPorMetro ? metragem : null,
      convidados: ctx.convidados != null ? ctx.convidados : 0
    });

    var precoUnit = Number(pc.total) || 0;
    var item = {
      cart_id: ctx.cartId || null,
      tipo: 'servico',
      id: s.servico_id,
      nome: s.nome,
      quantidade: qtd,
      valor: precoUnit * qtd,
      preco_unitario: precoUnit,
      valor_base: pc.base,
      valor_por_hora_aplicado: pc.porHora,
      valor_por_pessoa_aplicado: pc.porPessoa,
      faixa_aplicada: pc.faixaAplicada
    };
    if (s.isPorMetro && metragem > 0) {
      item.metragem = metragem;
      item.unidade_metragem = s.unidade_metragem || 'm';
      var cm = calcularValorPorMetro(s, metragem);
      item.valor_por_metro_aplicado = cm.valorPorMetroAplicado;
      if (cm.faixaAplicada) item.faixa_aplicada = cm.faixaAplicada;
    }
    if ((s.isPorHora || s.calc_por_hora) && horas > 0) {
      item.horas = horas;
    }
    return item;
  }

  // Exporta para o escopo global (usado pelo core via IIFE)
  global.calcularValorPorMetro = calcularValorPorMetro;
  global.calcularValorPorHora = calcularValorPorHora;
  global.calcularPrecoServico = calcularPrecoServico;
  global.valorReferenciaAvulso = valorReferenciaAvulso;
  global.precoUnitarioComposer = precoUnitarioComposer;
  global.montarLinhaCarrinho = montarLinhaCarrinho;

})(typeof window !== 'undefined' ? window : this);
