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

  function iniciarVideo() {
    if (!video || !stage) return;

    // Em tela pequena o navegador limita o seek por scroll.
    // Nesse caso o video roda em loop com o arquivo mais leve.
    var fonteMobile = video.getAttribute('data-src-mobile');
    if (telaPequena && fonteMobile) {
      video.setAttribute('src', fonteMobile);
      video.loop = true;
      video.autoplay = true;
      video.muted = true;
      video.play().catch(function () { /* autoplay bloqueado, fica o poster */ });
      return;
    }

    if (reduzirMovimento || !window.gsap || !window.ScrollTrigger) {
      // Sem animacao: mostra o primeiro frame parado
      comMetadados(video, function () { video.currentTime = 0; });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

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
     2. CABECALHO E MENU
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
     3. ROLAGEM SUAVE DAS ANCORAS
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
     4. LINK ATIVO CONFORME A SECAO NA TELA
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
     5. FILTROS DA GALERIA
     ======================================================= */
  var filtros = document.querySelectorAll('.filters__btn');
  var fotos = document.querySelectorAll('.shot');

  filtros.forEach(function (botao) {
    botao.addEventListener('click', function () {
      var alvo = botao.getAttribute('data-filter');

      filtros.forEach(function (b) {
        var ativo = b === botao;
        b.classList.toggle('is-active', ativo);
        b.setAttribute('aria-selected', ativo ? 'true' : 'false');
      });

      fotos.forEach(function (foto) {
        var mostrar = alvo === 'all' || foto.getAttribute('data-cat') === alvo;
        foto.classList.toggle('is-hidden', !mostrar);
      });

      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* =======================================================
     6. FAQ: uma pergunta aberta por vez
     ======================================================= */
  var perguntas = document.querySelectorAll('.qa');
  perguntas.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      perguntas.forEach(function (outro) {
        if (outro !== item) outro.open = false;
      });
    });
  });

  /* =======================================================
     7. FORMULARIO DE ORCAMENTO
     Sem backend: monta a mensagem e abre o cliente de email.
     Com data-endpoint preenchido, envia por POST.
     ======================================================= */
  var form = document.getElementById('estimateForm');
  var aviso = document.getElementById('formDone');
  var EMAIL_DESTINO = 'contact@prodesignpainting.com';

  function marcarErro(campo, erro) {
    var caixa = campo.closest('.field');
    if (caixa) caixa.classList.toggle('has-error', erro);
  }

  function validar() {
    var ok = true;
    var obrigatorios = form.querySelectorAll('[required]');

    obrigatorios.forEach(function (campo) {
      var vazio = !campo.value.trim();
      marcarErro(campo, vazio);
      if (vazio) ok = false;
    });

    var email = form.querySelector('#f-email');
    if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      marcarErro(email, true);
      ok = false;
    }

    return ok;
  }

  if (form) {
    form.addEventListener('input', function (e) {
      if (e.target.closest('.field.has-error')) marcarErro(e.target, false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validar()) {
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
