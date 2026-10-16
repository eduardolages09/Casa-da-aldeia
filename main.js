/* Casa da Aldeia — versão base (v3). Um IIFE só, sem dependências (o Lenis,
   se carregar, só dá o scroll suave). Tudo o que mexe com o scroll segue-o
   diretamente: nada de transições que fiquem para trás. */
(function () {
  'use strict';

  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = window.matchMedia('(pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var limita = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var suave = function (t) { return t * t * (3 - 2 * t); };
  var sai = function (t) { return 1 - Math.pow(1 - t, 3); };
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };
  var vh = window.innerHeight;
  var vw = window.innerWidth;

  /* ---------- SCROLL SUAVE (Lenis) ---------- */
  var lenis = null;
  if (!reduz && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    document.documentElement.classList.add('lenis');
    var corre = function (t) { lenis.raf(t); requestAnimationFrame(corre); };
    requestAnimationFrame(corre);
  }
  function scrollY() { return window.scrollY || window.pageYOffset; }
  function irParaY(y, dur) {
    if (lenis) lenis.scrollTo(y, { duration: dur || 1.4 });
    else window.scrollTo({ top: y, behavior: reduz ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var alvo = a.getAttribute('href');
      if (alvo.length < 2 || !$(alvo)) return;
      e.preventDefault();
      fechaMenu();
      irParaY($(alvo).getBoundingClientRect().top + scrollY() - (alvo === '#inicio' ? 0 : 0));
    });
  });

  /* ---------- DESFOQUE: as palavras dos títulos, uma a uma ---------- */
  $$('[data-desfoca]').forEach(function (el) {
    var i = 0;
    var parte = function (no) {
      if (no.nodeType === 3) {
        var frag = document.createDocumentFragment();
        no.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var p = document.createElement('span');
          p.className = 'palavra';
          p.textContent = w;
          p.style.setProperty('--i', i++);
          frag.appendChild(p);
        });
        no.parentNode.replaceChild(frag, no);
      } else if (!no.classList || !no.classList.contains('invisivel')) {
        Array.prototype.slice.call(no.childNodes).forEach(parte);
      }
    };
    Array.prototype.slice.call(el.childNodes).forEach(parte);
  });

  /* ---------- HERO: abre quando a foto está pronta ----------
     A foto nunca se mexe; o nome sai do desfoque e o resto sobe. */
  var hero = $('.hero');
  var heroImg = $('#heroImg');
  var heroTitulo = $('#hero-titulo');
  var abriu = false;
  var abreHero = function () {
    if (abriu) return;
    abriu = true;
    hero.classList.add('is-pronto');
    heroTitulo.classList.add('is-visivel');
  };
  if (reduz) abreHero();
  else if (heroImg.complete && heroImg.naturalWidth) setTimeout(abreHero, 120);
  else {
    heroImg.addEventListener('load', function () { setTimeout(abreHero, 80); }, { once: true });
    setTimeout(abreHero, 2200);   // se a foto tardar, o nome não fica à espera
  }

  /* ---------- TOPO, menu e barra do telemóvel ---------- */
  var topo = $('#topo');
  var menu = $('#menu');
  var barra = $('#barra');
  var ultimoY = 0;
  function fechaMenu() {
    if (!topo.classList.contains('menu-aberto')) return;
    topo.classList.remove('menu-aberto');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Abrir o menu');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }
  menu.addEventListener('click', function () {
    if (topo.classList.contains('menu-aberto')) return fechaMenu();
    topo.classList.remove('is-escondido');
    topo.classList.add('menu-aberto');
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', 'Fechar o menu');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechaMenu(); });

  function topoNoScroll(y, rReservar) {
    var h = hero.offsetHeight;
    topo.classList.toggle('is-solido', y > h - 90);
    if (!topo.classList.contains('menu-aberto')) {
      if (y > h && y > ultimoY + 4) topo.classList.add('is-escondido');
      else if (y < ultimoY - 4 || y <= h) topo.classList.remove('is-escondido');
    }
    // a barra sai quando chegam os botões do fecho
    barra.classList.toggle('is-visivel', y > h * .7 && rReservar.top > vh * .55);
    ultimoY = y;
  }

  /* ---------- REVELAÇÕES ---------- */
  var vigia = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visivel');
      vigia.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-revela], [data-desfoca]').forEach(function (el) {
    if (el === heroTitulo) return;
    if (reduz) el.classList.add('is-visivel'); else vigia.observe(el);
  });

  /* ---------- FOTO QUE CRESCE (a vista) ----------
     Como na Casa da Gueira: a secção é alta e o palco fica preso; --p vai
     de 0 a 1 nos primeiros 70% do percurso e a moldura abre-se. */
  var cresce = $('#cresce');
  function atualizaCresce(r) {
    if (reduz) return;
    if (r.bottom < -50 || r.top > vh + 50) return;
    var t = limita(-r.top / (Math.max(1, r.height - vh) * 0.7), 0, 1);
    var p = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cresce.style.setProperty('--p', p.toFixed(4));
  }
  if (!reduz) cresce.style.setProperty('--p', 0);

  /* ---------- SECÇÕES PRESAS ----------
     Avançam com o scroll, foto a foto, sempre (também ao voltar); cada passo
     tem um momento parado, a troca e outro momento parado.
       portas  (espaços comuns)  a foto seguinte entra da direita como uma
                                 porta de correr; a imagem a meia velocidade
       regiao  (a aldeia)        a foto entra da direita por cima da anterior */
  var presas = $$('[data-presa]').map(function (sec) {
    var g = {
      sec: sec,
      tipo: sec.getAttribute('data-presa'),
      fotos: $$('.presa__foto', sec),
      legendas: $$('.legenda', sec),
      botoes: $$('[data-ir]', sec),
      conta: $('[data-conta]', sec),
      moldura: $('.presa__moldura', sec),
      t: -1, ativa: -1
    };
    g.n = g.fotos.length;
    sec.style.setProperty('--n', g.n);
    return g;
  });

  function desenha(g, t) {
    if (t === g.t) return;
    g.t = t;
    for (var k = 1; k < g.n; k++) {
      var f = g.fotos[k], img = f.firstElementChild;
      var r = limita(t - (k - 1), 0, 1);
      if (g.tipo === 'portas') {
        f.style.transform = 'translate3d(' + ((1 - r) * 100).toFixed(2) + '%,0,0)';
        img.style.transform = 'translate3d(' + (-(1 - r) * 50).toFixed(2) + '%,0,0)';
      } else {
        f.style.clipPath = 'inset(0 0 0 ' + ((1 - r) * 100).toFixed(2) + '%)';
      }
      f.style.visibility = r > 0 ? 'visible' : 'hidden';
    }
    var a = Math.round(t);
    if (a === g.ativa) return;
    g.ativa = a;
    g.legendas.forEach(function (l, i) { l.classList.toggle('is-ativa', i === a); });
    g.botoes.forEach(function (b, i) { b.setAttribute('aria-selected', i === a ? 'true' : 'false'); });
    if (g.conta) g.conta.textContent = dois(a + 1);
    g.sec.style.setProperty('--prog', g.n > 1 ? (a / (g.n - 1)).toFixed(3) : 1);
    // a moldura abre o visor da divisão que está à vista
    var f = g.fotos[a];
    if (f.hasAttribute('data-s')) {
      g.moldura.setAttribute('data-serie', f.getAttribute('data-s'));
      g.moldura.setAttribute('data-foto', f.getAttribute('data-f'));
    }
  }
  function presaScroll(g, r) {
    if (r.top > vh || r.bottom < 0) return;
    var curso = Math.max(1, r.height - vh);
    var bruto = limita(-r.top / curso, 0, 1) * (g.n - 1);
    var k = Math.min(Math.floor(bruto), g.n - 2);
    var f = bruto - k;
    var t = g.n < 2 ? 0 : (reduz ? Math.round(bruto) : k + suave(limita((f - 0.16) / 0.68, 0, 1)));
    desenha(g, t);
  }
  // os nomes dos lugares levam o scroll até eles
  presas.forEach(function (g) {
    g.botoes.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var curso = g.sec.offsetHeight - vh;
        var topoSec = g.sec.getBoundingClientRect().top + scrollY();
        irParaY(topoSec + curso * i / Math.max(1, g.n - 1), 1);
      });
    });
    desenha(g, 0);
  });

  /* ---------- QUARTOS ----------
     Como na Casa do Poço: a pista fica presa e o scroll percorre as fotos de
     cada quarto; o nome muda quando muda o quarto e o traço do separador
     enche-se com as fotos dele. Os separadores levam o scroll ao quarto. */
  var qsec = $('[data-quartos]');
  var qpista = $('.quartos__pista', qsec);
  var qfotos = $$('.qfoto', qsec);
  var qtextos = $$('.qtexto', qsec);
  var qabas = $$('[data-qir]', qsec);
  var qsegs = $$('.quartos__seg span', qsec);
  var qabre = $('.quartos__foto', qsec);
  var NQ = qfotos.length;
  var Q = { i: -1, q: -1, passo: 0.5 };
  var qinicio = [];
  qfotos.forEach(function (f, k) { var q = +f.getAttribute('data-q'); if (qinicio[q] === undefined) qinicio[q] = k; });
  qinicio.push(NQ);
  if (reduz) qsec.classList.add('is-livre');

  function encheQuartos(p) {
    qsegs.forEach(function (sg, k) {
      var a = qinicio[k], b = qinicio[k + 1];
      sg.style.transform = 'scaleX(' + limita((p - a) / (b - a), 0, 1).toFixed(4) + ')';
    });
  }
  function mostraFoto(i) {
    i = limita(i, 0, NQ - 1);
    if (reduz) encheQuartos(i + 1);
    if (i === Q.i) return;
    Q.i = i;
    var f = qfotos[i], q = +f.getAttribute('data-q');
    qfotos.forEach(function (x, k) { x.classList.toggle('is-atual', k === i); });
    qabre.setAttribute('data-serie', 'q' + q);
    qabre.setAttribute('data-foto', f.getAttribute('data-f'));
    if (q === Q.q) return;
    Q.q = q;
    qtextos.forEach(function (t, k) { t.classList.toggle('is-atual', k === q); });
    qabas.forEach(function (b, k) { b.setAttribute('aria-pressed', k === q ? 'true' : 'false'); });
  }
  function medeQuartos() { qpista.style.height = reduz ? '' : (vh * (1 + NQ * Q.passo)) + 'px'; }
  function atualizaQuartos(r) {
    if (reduz || r.top > vh + 50 || r.bottom < -50) return;
    var p = limita(-r.top / Math.max(1, r.height - vh), 0, 1) * NQ;
    encheQuartos(p);
    mostraFoto(Math.min(NQ - 1, Math.floor(p)));
  }
  qabas.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = +b.getAttribute('data-qir');
      if (reduz) return mostraFoto(qinicio[k]);
      var y = qpista.getBoundingClientRect().top + scrollY() + (qinicio[k] + 0.05) / NQ * (qpista.offsetHeight - vh);
      irParaY(y, 1);
    });
  });
  medeQuartos();
  mostraFoto(0);

  /* ---------- ENTRADA E SAÍDA DAS FOTOS ----------
     Cada moldura abre-se e sobe ao entrar no ecrã e, ao sair por cima,
     recua e esvai-se; ligado diretamente ao scroll. Mede-se no pai, que
     não se mexe com a transformação. */
  var entradas = $$('[data-entra], .espacos__moldura, .quartos__foto, .aldeia__moldura').map(function (el) {
    return { el: el, pai: el.parentElement, e: -1, s: -1 };
  });
  function entraSai(rects) {
    entradas.forEach(function (x, k) {
      var r = rects[k];
      if (r.top > vh + 20 || r.bottom < -20) return;
      var e = reduz ? 1 : sai(limita((vh - r.top) / (vh * 0.7), 0, 1));
      var s = reduz ? 0 : limita((vh * 0.85 - r.bottom) / (vh * 0.85), 0, 1);
      if (e === x.e && s === x.s) return;
      x.e = e; x.s = s;
      var a = 1 - e;
      x.el.style.clipPath = a > 0.001 ? 'inset(' + (a * 10).toFixed(2) + '% ' + (a * 8).toFixed(2) + '%)' : '';
      x.el.style.transform = (a > 0.001 || s > 0.001)
        ? 'translate3d(0,' + (a * 80 - s * 50).toFixed(1) + 'px,0) scale(' + (1 - s * 0.08).toFixed(4) + ')' : '';
      x.el.style.opacity = s > 0.001 ? (1 - s * 0.6).toFixed(3) : '';
    });
  }

  /* ---------- A CADA SCROLL ----------
     Primeiro mede-se tudo e só depois se escreve. */
  var reservar = $('#reservar');
  function atualiza() {
    var y = scrollY();
    var rCresce = cresce.getBoundingClientRect();
    var rPresas = presas.map(function (g) { return g.sec.getBoundingClientRect(); });
    var rQuartos = qpista.getBoundingClientRect();
    var rEntradas = entradas.map(function (x) { return x.pai.getBoundingClientRect(); });
    var rReservar = reservar.getBoundingClientRect();

    atualizaCresce(rCresce);
    presas.forEach(function (g, k) { presaScroll(g, rPresas[k]); });
    atualizaQuartos(rQuartos);
    entraSai(rEntradas);
    if (!reduz) reservar.style.setProperty('--rp', limita((vh - rReservar.top) / (vh * 1.2), 0, 1).toFixed(4));
    topoNoScroll(y, rReservar);
  }
  var pedido = false;
  var agenda = function () {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(function () { pedido = false; atualiza(); });
  };
  if (lenis) lenis.on('scroll', atualiza);
  window.addEventListener('scroll', agenda, { passive: true });
  window.addEventListener('resize', function () {
    vh = window.innerHeight; vw = window.innerWidth;
    medeQuartos();
    agenda();
  });
  atualiza();

  /* ---------- COMODIDADES ----------
     Como no Solar Antigo: a fita anda sozinha para a esquerda, devagar, e
     não acaba (a lista está duplicada; a meio do percurso volta ao
     princípio, onde a emenda não se vê). Pára com o rato por cima ou com o
     foco; arrasta-se com o rato e desliza com o dedo. */
  (function () {
    var pista = $('[data-comod-pista]');
    var fila = $('[data-comod-lista]');
    if (!pista || !fila || reduz) return;
    var VELOCIDADE = 24;            // px por segundo
    var pausa = 0, sobre = false, anterior = null;
    var pos = pista.scrollLeft;
    var volta = fila.scrollWidth / 2;
    var visivel = false, aCorrer = false;
    function liga() { if (aCorrer) return; aCorrer = true; anterior = null; requestAnimationFrame(anda); }
    function anda(agora) {
      if (!visivel) { aCorrer = false; return; }
      if (anterior === null) anterior = agora;
      var ms = Math.min(agora - anterior, 100);
      anterior = agora;
      if (sobre || pausa > 0) {
        if (pausa > 0) pausa -= ms;
        pos = pista.scrollLeft;
      } else {
        pos += VELOCIDADE * ms / 1000;
        if (volta > 0) { if (pos >= volta) pos -= volta; else if (pos < 0) pos += volta; }
        pista.scrollLeft = pos;
      }
      requestAnimationFrame(anda);
    }
    window.addEventListener('resize', function () { volta = fila.scrollWidth / 2; });
    new IntersectionObserver(function (e) {
      visivel = e[0].isIntersecting;
      if (visivel) { volta = fila.scrollWidth / 2; liga(); }
    }).observe(pista);

    var suspende = function () { pausa = 1500; };
    pista.addEventListener('wheel', suspende, { passive: true });
    pista.addEventListener('touchstart', suspende, { passive: true });
    pista.addEventListener('touchmove', suspende, { passive: true });
    pista.addEventListener('touchend', function () { pausa = 2500; }, { passive: true });
    pista.addEventListener('mouseenter', function () { sobre = true; });
    pista.addEventListener('mouseleave', function () { sobre = false; });
    pista.addEventListener('focusin', function () { sobre = true; });
    pista.addEventListener('focusout', function () { sobre = false; });

    var agarrado = false, partidaX = 0, partidaScroll = 0;
    pista.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      agarrado = true; partidaX = e.clientX; partidaScroll = pista.scrollLeft;
      pista.classList.add('is-agarrada');
      pista.setPointerCapture(e.pointerId);
    });
    pista.addEventListener('pointermove', function (e) {
      if (!agarrado) return;
      e.preventDefault();
      pista.scrollLeft = partidaScroll - (e.clientX - partidaX);
    });
    var larga = function (e) {
      if (!agarrado) return;
      agarrado = false;
      pista.classList.remove('is-agarrada');
      try { pista.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    pista.addEventListener('pointerup', larga);
    pista.addEventListener('pointercancel', larga);
  })();

  /* ---------- VISOR ----------
     Cada série é uma lista de [nome da foto, legenda]. O visor mostra
     sempre o ficheiro original (assets/img/<nome>.jpg), nunca maior do que
     ele é; a fita usa as cópias de 800 px. Os nomes são os de assets/img. */
  var SERIES = {
    fora: { titulo: 'Exterior', fotos: [
      ['hero-piscina', 'A piscina, a casa de pedra e o vale'],
      ['piscina-montanhas', 'A piscina, com a casa e a pérgola ao fundo'],
      ['piscina-espreguicadeiras', 'As espreguiçadeiras ao longo da piscina'],
      ['pergola', 'A pérgola, com mesa e cadeiras, ao pé da água'],
      ['jardim-relvado', 'O relvado à sombra, com a piscina ao fundo'],
      ['alpendre-churrasqueira', 'A churrasqueira debaixo do alpendre'],
      ['alpendre-mesa', 'A mesa comprida do alpendre'],
      ['alpendre-matraquilhos', 'Os matraquilhos, no alpendre'],
      ['alpendre-lenha', 'O alpendre de madeira e a lenha'],
      ['casa-fachada', 'A fachada de pedra e as portadas'],
      ['casa-pedra', 'As paredes de granito'],
      ['casa-alpendre', 'A casa e o alpendre, vistos do relvado'],
      ['jardim-baloicos', 'Os baloiços do jardim'],
      ['vista-rede', 'A cama de rede, com a serra em frente'],
      ['vista-vale', 'O vale e os montes, vistos da casa'],
      ['vista-sul', 'A vista para sul, sobre os telhados da aldeia']
    ] },
    sala: { titulo: 'A sala', fotos: [
      ['sala-lareira', 'A lareira a lenha e os sofás'],
      ['sala-pedra', 'A sala, com a parede de pedra e a escada de madeira']
    ] },
    mesa: { titulo: 'A mesa', fotos: [
      ['mesa-renda', 'A mesa de refeições, com toalha de renda'],
      ['mesa-cristaleira', 'O aparador e a cristaleira; a cozinha ao fundo']
    ] },
    cozinha: { titulo: 'A cozinha', fotos: [
      ['cozinha', 'A cozinha, com bancada em L e máquina de café'],
      ['cozinha-frente', 'A cozinha vista de frente']
    ] },
    cima: { titulo: 'O mezanino', fotos: [
      ['mezanino', 'O mezanino, com a claraboia e a secretária'],
      ['mezanino-sofa', 'O sofá do mezanino, sob o teto de madeira']
    ] },
    q0: { titulo: 'Quarto 1', fotos: [
      ['quarto-flores-cabeceira', 'A cama e a janela'],
      ['quarto-flores', 'Cama de casal e roupeiro de madeira']
    ] },
    q1: { titulo: 'Quarto 2', fotos: [
      ['quarto-vermelho', 'Cama de casal'],
      ['quarto-vermelho-janela', 'O quarto visto da porta']
    ] },
    q2: { titulo: 'Quarto 3', fotos: [
      ['quarto-telhado-janela', 'A porta-janela para o terraço'],
      ['quarto-telhado', 'Sob o teto de madeira'],
      ['terraco-quarto', 'O terraço do quarto']
    ] }
  };

  var visor = $('#visor');
  var vImg = $('#visorImg');
  var vTitulo = $('#visorTitulo');
  var vConta = $('#visorConta');
  var vLegenda = $('#visorLegenda');
  var vFita = $('#visorFita');
  var serie = null, atual = 0, origem = null;

  function mostra(i, sem) {
    var f = serie.fotos;
    atual = (i + f.length) % f.length;
    var n = f[atual][0];
    var troca = function () {
      vImg.src = 'assets/img/' + n + '.jpg';
      vImg.alt = f[atual][1];
      vImg.classList.remove('is-a-trocar');
    };
    if (sem) troca(); else { vImg.classList.add('is-a-trocar'); setTimeout(troca, 180); }
    vConta.textContent = (atual + 1) + ' / ' + f.length;
    vLegenda.textContent = f[atual][1];
    $$('button', vFita).forEach(function (b, k) {
      b.classList.toggle('is-atual', k === atual);
      if (k === atual) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: sem ? 'auto' : 'smooth' });
    });
  }
  function abreVisor(nomeSerie, foto, de) {
    serie = SERIES[nomeSerie];
    if (!serie) return;
    origem = de;
    vTitulo.textContent = serie.titulo;
    vFita.innerHTML = '';
    serie.fotos.forEach(function (f, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Fotografia ' + (k + 1) + ': ' + f[1]);
      b.innerHTML = '<img src="assets/img/' + f[0] + '-800.jpg" alt="" loading="lazy">';
      b.addEventListener('click', function () { mostra(k); });
      vFita.appendChild(b);
    });
    var i = 0;
    serie.fotos.forEach(function (f, k) { if (f[0] === foto) i = k; });
    visor.hidden = false;
    visor.classList.add('is-a-abrir');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    mostra(i, true);
    $('#visorFechar').focus();
  }
  function fechaVisor() {
    visor.hidden = true;
    visor.classList.remove('is-a-abrir');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    if (origem) origem.focus({ preventScroll: true });
  }
  $$('[data-serie]').forEach(function (b) {
    b.addEventListener('click', function () {
      abreVisor(b.getAttribute('data-serie'), b.getAttribute('data-foto'), b);
    });
  });
  $('#visorFechar').addEventListener('click', fechaVisor);
  $('#visorAnt').addEventListener('click', function () { mostra(atual - 1); });
  $('#visorSeg').addEventListener('click', function () { mostra(atual + 1); });
  visor.addEventListener('click', function (e) { if (e.target === visor || e.target.id === 'visorPalco') fechaVisor(); });
  document.addEventListener('keydown', function (e) {
    if (visor.hidden) return;
    if (e.key === 'Escape') fechaVisor();
    else if (e.key === 'ArrowLeft') mostra(atual - 1);
    else if (e.key === 'ArrowRight') mostra(atual + 1);
    else if (e.key === 'Tab') {
      // o foco não sai do visor
      var foc = $$('button', visor).filter(function (b) { return b.offsetParent !== null; });
      var p = foc[0], u = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); }
      else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
    }
  });
  var tx = null;
  $('#visorPalco').addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  $('#visorPalco').addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) mostra(atual + (dx < 0 ? 1 : -1));
    tx = null;
  });

  $('#ano').textContent = new Date().getFullYear();
})();
