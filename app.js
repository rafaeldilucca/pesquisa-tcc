/* Questionário do TCC: anúncio com camisa A ou B e resposta do consumidor.
   Perguntas e regras seguem o Questionário v2. */
(function () {
  'use strict';

  var CFG = window.PESQUISA_CONFIG || {};
  var URL_PLANILHA = (CFG.urlPlanilha || '').trim();
  var MARCA = CFG.marca || 'Aqua Naturale';
  var EMAIL = CFG.email || '';
  var VERSAO = CFG.versao || 'v2';
  var params = new URLSearchParams(location.search);
  var TESTE = params.get('teste') === '1';
  var CHAVE_FEITA = 'pesquisa_tcc_concluida';
  var CHAVE_PENDENTE = 'pesquisa_tcc_pendente';
  var TEMPO_MIN_ANUNCIO = 5000;

  var PECAS = {
    'FLA-A': { img: 'img/fla-a.jpg', cor: 'Vermelha e preta', alt: 'Homem sorrindo segura uma garrafa de água. Ele veste a camisa listrada em vermelho e preto do Flamengo.' },
    'FLA-B': { img: 'img/fla-b.jpg', cor: 'Branca', alt: 'Homem sorrindo segura uma garrafa de água. Ele veste a camisa branca do Flamengo, com faixa vermelha e preta no peito.' },
    'VAS-A': { img: 'img/vas-a.jpg', cor: 'Preta', alt: 'Homem sorrindo segura uma garrafa de água. Ele veste a camisa preta do Vasco, com faixa diagonal branca.' },
    'VAS-B': { img: 'img/vas-b.jpg', cor: 'Branca', alt: 'Homem sorrindo segura uma garrafa de água. Ele veste a camisa branca do Vasco, com faixa diagonal preta.' },
    'SEL-A': { img: 'img/sel-a.jpg', cor: 'Amarela', alt: 'Homem sorrindo segura uma garrafa de água. Ele veste a camisa amarela da Seleção Brasileira.' },
    'SEL-B': { img: 'img/sel-b.jpg', cor: 'Azul', alt: 'Homem sorrindo segura uma garrafa de água. Ele veste a camisa azul da Seleção Brasileira.' }
  };
  var GRUPOS = {
    FLA: { pecas: ['FLA-A', 'FLA-B'], time: 'Flamengo', representa: 'o Flamengo', de: 'do Flamengo' },
    VAS: { pecas: ['VAS-A', 'VAS-B'], time: 'Vasco da Gama', representa: 'o Vasco', de: 'do Vasco' },
    SEL: { pecas: ['SEL-A', 'SEL-B'], time: 'Seleção Brasileira', representa: 'a Seleção Brasileira', de: 'da Seleção Brasileira' }
  };

  var R = {};                 // respostas, com os nomes das colunas da planilha
  var estado = { pagina: 0, inicio: 0, tAnuncio: 0, emAndamento: false, enviado: false };
  var app = document.getElementById('app');
  var barra = document.getElementById('barra');

  // ---------- utilidades ----------
  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'classe') e.className = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return e;
  }
  function embaralha(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function guarda(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function le(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function apaga(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function idNovo() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function media(vals) {
    var n = vals.filter(function (v) { return typeof v === 'number'; });
    return n.length === vals.length ? Math.round(n.reduce(function (s, v) { return s + v; }, 0) / n.length * 1000) / 1000 : '';
  }
  var nId = 0;
  function uid(p) { nId += 1; return p + '-' + nId; }

  // ---------- componentes de pergunta ----------
  // Cada componente devolve { el, valido(), coletar() }.
  function escolha(cfg) {
    var nome = uid('q');
    var fs = el('fieldset', { classe: 'pergunta' });
    fs.appendChild(el('legend', { texto: cfg.titulo }));
    if (cfg.apoio) fs.appendChild(el('p', { classe: 'apoio', texto: cfg.apoio }));
    var lista = el('div', { classe: 'opcoes' });
    var campoOutro = null, escolhido = null;
    cfg.opcoes.forEach(function (op) {
      var input = el('input', { type: 'radio', name: nome, value: String(op.valor) });
      var lab = el('label', { classe: 'opcao' }, [input, el('span', { classe: 'marca-radio', 'aria-hidden': 'true' }), el('span', { texto: op.rotulo })]);
      input.addEventListener('change', function () {
        escolhido = op;
        Array.prototype.forEach.call(lista.querySelectorAll('.opcao'), function (l) { l.classList.remove('sel'); });
        lab.classList.add('sel');
        fs.classList.remove('falta');
        var msg = fs.querySelector('.erro'); if (msg) msg.remove();
        if (campoOutro) campoOutro.hidden = !op.outro;
        if (op.outro && campoOutro) campoOutro.querySelector('input').focus();
        if (cfg.aoMudar) cfg.aoMudar(op);
      });
      lista.appendChild(lab);
      if (op.outro) {
        campoOutro = el('div', { classe: 'campo-outro', hidden: true }, [
          el('input', { type: 'text', maxlength: '80', 'aria-label': op.rotulo, autocomplete: 'off' })
        ]);
        lista.appendChild(campoOutro);
      }
    });
    fs.appendChild(lista);
    return {
      el: fs,
      valido: function () { return !!escolhido; },
      falta: function () { marcaFalta(fs, 'Escolha uma opção para continuar.'); },
      coletar: function () {
        R[cfg.id] = escolhido ? escolhido.valor : '';
        if (cfg.idOutro) R[cfg.idOutro] = (escolhido && escolhido.outro && campoOutro) ? campoOutro.querySelector('input').value.trim() : '';
      },
      escolhido: function () { return escolhido; }
    };
  }

  function escala(cfg) {
    // cfg: id, texto, pontos, esq, dir, comoItem
    var nome = uid('e');
    var fs = el('fieldset', { classe: cfg.comoItem ? 'item-escala' : 'pergunta' });
    fs.appendChild(el('legend', { texto: cfg.texto }));
    var grade = el('div', { classe: 'pontos', style: 'grid-template-columns: repeat(' + cfg.pontos + ', 1fr)' });
    var valor = null;
    for (var i = 1; i <= cfg.pontos; i++) (function (v) {
      var rot = v === 1 ? v + ' – ' + cfg.esq : v === cfg.pontos ? v + ' – ' + cfg.dir : String(v);
      var input = el('input', { type: 'radio', name: nome, value: String(v), 'aria-label': rot });
      var lab = el('label', {}, [input, el('span', { texto: String(v), 'aria-hidden': 'true' })]);
      input.addEventListener('change', function () {
        valor = v;
        Array.prototype.forEach.call(grade.querySelectorAll('label'), function (l) { l.classList.remove('sel'); });
        lab.classList.add('sel');
        fs.classList.remove('falta');
        var msg = fs.querySelector('.erro'); if (msg) msg.remove();
      });
      grade.appendChild(lab);
    })(i);
    fs.appendChild(grade);
    fs.appendChild(el('div', { classe: 'extremos', 'aria-hidden': 'true' }, [el('span', { texto: '1 = ' + cfg.esq }), el('span', { texto: cfg.pontos + ' = ' + cfg.dir })]));
    return {
      el: fs,
      valido: function () { return valor !== null; },
      falta: function () { marcaFalta(fs, 'Marque um número de 1 a ' + cfg.pontos + '.'); },
      coletar: function () { R[cfg.id] = valor === null ? '' : valor; }
    };
  }

  function marcaFalta(fs, msg) {
    fs.classList.add('falta');
    if (!fs.querySelector('.erro')) fs.appendChild(el('p', { classe: 'erro', role: 'alert', texto: msg }));
  }

  // ---------- montagem das páginas ----------
  function pagina(titulo, partes, opc) {
    opc = opc || {};
    app.innerHTML = '';
    if (titulo) app.appendChild(el('h1', { texto: titulo }));
    var comps = [];
    partes.forEach(function (p) {
      if (!p) return;
      if (p.el) { comps.push(p); app.appendChild(p.el); } else app.appendChild(p);
    });
    var botao = el('button', { classe: 'botao', type: 'button', texto: opc.rotulo || 'Avançar' });
    var acoes = el('div', { classe: 'acoes' }, [botao]);
    app.appendChild(acoes);
    botao.addEventListener('click', function () {
      if (botao.disabled) return;
      var faltando = comps.filter(function (c) { return c.valido && !c.valido(); });
      if (faltando.length) {
        faltando.forEach(function (c) { c.falta(); });
        faltando[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      comps.forEach(function (c) { if (c.coletar) c.coletar(); });
      botao.disabled = true;
      Promise.resolve(opc.aoAvancar ? opc.aoAvancar() : null).then(function (destino) {
        if (destino === 'ficar') { botao.disabled = false; return; }
        if (typeof destino === 'function') destino(); else proxima();
      });
    });
    window.scrollTo(0, 0);
    var h = app.querySelector('h1, legend');
    if (h && opc.foco !== false) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    return botao;
  }

  function par(t, classe) { return el('p', { texto: t, classe: classe }); }

  // ---------- sequência ----------
  var PAGINAS = [
    pgApresentacao, pgIdade, pgLocal, pgPerfil, pgAnuncio, pgAtitude, pgJuster,
    pgAtencao, pgChecagem, pgControles, pgFutebol, pgCamisa1, pgCamisa2, pgEscolha, pgEscolhaSemCamisa, pgPerfilFinal
  ];

  function progresso() {
    var pct = Math.round(estado.pagina / PAGINAS.length * 100);
    barra.style.width = pct + '%';
    barra.parentNode.setAttribute('aria-valuenow', String(pct));
  }
  function mostrar(i) { estado.pagina = i; progresso(); PAGINAS[i](); }
  function proxima() { mostrar(estado.pagina + 1); }

  function pgApresentacao() {
    var c = escolha({ id: 'consentimento', titulo: 'Você concorda em participar?', opcoes: [
      { valor: 'Sim', rotulo: 'Sim, concordo' }, { valor: 'Não', rotulo: 'Não concordo' }] });
    var contato = el('p', {}, ['Em caso de dúvida, escreva para ', el('a', { href: 'mailto:' + EMAIL, texto: EMAIL }), '.']);
    pagina('Olá!', [
      par('Esta pesquisa faz parte do Trabalho de Conclusão de Curso de Rafael Di Lucca, aluno da graduação em Administração da FGV EBAPE, orientado pelo professor Daniel Kamlot.'),
      par('Você verá um anúncio e responderá a algumas perguntas. Isso leva cerca de 5 minutos, e não há respostas certas ou erradas. A participação é voluntária e anônima, e você pode desistir a qualquer momento. As respostas serão analisadas em conjunto e usadas apenas para fins acadêmicos.'),
      contato, c
    ], { foco: false, aoAvancar: function () {
      estado.inicio = Date.now();
      R.inicio_cliente = new Date().toISOString();
      if (R.consentimento !== 'Sim') return function () { encerrar('sem_consentimento'); };
      estado.emAndamento = true;
    } });
  }

  function pgIdade() {
    pagina('', [escolha({ id: 'idade', titulo: 'Qual é a sua idade?', opcoes: [
      'Menor de 18 anos', '18 a 23 anos', '24 a 29 anos', '30 a 35 anos', '36 a 41 anos',
      '42 a 47 anos', '48 a 53 anos', '54 a 59 anos', '60 anos ou mais'].map(function (t) { return { valor: t, rotulo: t }; }) })
    ], { aoAvancar: function () { if (R.idade === 'Menor de 18 anos') return function () { encerrar('menor_18'); }; } });
  }

  function pgLocal() {
    pagina('', [escolha({ id: 'local', titulo: 'Onde você mora?', opcoes: [
      'Cidade do Rio de Janeiro', 'Outro município da Região Metropolitana do Rio de Janeiro',
      'Outro município do estado do Rio de Janeiro', 'Outro estado ou país'].map(function (t) { return { valor: t, rotulo: t }; }) })
    ], { aoAvancar: function () {
      if (R.local === 'Outro município do estado do Rio de Janeiro' || R.local === 'Outro estado ou país') return function () { encerrar('fora_rmrj'); };
    } });
  }

  function pgPerfil() {
    var sexo = escolha({ id: 'sexo', titulo: 'Qual é o seu sexo?', opcoes: ['Feminino', 'Masculino', 'Outro', 'Prefiro não responder'].map(function (t) { return { valor: t, rotulo: t }; }) });
    var time = escolha({ id: 'time', idOutro: 'time_outro', titulo: 'Para qual time de futebol você torce?', opcoes: [
      { valor: 'Botafogo', rotulo: 'Botafogo' }, { valor: 'Flamengo', rotulo: 'Flamengo' },
      { valor: 'Fluminense', rotulo: 'Fluminense' }, { valor: 'Vasco da Gama', rotulo: 'Vasco da Gama' },
      { valor: 'Outro time', rotulo: 'Outro time. Qual?', outro: true },
      { valor: 'Não torço para nenhum time', rotulo: 'Não torço para nenhum time' }] });
    var botao = pagina('', [sexo, time], { aoAvancar: function () {
      R.grupo = R.time === 'Flamengo' ? 'FLA' : R.time === 'Vasco da Gama' ? 'VAS' : 'SEL';
      botao.textContent = 'Carregando…';
      return sortearPeca(R.grupo).then(function (p) {
        R.peca = p; R.camisa = p.slice(-1);
        return preCarrega([PECAS[p].img].concat(GRUPOS[R.grupo].pecas.map(function (x) { return PECAS[x].img; })));
      });
    } });
  }

  function pgAnuncio() {
    var p = PECAS[R.peca];
    var img = el('img', { src: p.img, alt: p.alt, width: '1080', height: '1350', decoding: 'async' });
    var botao = pagina('', [
      par('A seguir, você verá um anúncio. Observe-o com atenção, como faria se o encontrasse nas redes sociais.'),
      el('figure', { classe: 'peca' }, [img])
    ], { aoAvancar: function () { R.tempo_anuncio_s = Math.round((Date.now() - estado.tAnuncio) / 100) / 10; } });
    botao.disabled = true;
    function libera() { estado.tAnuncio = Date.now(); setTimeout(function () { botao.disabled = false; }, TEMPO_MIN_ANUNCIO); }
    if (img.complete) libera(); else { img.addEventListener('load', libera); img.addEventListener('error', libera); }
  }

  function pgAtitude() {
    var itens = [
      { id: 'Q5_1_boa', n: 1, texto: 'Acho que a ' + MARCA + ' é uma água boa.' },
      { id: 'Q5_2_util', n: 2, texto: 'Acho que a ' + MARCA + ' é uma água útil para o meu dia a dia.' },
      { id: 'Q5_3_favoravel', n: 3, texto: 'Minha opinião sobre a ' + MARCA + ' é favorável.' }
    ];
    var ordem = embaralha(itens);
    pagina('', [
      el('p', { classe: 'enunciado-bloco' }, [el('strong', { texto: 'Pensando no anúncio que você acabou de ver, indique o quanto concorda com cada afirmação.' })])
    ].concat(ordem.map(function (it) {
      return escala({ id: it.id, texto: it.texto, pontos: 7, esq: 'Discordo totalmente', dir: 'Concordo totalmente', comoItem: true });
    })), { aoAvancar: function () {
      R.Q5_ordem = ordem.map(function (it) { return it.id.split('_').pop(); }).join('>');
      R.atitude = media([R.Q5_1_boa, R.Q5_2_util, R.Q5_3_favoravel]);
    } });
  }

  function pgJuster() {
    var ops = [
      [10, 'Certamente ou praticamente certo'], [9, 'Quase que com certeza'],
      [8, 'Muito provável'], [7, 'Provável'], [6, 'Boa possibilidade'],
      [5, 'Razoável possibilidade'], [4, 'Alguma possibilidade'],
      [3, 'Pequena possibilidade'], [2, 'Escassa possibilidade'],
      [1, 'Probabilidade insignificante'], [0, 'Nenhuma chance ou quase nenhuma chance']
    ].map(function (o) { return { valor: o[0], rotulo: o[1] }; });
    pagina('', [escolha({ id: 'juster', titulo: 'Imagine que essa água estivesse à venda nos lugares onde você costuma comprar. Você compraria o produto anunciado nos próximos 30 dias?', opcoes: ops })]);
  }

  function pgAtencao() {
    var base = ['Cor da embalagem', 'Uniforme (camisa) usado pela pessoa', 'Marca da água', 'Pessoa do anúncio'];
    var ordem = embaralha(base);
    var ops = ordem.map(function (t) { return { valor: t, rotulo: t }; }).concat([{ valor: 'Outro', rotulo: 'Outro. O quê?', outro: true }]);
    pagina('', [escolha({ id: 'atencao', idOutro: 'atencao_outro', titulo: 'O que mais chamou a sua atenção no anúncio?', opcoes: ops })]);
  }

  function pgChecagem() {
    var q8 = escolha({ id: 'Q8_time', titulo: 'A pessoa do anúncio vestia a camisa de qual time ou seleção?', opcoes:
      ['Botafogo', 'Flamengo', 'Fluminense', 'Vasco da Gama', 'Seleção Brasileira', 'Outro', 'Não reparei'].map(function (t) { return { valor: t, rotulo: t }; }) });
    var q9 = escolha({ id: 'Q9_cor', titulo: 'Qual era a cor predominante da camisa?', opcoes:
      ['Vermelha e preta', 'Branca', 'Preta', 'Amarela', 'Azul', 'Outra', 'Não reparei'].map(function (t) { return { valor: t, rotulo: t }; }) });
    pagina('', [q8, q9], { aoAvancar: function () {
      R.check_time = R.Q8_time === GRUPOS[R.grupo].time ? 1 : 0;
      R.check_cor = R.Q9_cor === PECAS[R.peca].cor ? 1 : 0;
    } });
  }

  function pgControles() {
    var q10 = escolha({ id: 'conhece_marca', titulo: 'Antes desta pesquisa, você já conhecia a marca ' + MARCA + '?', opcoes:
      ['Sim', 'Não', 'Não tenho certeza'].map(function (t) { return { valor: t, rotulo: t }; }) });
    var q11 = escolha({ id: 'freq_agua', titulo: 'Com que frequência você compra água mineral engarrafada?', opcoes: [
      { valor: 1, rotulo: 'Nunca ou quase nunca' }, { valor: 2, rotulo: 'Algumas vezes por ano' },
      { valor: 3, rotulo: 'Algumas vezes por mês' }, { valor: 4, rotulo: 'Toda semana' }] });
    pagina('', [q10, q11]);
  }

  function pgFutebol() {
    var partes = [
      el('p', {}, [el('strong', { texto: 'Indique o quanto concorda com cada afirmação.' })]),
      escala({ id: 'gosta_futebol', texto: 'Eu gosto de futebol.', pontos: 5, esq: 'Discordo totalmente', dir: 'Concordo totalmente', comoItem: true })
    ];
    if (R.time !== 'Não torço para nenhum time') partes.push(escala({ id: 'intensidade', texto: 'Eu me considero muito torcedor(a) do meu time.', pontos: 5, esq: 'Discordo totalmente', dir: 'Concordo totalmente', comoItem: true }));
    else R.intensidade = '';
    if (R.grupo === 'SEL') partes.push(escala({ id: 'intensidade_sel', texto: 'Eu me considero muito torcedor(a) da Seleção Brasileira.', pontos: 5, esq: 'Discordo totalmente', dir: 'Concordo totalmente', comoItem: true }));
    else R.intensidade_sel = '';
    pagina('', partes);
  }

  var ordemCamisas = null;
  function paginaCamisa(qual, n) {
    var p = GRUPOS[R.grupo].pecas[qual === 'A' ? 0 : 1];
    var itens = [
      ['1_representa', 'Esta camisa representa bem ' + GRUPOS[R.grupo].representa + '.'],
      ['2_usar', 'Eu gostaria de usar esta camisa.'],
      ['3_impressao', 'Usar esta camisa causaria uma boa impressão nas outras pessoas.'],
      ['4_bonita', 'Esta camisa é bonita.'],
      ['5_preco', 'Esta camisa vale o preço de uma camisa oficial.']
    ];
    var pref = 'Q15' + qual + '_';
    pagina('', [
      par(n === 1 ? 'Agora, observe esta camisa.' : 'Agora, observe esta outra camisa.'),
      el('figure', { classe: 'peca camisa-img' }, [el('img', { src: PECAS[p].img, alt: PECAS[p].alt, width: '1080', height: '1350' })]),
      el('p', {}, [el('strong', { texto: 'Indique o quanto concorda com cada afirmação sobre esta camisa.' })])
    ].concat(itens.map(function (it) {
      return escala({ id: pref + it[0], texto: it[1], pontos: 5, esq: 'Discordo totalmente', dir: 'Concordo totalmente', comoItem: true });
    })), { aoAvancar: function () {
      R['valor_' + qual] = media(itens.map(function (it) { return R[pref + it[0]]; }));
    } });
  }
  function pgCamisa1() {
    ordemCamisas = embaralha(['A', 'B']);
    R.Q15_ordem = ordemCamisas.join('-');
    paginaCamisa(ordemCamisas[0], 1);
  }
  function pgCamisa2() { paginaCamisa(ordemCamisas[1], 2); }

  function pgEscolha() {
    escolhaCamisas('escolha', 'Q16_ordem', 'Se pudesse ganhar uma dessas camisas, qual escolheria?');
  }
  function pgEscolhaSemCamisa() {
    escolhaCamisas('escolha_hipotetica', 'Q16b_ordem', 'Agora, suponha que você não tem nem nunca teve nenhuma camisa ' + GRUPOS[R.grupo].de + '. Se pudesse ganhar uma dessas camisas, qual escolheria?');
  }
  function escolhaCamisas(campo, campoOrdem, titulo) {
    var g = GRUPOS[R.grupo];
    var ordem = embaralha(['A', 'B']);
    R[campoOrdem] = ordem.join('-');
    var nome = uid('f'), escolhido = null;
    var fs = el('fieldset', { classe: 'pergunta' });
    fs.appendChild(el('legend', { texto: titulo }));
    var fotos = el('div', { classe: 'escolha-fotos' });
    var todas = [];
    function marca(lab, v) {
      escolhido = v;
      todas.forEach(function (l) { l.classList.remove('sel'); });
      lab.classList.add('sel');
      fs.classList.remove('falta'); var m = fs.querySelector('.erro'); if (m) m.remove();
    }
    ordem.forEach(function (q, i) {
      var p = g.pecas[q === 'A' ? 0 : 1];
      var input = el('input', { type: 'radio', name: nome, value: q, 'aria-label': 'Opção ' + (i + 1) + ': ' + PECAS[p].alt });
      var lab = el('label', { classe: 'opcao-foto' }, [input, el('img', { src: PECAS[p].img, alt: '', width: '1080', height: '1350' }), el('span', { classe: 'marca-radio', 'aria-hidden': 'true' })]);
      input.addEventListener('change', function () { marca(lab, q); });
      todas.push(lab); fotos.appendChild(lab);
    });
    fs.appendChild(fotos);
    var inputN = el('input', { type: 'radio', name: nome, value: 'nenhuma' });
    var labN = el('label', { classe: 'opcao' }, [inputN, el('span', { classe: 'marca-radio', 'aria-hidden': 'true' }), el('span', { texto: 'Nenhuma das duas' })]);
    inputN.addEventListener('change', function () { marca(labN, 'nenhuma'); });
    todas.push(labN);
    fs.appendChild(el('div', { classe: 'opcoes' }, [labN]));
    pagina('', [{
      el: fs,
      valido: function () { return !!escolhido; },
      falta: function () { marcaFalta(fs, 'Escolha uma opção para continuar.'); },
      coletar: function () { R[campo] = escolhido; }
    }]);
  }

  function pgPerfilFinal() {
    var q17 = escolha({ id: 'instrucao', titulo: 'Qual é o seu grau de instrução?', opcoes: [
      'Ensino fundamental incompleto', 'Ensino fundamental completo', 'Ensino médio incompleto', 'Ensino médio completo',
      'Ensino superior incompleto', 'Ensino superior completo', 'Pós-graduação'].map(function (t, i) { return { valor: i + 1, rotulo: t }; }) });
    var q18 = escolha({ id: 'renda', titulo: 'Qual é a renda mensal da sua família, somando todos os moradores da casa?', opcoes: [
      { valor: 1, rotulo: 'Até R$ 3.000' }, { valor: 2, rotulo: 'De R$ 3.001 a R$ 6.000' },
      { valor: 3, rotulo: 'De R$ 6.001 a R$ 10.000' }, { valor: 4, rotulo: 'De R$ 10.001 a R$ 20.000' },
      { valor: 5, rotulo: 'Acima de R$ 20.000' }, { valor: 9, rotulo: 'Prefiro não responder' }] });
    var botao = pagina('', [q17, q18], { rotulo: 'Enviar respostas', aoAvancar: function () {
      botao.textContent = 'Enviando…';
      return finalizar();
    } });
  }

  // ---------- sorteio da peça ----------
  function sortearPeca(grupo) {
    var duas = GRUPOS[grupo].pecas;
    var forcada = params.get('peca');
    if (TESTE && forcada && duas.indexOf(forcada.toUpperCase()) >= 0) return Promise.resolve(forcada.toUpperCase());
    var aleatoria = duas[Math.random() < 0.5 ? 0 : 1];
    if (!URL_PLANILHA || TESTE) return Promise.resolve(aleatoria);
    var ctl = window.AbortController ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    return fetch(URL_PLANILHA + '?acao=sortear&grupo=' + grupo + '&versao=' + encodeURIComponent(VERSAO), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(tm); return (j && duas.indexOf(j.peca) >= 0) ? j.peca : aleatoria; })
      .catch(function () { clearTimeout(tm); R.sorteio_local = 1; return aleatoria; });
  }

  function preCarrega(srcs) {
    return Promise.all(srcs.map(function (s) {
      return new Promise(function (ok) { var i = new Image(); i.onload = i.onerror = function () { ok(); }; i.src = s; });
    })).then(function () { return null; });
  }

  // ---------- envio ----------
  function comum(status) {
    R.id_resposta = R.id_resposta || idNovo();
    R.status = status;
    R.teste = TESTE ? 1 : 0;
    R.versao = VERSAO;
    var toque = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    R.dispositivo = toque ? (window.innerWidth < 700 ? 'celular' : 'tablet') : 'computador';
    R.largura_tela = window.innerWidth;
    R.tempo_total_s = estado.inicio ? Math.round((Date.now() - estado.inicio) / 1000) : '';
    R.sorteio_local = R.sorteio_local || 0;
    return JSON.stringify(R);
  }

  function enviar(corpo) {
    if (!URL_PLANILHA) { console.info('[demonstração] resposta não enviada:', JSON.parse(corpo)); return Promise.resolve(true); }
    var tentativa = 0;
    function vai() {
      tentativa += 1;
      return fetch(URL_PLANILHA, { method: 'POST', body: corpo, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (j) { if (j && j.ok !== false) return true; throw new Error('recusado'); })
        .catch(function () {
          if (tentativa < 3) return espera(1200 * tentativa).then(vai);
          try { return !!(navigator.sendBeacon && navigator.sendBeacon(URL_PLANILHA, new Blob([corpo], { type: 'text/plain;charset=utf-8' }))); } catch (e) { return false; }
        });
    }
    return vai();
  }

  function finalizar() {
    var corpo = comum('completo');
    guarda(CHAVE_PENDENTE, corpo);
    return enviar(corpo).then(function (ok) {
      if (ok) {
        apaga(CHAVE_PENDENTE);
        if (!TESTE) guarda(CHAVE_FEITA, '1');
        estado.emAndamento = false; estado.enviado = true;
        return telaFim;
      }
      return telaErroEnvio;
    });
  }

  function encerrar(status) {
    var corpo = comum(status);
    if (URL_PLANILHA) {
      try { navigator.sendBeacon(URL_PLANILHA, new Blob([corpo], { type: 'text/plain;charset=utf-8' })); } catch (e) { enviar(corpo); }
    } else console.info('[demonstração] encerramento:', JSON.parse(corpo));
    if (!TESTE && status !== 'sem_consentimento') guarda(CHAVE_FEITA, '1');
    estado.emAndamento = false;
    barra.style.width = '100%';
    app.innerHTML = '';
    var msgs = {
      sem_consentimento: ['Tudo bem!', 'Obrigado pela atenção. Você pode fechar esta página.'],
      menor_18: ['Obrigado pelo interesse!', 'Esta pesquisa é destinada a pessoas com 18 anos ou mais. Você pode fechar esta página.'],
      fora_rmrj: ['Obrigado pelo interesse!', 'Esta pesquisa é destinada a pessoas que moram na Região Metropolitana do Rio de Janeiro. Você pode fechar esta página.']
    }[status];
    app.appendChild(el('div', { classe: 'fim' }, [el('h1', { texto: msgs[0] }), par(msgs[1])]));
  }

  function telaFim() {
    barra.style.width = '100%';
    app.innerHTML = '';
    app.appendChild(el('div', { classe: 'fim' }, [
      el('h1', { texto: 'Muito obrigado pela sua participação!' }),
      par('A marca ' + MARCA + ' e o anúncio que você viu foram criados apenas para esta pesquisa acadêmica. A marca não existe e não tem relação com clubes, com a CBF ou com fabricantes de camisas.'),
      par('Pedimos que não comente os detalhes da pesquisa com quem ainda vai responder.'),
      par('Suas respostas foram registradas. Você pode fechar esta página.', 'texto-suave')
    ]));
    window.scrollTo(0, 0);
  }

  function telaErroEnvio() {
    app.innerHTML = '';
    var b = el('button', { classe: 'botao', type: 'button', texto: 'Tentar de novo' });
    app.appendChild(el('div', { classe: 'fim' }, [
      el('h1', { texto: 'Não conseguimos enviar suas respostas' }),
      par('Verifique a sua conexão com a internet e toque em “Tentar de novo”. Suas respostas continuam guardadas neste aparelho.'),
      el('div', { classe: 'acoes' }, [b])
    ]));
    b.addEventListener('click', function () {
      b.disabled = true; b.textContent = 'Enviando…';
      var corpo = le(CHAVE_PENDENTE) || JSON.stringify(R);
      enviar(corpo).then(function (ok) {
        if (ok) { apaga(CHAVE_PENDENTE); if (!TESTE) guarda(CHAVE_FEITA, '1'); estado.emAndamento = false; telaFim(); }
        else { b.disabled = false; b.textContent = 'Tentar de novo'; }
      });
    });
  }

  function telaJaRespondeu() {
    barra.style.width = '100%';
    app.innerHTML = '';
    app.appendChild(el('div', { classe: 'fim' }, [el('h1', { texto: 'Você já participou desta pesquisa' }), par('Obrigado! Cada pessoa responde uma única vez.')]));
  }

  window.addEventListener('beforeunload', function (e) {
    if (estado.emAndamento && !estado.enviado) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- início ----------
  if (!URL_PLANILHA) document.getElementById('aviso-demo').hidden = false;
  if (TESTE) document.getElementById('aviso-teste').hidden = false;
  var pend = le(CHAVE_PENDENTE);
  if (pend && URL_PLANILHA) enviar(pend).then(function (ok) { if (ok) { apaga(CHAVE_PENDENTE); if (!TESTE) guarda(CHAVE_FEITA, '1'); } });
  if (!TESTE && le(CHAVE_FEITA) === '1') telaJaRespondeu();
  else mostrar(0);
})();
