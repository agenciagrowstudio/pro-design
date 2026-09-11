/* =========================================================
   PRODESIGN Painting and Remodeling
   1. Video controlado pelo scroll (GSAP ScrollTrigger)
   2. Cabecalho e menu
   3. Rolagem suave das ancoras
   4. Link ativo por secao
   5. Filtros da galeria
   6. FAQ em acordeao
   7. Formulario de orcamento
   ========================================================= */
(function () {
  'use strict';

  var reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var telaPequena = window.matchMedia('(max-width: 760px)').matches;

  /* =======================================================
     1. VIDEO CONTROLADO PELO SCROLL
     O frame do video acompanha a posicao do scroll dentro do
     palco (#stage), que cobre a tela do hero e a tela seguinte.
     Ao terminar o palco o video ja esta no ultimo frame e a
     pagina segue normal ate o formulario de contato.
     ======================================================= */
  var video = document.getElementById('heroVideo');
  var stage = document.getElementById('stage');
  var scrim = document.querySelector('.stage__scrim');
  var barra = document.getElementById('progressBar');
  var pct = document.getElementById('progressPct');

  // Executa um listener uma unica vez e devolve a funcao usada
  function umaVez(alvo, evento, fn, opcoes) {
    var wrapper = function () {
      alvo.removeEventListener(evento, wrapper);
      fn.apply(this, arguments);
    };
    alvo.addEventListener(evento, wrapper, opcoes);
    return wrapper;
  }

  // Roda assim que a duracao do video for conhecida. Com o arquivo
  // em cache os metadados chegam antes do script, e nesse caso o
  // evento loadedmetadata nunca dispara: sem esta checagem a
  // timeline ficaria vazia e o video travaria no ultimo frame.
  function comMetadados(alvo, fn) {
    if (alvo.readyState >= 1 && alvo.duration) {
      fn();
      return;
    }
    umaVez(alvo, 'loadedmetadata', fn);
  }

  function atualizarProgresso(p) {
    var valor = Math.max(0, Math.min(1, p));
    if (barra) barra.style.height = (valor * 100).toFixed(1) + '%';
    if (pct) pct.textContent = Math.round(valor * 100);

    // A sobreposicao existe para o texto do hero. Quando o cartao da
    // oferta entra, ela sai de cena e o video aparece limpo.
    if (scrim) {
      var saida = Math.max(0, Math.min(1, (valor - 0.4) / 0.3));
      scrim.style.opacity = (1 - saida * 0.92).toFixed(3);
    }
  }

  /* No celular a passagem da obra bruta para a casa pronta e um
     cruzamento de duas imagens, comandado pela rolagem dentro do
     palco. Sem isso a segunda tela entrava de corte seco. */
  function trocaDeCenaNoCelular() {
    var cena2 = document.querySelector('.stage__cena2');
    if (!cena2 || !stage) return;

    var pendente = false;

    function medir() {
      pendente = false;

      var curso = stage.offsetHeight - window.innerHeight;
      if (curso <= 0) return;

      var andado = (window.scrollY || window.pageYOffset) - stage.offsetTop;
      var progresso = Math.max(0, Math.min(1, andado / curso));

      // A troca acontece no miolo do palco: antes disso a obra
      // bruta fica inteira, depois a casa pronta fica inteira.
      var mistura = Math.max(0, Math.min(1, (progresso - 0.3) / 0.45));

      cena2.style.setProperty('--cena2', mistura.toFixed(3));
      atualizarProgresso(progresso);

      // O veu existe para o texto do hero. Quando a casa pronta
      // entra, quem carrega o cupom e o proprio cartao escuro:
      // manter o veu so sujaria a cena.
      if (scrim) scrim.style.opacity = (1 - mistura).toFixed(3);
    }

    window.addEventListener('scroll', function () {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(medir);
    }, { passive: true });

    window.addEventListener('resize', medir);
    medir();
  }

  function iniciarVideo() {
    if (!video || !stage) return;

    // No celular o hero e uma imagem fixa, definida no CSS. O seek
    // quadro a quadro nao fica fluido em aparelho movel e ainda
    // custaria alguns megabytes de rede. No lugar do video, a
    // rolagem faz a segunda cena aparecer por cima da primeira.
    if (telaPequena) {
      video.remove();
      trocaDeCenaNoCelular();
      return;
    }

    // A fonte fica no data-src, e nao no src, para o download so
    // comecar depois desta decisao.
    var fonte = video.getAttribute('data-src');
    if (!fonte) return;
    video.setAttribute('src', fonte);

    if (reduzirMovimento || !window.gsap || !window.ScrollTrigger) {
      // Sem animacao: mostra o primeiro frame parado
      comMetadados(video, function () { video.currentTime = 0; });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // No celular a barra de endereco aparece e some durante a
    // rolagem e muda a altura da viewport. Sem isto o ScrollTrigger
    // recalcularia tudo no meio do movimento e o video saltaria.
    ScrollTrigger.config({ ignoreMobileResize: true });

    var linha = gsap.timeline({
      defaults: { duration: 1 },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: function (self) { atualizarProgresso(self.progress); }
      }
    });

    comMetadados(video, function () {
      linha.fromTo(video, { currentTime: 0 }, { currentTime: video.duration || 1 });
      ScrollTrigger.refresh();
    });

    // Fontes e imagens mudam alturas depois do primeiro calculo
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });

    // Garante que o iOS considere o video "ativado" e permita o seek
    umaVez(document.documentElement, 'touchstart', function () {
      video.play().then(function () { video.pause(); }).catch(function () {});
    });

    // Baixa o arquivo inteiro e passa a ler de um blob local.
    // Sem isso cada seek dispara uma requisicao por range e o
    // scrub fica travado nas primeiras rolagens.
    setTimeout(function () {
      var fonte = video.currentSrc || video.src;
      if (!fonte || !window.fetch) return;

      fetch(fonte)
        .then(function (r) { return r.blob(); })
        .then(function (blob) {
          var urlBlob = URL.createObjectURL(blob);
          var t = video.currentTime;

          umaVez(document.documentElement, 'touchstart', function () {
            video.play().then(function () { video.pause(); }).catch(function () {});
          });

          video.setAttribute('src', urlBlob);
          video.currentTime = t + 0.01;
          ScrollTrigger.refresh();
        })
        .catch(function () { /* mantem a fonte original */ });
    }, 1000);
  }

  /* =======================================================
     2. IDIOMA
     O site nasce em ingles. Ao passar para portugues o script
     percorre os nos de texto da pagina e troca cada trecho que
     estiver no dicionario de js/pt.js. O texto original fica
     guardado no proprio no, entao voltar ao ingles e so
     restaurar, sem precisar de um segundo dicionario.
     ======================================================= */
  var dicionario = window.TRADUCAO_PT || {};
  var seletorIdioma = document.querySelector('.idioma');
  var CHAVE_IDIOMA = 'prodesign-idioma';
  var idiomaAtual = 'en';

  // Texto que o script escreve na hora, e nao o que ja esta no
  // HTML, precisa ser refeito quando o idioma muda. Quem gera
  // texto assim se inscreve aqui.
  var aoTrocarIdioma = [];

  // Guarda o texto em ingles na primeira troca
  var originais = new WeakMap();

  // Atributos que carregam texto visivel ou lido em voz alta
  var ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'content'];

  function textoDaPagina() {
    var nos = [];
    var caminhante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (no) {
        var pai = no.parentNode;
        if (!pai) return NodeFilter.FILTER_REJECT;
        var tag = pai.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        // Texto que o proprio script escreve ja sai no idioma
        // certo: passar por aqui so o marcaria como sem traducao
        if (pai.closest && pai.closest('[data-sem-traducao]')) return NodeFilter.FILTER_REJECT;
        return no.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var atual;
    while ((atual = caminhante.nextNode())) nos.push(atual);
    return nos;
  }

  // Um paragrafo quebrado em varias linhas no HTML chega aqui com
  // as quebras e a indentacao no meio do texto. A chave do
  // dicionario e sempre a versao de uma linha so.
  function normalizar(texto) {
    return texto.replace(/\s+/g, ' ').trim();
  }

  window.TRADUCAO_FALTANDO = [];

  function trocarTexto(no, paraPortugues) {
    if (!originais.has(no)) originais.set(no, no.nodeValue);
    var original = originais.get(no);

    if (!paraPortugues) {
      no.nodeValue = original;
      return;
    }

    var chave = normalizar(original);
    if (!chave) return;

    var traducao = dicionario[chave];
    if (!traducao) {
      // Fica registrado para quem for dar manutencao, sem sujar
      // o console de quem so esta visitando o site
      if (window.TRADUCAO_FALTANDO.indexOf(chave) === -1) {
        window.TRADUCAO_FALTANDO.push(chave);
      }
      return;
    }

    // O espaco em volta e da diagramacao do HTML e precisa ficar
    var antes = original.match(/^\s*/)[0];
    var depois = original.match(/\s*$/)[0];
    no.nodeValue = antes + traducao + depois;
  }

  function trocarAtributos(paraPortugues) {
    ATRIBUTOS.forEach(function (attr) {
      document.querySelectorAll('[' + attr + ']').forEach(function (el) {
        var guardado = el.getAttribute('data-orig-' + attr);
        var atual = el.getAttribute(attr);

        if (guardado === null) {
          el.setAttribute('data-orig-' + attr, atual);
          guardado = atual;
        }

        if (!paraPortugues) {
          el.setAttribute(attr, guardado);
          return;
        }
        var traducao = dicionario[normalizar(guardado)];
        if (traducao) el.setAttribute(attr, traducao);
      });
    });
  }

  function aplicarIdioma(idioma) {
    var pt = idioma === 'pt';
    idiomaAtual = idioma;

    textoDaPagina().forEach(function (no) { trocarTexto(no, pt); });
    trocarAtributos(pt);

    var titulo = document.querySelector('title');
    if (titulo) trocarTexto(titulo.firstChild, pt);

    document.documentElement.setAttribute('lang', pt ? 'pt-BR' : 'en');

    if (seletorIdioma) {
      seletorIdioma.setAttribute('data-ativo', idioma);
      seletorIdioma.querySelectorAll('.idioma__op').forEach(function (b) {
        var ativo = b.getAttribute('data-idioma') === idioma;
        b.classList.toggle('is-ativa', ativo);
        b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      });
    }

    aoTrocarIdioma.forEach(function (fn) { fn(idioma); });

    try { localStorage.setItem(CHAVE_IDIOMA, idioma); } catch (e) { /* navegacao privada */ }
  }

  if (seletorIdioma) {
    seletorIdioma.addEventListener('click', function (e) {
      var botao = e.target.closest('.idioma__op');
      if (!botao) return;
      aplicarIdioma(botao.getAttribute('data-idioma'));
    });

    var salvo = null;
    try { salvo = localStorage.getItem(CHAVE_IDIOMA); } catch (e) { /* sem acesso */ }
    if (salvo === 'pt') aplicarIdioma('pt');
    else seletorIdioma.setAttribute('data-ativo', 'en');
  }

  /* =======================================================
     3. AVISOS DO TOPO
     No celular os quatro avisos nao cabem lado a lado, entao
     passam um de cada vez. Para o rodizio quando o dedo ou o
     teclado encostam na barra, e nao roda para quem pede menos
     movimento.
     ======================================================= */
  var listaAvisos = document.getElementById('avisos');

  if (listaAvisos && telaPequena) {
    var avisos = Array.prototype.slice.call(listaAvisos.querySelectorAll('.aviso'));

    if (avisos.length > 1) {
      var vezAviso = 0;
      var relogioAvisos = null;
      var INTERVALO = 4200;

      function mostrarAviso(i) {
        avisos.forEach(function (a, n) { a.classList.toggle('is-ativo', n === i); });
      }

      function rodar() {
        if (reduzirMovimento) return;
        parar();
        relogioAvisos = setInterval(function () {
          vezAviso = (vezAviso + 1) % avisos.length;
          mostrarAviso(vezAviso);
        }, INTERVALO);
      }

      function parar() {
        if (relogioAvisos) clearInterval(relogioAvisos);
        relogioAvisos = null;
      }

      mostrarAviso(0);
      rodar();

      // Quem parou para ler ou tocou num telefone nao quer que a
      // barra troque no meio
      listaAvisos.addEventListener('pointerenter', parar);
      listaAvisos.addEventListener('pointerleave', rodar);
      listaAvisos.addEventListener('focusin', parar);
      listaAvisos.addEventListener('focusout', rodar);

      // Fora da aba, o rodizio nao precisa continuar
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) parar();
        else rodar();
      });
    }
  }

  /* =======================================================
     4. CABECALHO E MENU
     ======================================================= */
  var header = document.getElementById('header');
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');

  function aoRolar() {
    var y = window.scrollY || window.pageYOffset;
    document.body.classList.toggle('is-scrolled', y > 24);

    if (!header) return;

    if (stage) {
      var limite = stage.offsetTop + stage.offsetHeight - header.offsetHeight - 8;
      var fimDoPalco = y >= limite;

      header.classList.toggle('is-solid', fimDoPalco);

      // Visivel parado no topo, escondido enquanto o video roda,
      // de volta ja em fundo claro quando o palco termina.
      header.classList.toggle('is-hidden', y > 24 && !fimDoPalco);
    } else {
      // Sem o palco do video o cabecalho fica sempre sobre fundo claro
      header.classList.add('is-solid');
      header.classList.remove('is-hidden');
    }
  }

  function fecharMenu() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('is-locked');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var aberto = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      burger.setAttribute('aria-label', aberto ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', aberto);
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) fecharMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fecharMenu();
    });
  }

  /* =======================================================
     5. ROLAGEM SUAVE DAS ANCORAS
     Feita aqui, e nao com scroll-behavior no CSS, porque a
     rolagem animada por CSS atrapalha as medicoes do
     ScrollTrigger e desalinha o video do hero.
     ======================================================= */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var id = link.getAttribute('href');
    if (!id || id.length < 2) return;

    var alvo = document.querySelector(id);
    if (!alvo) return;

    e.preventDefault();

    var folga = header ? header.offsetHeight + 8 : 0;
    var destino = Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - folga);

    window.scrollTo({
      top: destino,
      behavior: reduzirMovimento ? 'auto' : 'smooth'
    });

    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* =======================================================
     6. LINK ATIVO CONFORME A SECAO NA TELA
     ======================================================= */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var alvos = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && alvos.length) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var id = '#' + entrada.target.id;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    alvos.forEach(function (secao) { observador.observe(secao); });
  }

  /* =======================================================
     7. GALERIA POR CATEGORIA
     Cada cartao guarda a propria lista de fotos em uma <ul>
     escondida. O visualizador e um so, e e montado na hora com
     a lista do cartao que foi aberto.
     ======================================================= */
  var visor = document.getElementById('visor');
  var visorImg = document.getElementById('visorImg');
  var visorTitulo = document.getElementById('visorTitulo');
  var visorContador = document.getElementById('visorContador');
  var visorPontos = document.getElementById('visorPontos');

  var album = [];
  var indice = 0;
  var origem = null;

  function lerFotos(cartao) {
    var itens = cartao.querySelectorAll('.cat__fotos li');
    return Array.prototype.map.call(itens, function (li) {
      return {
        src: li.getAttribute('data-src'),
        alt: li.getAttribute('data-alt') || ''
      };
    }).filter(function (f) { return f.src; });
  }

  function montarPontos() {
    visorPontos.innerHTML = '';
    album.forEach(function (_, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'visor__ponto';
      b.setAttribute('aria-label', 'Photo ' + (i + 1));
      b.addEventListener('click', function () { mostrar(i); });
      li.appendChild(b);
      visorPontos.appendChild(li);
    });
  }

  function mostrar(i) {
    if (!album.length) return;
    // Circular: do ultimo volta para o primeiro
    indice = (i + album.length) % album.length;

    var foto = album[indice];
    visorImg.setAttribute('src', foto.src);
    visorImg.setAttribute('alt', foto.alt);
    visorContador.textContent = (indice + 1) + ' / ' + album.length;

    visorPontos.querySelectorAll('.visor__ponto').forEach(function (b, n) {
      b.classList.toggle('is-ativa', n === indice);
      if (n === indice) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function abrirVisor(cartao, botao) {
    album = lerFotos(cartao);
    if (!album.length) return;

    origem = botao;
    visorTitulo.textContent = botao.getAttribute('data-cat-nome') || '';
    visor.classList.toggle('tem-uma', album.length < 2);
    montarPontos();
    mostrar(0);

    visor.hidden = false;
    document.body.classList.add('visor-aberto');
    var fechar = visor.querySelector('.visor__fechar');
    if (fechar) fechar.focus();
  }

  function fecharVisor() {
    if (visor.hidden) return;
    visor.hidden = true;
    document.body.classList.remove('visor-aberto');
    visorImg.removeAttribute('src');
    // O foco volta para o cartao que abriu, senao ele cairia no topo
    if (origem) origem.focus();
    origem = null;
  }

  if (visor) {
    document.querySelectorAll('.cat').forEach(function (cartao) {
      var botao = cartao.querySelector('.cat__btn');
      var qtd = cartao.querySelector('.cat__qtd');
      var fotos = lerFotos(cartao);

      // O contador sai da propria lista: assim nao ha numero
      // escrito na mao para desencontrar quando as fotos mudarem.
      function escreverContador(idioma) {
        if (!qtd) return;
        var unidade = idioma === 'pt'
          ? (fotos.length === 1 ? ' foto' : ' fotos')
          : (fotos.length === 1 ? ' photo' : ' photos');
        qtd.textContent = fotos.length + unidade;
      }

      escreverContador(idiomaAtual);
      aoTrocarIdioma.push(escreverContador);
      if (!botao || !fotos.length) return;

      botao.addEventListener('click', function () { abrirVisor(cartao, botao); });

      // Passar o mouse folheia as fotos da categoria na propria
      // capa. As imagens so sao baixadas no primeiro hover, para
      // nao custar nada a quem apenas rola a pagina.
      var capa = cartao.querySelector('.cat__img');
      if (!capa || fotos.length < 2 || reduzirMovimento) return;

      var original = capa.getAttribute('src');
      var relogio = null;
      var vez = 0;
      var carregadas = false;

      function preCarregar() {
        if (carregadas) return;
        carregadas = true;
        fotos.forEach(function (f) { new Image().src = f.src; });
      }

      function trocar(src) {
        capa.style.opacity = '0';
        setTimeout(function () {
          capa.setAttribute('src', src);
          capa.style.opacity = '';
        }, 180);
      }

      botao.addEventListener('mouseenter', function () {
        preCarregar();
        vez = 0;
        relogio = setInterval(function () {
          vez = (vez + 1) % fotos.length;
          trocar(fotos[vez].src);
        }, 1100);
      });

      botao.addEventListener('mouseleave', function () {
        clearInterval(relogio);
        relogio = null;
        if (capa.getAttribute('src') !== original) trocar(original);
      });
    });

    visor.querySelectorAll('[data-fechar]').forEach(function (el) {
      el.addEventListener('click', fecharVisor);
    });

    visor.querySelectorAll('[data-passo]').forEach(function (el) {
      el.addEventListener('click', function () {
        mostrar(indice + parseInt(el.getAttribute('data-passo'), 10));
      });
    });

    document.addEventListener('keydown', function (e) {
      if (visor.hidden) return;
      if (e.key === 'Escape') fecharVisor();
      else if (e.key === 'ArrowRight') mostrar(indice + 1);
      else if (e.key === 'ArrowLeft') mostrar(indice - 1);
    });

    // Arrastar o dedo troca a foto no celular
    var toqueX = null;
    visor.addEventListener('touchstart', function (e) {
      toqueX = e.changedTouches[0].clientX;
    }, { passive: true });

    visor.addEventListener('touchend', function (e) {
      if (toqueX === null) return;
      var distancia = e.changedTouches[0].clientX - toqueX;
      toqueX = null;
      if (Math.abs(distancia) > 45) mostrar(indice + (distancia < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* =======================================================
     8. CONTAGEM DOS NUMEROS
     Sobem de zero ate o valor quando a faixa entra na tela,
     uma vez so. Quem pede menos movimento ve o numero final
     direto, sem contagem.
     ======================================================= */
  var numeros = document.querySelectorAll('.stats__num');

  function contar(alvo) {
    // O primeiro no e o numero; o <span> ao lado guarda o sinal
    var no = alvo.firstChild;
    if (!no || no.nodeType !== 3) return;

    var destino = parseInt(no.nodeValue.replace(/\D/g, ''), 10);
    if (isNaN(destino)) return;

    var duracao = 1400;
    var inicio = null;

    function passo(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min(1, (agora - inicio) / duracao);
      // Desacelera no fim, para o numero assentar em vez de parar seco
      var suave = 1 - Math.pow(1 - t, 3);
      no.nodeValue = String(Math.round(destino * suave));
      if (t < 1) requestAnimationFrame(passo);
    }

    no.nodeValue = '0';
    requestAnimationFrame(passo);
  }

  if (numeros.length && !reduzirMovimento && 'IntersectionObserver' in window) {
    var olho = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        olho.unobserve(entrada.target);
        contar(entrada.target);
      });
    }, { threshold: 0.6 });

    numeros.forEach(function (n) { olho.observe(n); });
  }

  /* =======================================================
     9. MURAL DOS DEPOIMENTOS
     As fotos assentam uma a uma, em ordem sorteada, quando a
     secao chega na tela. Depois disso cada foto acompanha o
     cursor de leve, como um ima de alcance curto.
     ======================================================= */
  var mural = document.querySelector('.depo__mural');

  if (mural && !reduzirMovimento) {
    var fotosMural = Array.prototype.slice.call(mural.querySelectorAll('img'));

    // Cada foto recebe o proprio atraso: em ordem elas entrariam
    // como uma cortina, e a ideia e parecer que foram colocadas
    // na parede uma de cada vez.
    fotosMural.forEach(function (foto) {
      foto.style.transitionDelay = (Math.random() * 0.5).toFixed(2) + 's';
    });

    if ('IntersectionObserver' in window) {
      var olhoMural = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          olhoMural.unobserve(entrada.target);
          mural.classList.add('is-dentro');

          // O atraso serviu para a entrada. Mantido, ele atrasaria
          // tambem a resposta ao cursor.
          setTimeout(function () {
            fotosMural.forEach(function (foto) { foto.style.transitionDelay = ''; });
          }, 1400);
        });
      }, { threshold: 0.15 });

      olhoMural.observe(mural);
    } else {
      mural.classList.add('is-dentro');
    }

    // Ima: a foto anda no maximo alguns pixels na direcao do
    // cursor, e volta sozinha quando ele sai.
    var ALCANCE = 14;

    fotosMural.forEach(function (foto) {
      foto.addEventListener('mousemove', function (e) {
        var caixa = foto.getBoundingClientRect();
        var x = (e.clientX - caixa.left) / caixa.width - 0.5;
        var y = (e.clientY - caixa.top) / caixa.height - 0.5;
        foto.style.transform =
          'translate(' + (x * ALCANCE).toFixed(1) + 'px, ' +
          (y * ALCANCE).toFixed(1) + 'px) scale(1.03)';
      });

      foto.addEventListener('mouseleave', function () {
        foto.style.transform = '';
      });
    });
  }

  /* =======================================================
     10. TITULOS: entrada e paralaxe
     Cada titulo sobe alguns pixels ao aparecer e, depois disso,
     acompanha a rolagem com um deslocamento curto. O movimento
     e pequeno de proposito: e para dar profundidade, nao para
     chamar atencao.
     ======================================================= */
  var titulos = Array.prototype.slice.call(
    document.querySelectorAll('.section__title, .depo__titulo, .section__head .eyebrow, .depo__centro .pill')
  );
  var titulosNaTela = [];

  if (titulos.length && !reduzirMovimento && 'IntersectionObserver' in window) {
    var olhoTitulos = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        var alvo = entrada.target;

        if (entrada.isIntersecting) {
          if (!alvo.classList.contains('is-dentro')) {
            alvo.classList.add('is-dentro');
            // Solta o transform da transicao: dai em diante quem
            // manda nele e a rolagem, e ela precisa de resposta
            // imediata.
            setTimeout(function () { alvo.classList.add('is-pronto'); }, 900);
          }
          if (titulosNaTela.indexOf(alvo) === -1) titulosNaTela.push(alvo);
        } else {
          var i = titulosNaTela.indexOf(alvo);
          if (i > -1) titulosNaTela.splice(i, 1);
        }
      });
    }, { threshold: 0 });

    titulos.forEach(function (t) { olhoTitulos.observe(t); });

    // No celular a paralaxe fica de fora. A barra de endereco
    // aparece e some durante a rolagem, a altura da tela muda no
    // meio do movimento e o titulo dava um solavanco a cada
    // mudanca, como se estivesse orbitando.
    var AMPLITUDE = telaPequena ? 0 : 12;
    var pendente = false;

    function moverTitulos() {
      pendente = false;
      var meio = window.innerHeight / 2;

      titulosNaTela.forEach(function (t) {
        if (!t.classList.contains('is-pronto')) return;
        var caixa = t.getBoundingClientRect();
        var centro = caixa.top + caixa.height / 2;
        // -1 no topo da tela, +1 embaixo
        var posicao = Math.max(-1, Math.min(1, (centro - meio) / meio));
        t.style.setProperty('--par', (posicao * AMPLITUDE).toFixed(1) + 'px');
      });
    }

    if (!telaPequena) {
      window.addEventListener('scroll', function () {
        if (pendente) return;
        pendente = true;
        requestAnimationFrame(moverTitulos);
      }, { passive: true });

      moverTitulos();
    }
  }

  /* =======================================================
     11. FAQ: uma pergunta aberta por vez
     ======================================================= */
  var perguntas = Array.prototype.slice.call(document.querySelectorAll('.qa'));

  // O <details> abre e fecha de uma vez, sem meio termo. Aqui o
  // clique e interceptado para a resposta crescer e encolher em
  // altura, com o texto entrando um pouco depois.
  function animarAbertura(item, abrir, aoTerminar) {
    var caixa = item.querySelector('.qa__a');
    if (!caixa || reduzirMovimento || !item.animate) {
      item.open = abrir;
      if (aoTerminar) aoTerminar();
      return;
    }

    // Enquanto anima, a altura e controlada aqui: sem isso o
    // conteudo empurraria a pagina de uma vez so.
    if (abrir) item.open = true;

    var altura = caixa.scrollHeight;
    // O respiro de baixo entra e sai junto com a altura, senao o
    // fechamento para nele e o ultimo trecho some de uma vez.
    var respiro = getComputedStyle(caixa).paddingBottom;

    item.classList.add('is-animando');

    var animacao = caixa.animate(
      [
        { height: (abrir ? 0 : altura) + 'px', paddingBottom: abrir ? '0px' : respiro, opacity: abrir ? 0 : 1 },
        { height: (abrir ? altura : 0) + 'px', paddingBottom: abrir ? respiro : '0px', opacity: abrir ? 1 : 0 }
      ],
      { duration: abrir ? 380 : 300, easing: 'cubic-bezier(.22,.61,.36,1)' }
    );

    animacao.onfinish = function () {
      item.classList.remove('is-animando');
      if (!abrir) item.open = false;
      if (aoTerminar) aoTerminar();
    };
  }

  perguntas.forEach(function (item) {
    var titulo = item.querySelector('.qa__q');
    if (!titulo) return;

    titulo.addEventListener('click', function (e) {
      e.preventDefault();

      // Uma aberta por vez: a que estava aberta fecha junto
      if (!item.open) {
        perguntas.forEach(function (outro) {
          if (outro !== item && outro.open) animarAbertura(outro, false);
        });
      }

      animarAbertura(item, !item.open);
    });
  });

  /* =======================================================
     12. FORMULARIOS DE ORCAMENTO
     Vale para os dois: o curto, no canhoto do cupom, e o
     completo, na secao Contact. Sem backend, monta a mensagem
     e abre o cliente de email. Com data-endpoint preenchido,
     envia por POST.
     ======================================================= */
  var EMAIL_DESTINO = 'contact@prodesignpainting.com';

  function marcarErro(campo, erro) {
    var caixa = campo.closest('.field');
    if (caixa) caixa.classList.toggle('has-error', erro);
  }

  function validar(form) {
    var ok = true;

    form.querySelectorAll('[required]').forEach(function (campo) {
      var vazio = !campo.value.trim();
      marcarErro(campo, vazio);
      if (vazio) ok = false;
    });

    var email = form.querySelector('input[type="email"]');
    if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      marcarErro(email, true);
      ok = false;
    }

    return ok;
  }

  function ligarFormulario(form) {
    var aviso = form.querySelector('.form__done');

    form.addEventListener('input', function (e) {
      if (e.target.closest('.field.has-error')) marcarErro(e.target, false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validar(form)) {
        var primeiro = form.querySelector('.field.has-error input, .field.has-error select');
        if (primeiro) primeiro.focus();
        return;
      }

      var dados = new FormData(form);
      var endpoint = form.getAttribute('data-endpoint');

      var linhas = [
        'Name: ' + (dados.get('name') || ''),
        'Phone: ' + (dados.get('phone') || ''),
        'Email: ' + (dados.get('email') || ''),
        'Service: ' + (dados.get('service') || ''),
        'First-project discount: ' + (dados.get('promo') ? 'yes' : 'no'),
        '',
        'Project details:',
        (dados.get('message') || '')
      ].join('\n');

      function concluir() {
        if (aviso) aviso.hidden = false;
        form.reset();
      }

      if (endpoint) {
        fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: dados
        }).then(concluir).catch(concluir);
        return;
      }

      var assunto = 'Free estimate request: ' + (dados.get('service') || 'PRODESIGN');
      window.location.href = 'mailto:' + EMAIL_DESTINO +
        '?subject=' + encodeURIComponent(assunto) +
        '&body=' + encodeURIComponent(linhas);
      concluir();
    });
  }

  document.querySelectorAll('form.form').forEach(ligarFormulario);

  /* =======================================================
     Inicializacao
     ======================================================= */
  var ano = document.getElementById('year');
  if (ano) ano.textContent = new Date().getFullYear();

  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRolar);
  aoRolar();
  iniciarVideo();
})();
