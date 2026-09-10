# PRODESIGN Painting and Remodeling

Site de página única, em inglês, para o mercado dos Estados Unidos. Sem framework e sem
build: são arquivos estáticos que rodam em qualquer hospedagem.

## Estrutura

```
index.html                      página inteira, com âncoras por seção
css/style.css                   folha única (tokens no :root)
js/main.js                      vídeo por scroll, menu, filtros, FAQ, formulário
assets/video/                   vídeo do hero (desktop e mobile)
assets/img/hero-poster.jpg      primeiro frame, exibido antes do vídeo carregar
assets/img/projects/            fotos reais dos projetos (ainda vazia)
assets/logo/                    marca em PNG (versão clara e escura) e favicon
tools/build-video.sh            prepara o vídeo para o scroll
.claude/launch.json             servidor local de desenvolvimento
```

## Seções e âncoras

O menu é de ancoragem, tudo na mesma página:

| Menu | Âncora | Observação |
|---|---|---|
| Home | `#home` | primeira tela, sobre o vídeo |
| (sem menu) | `#offer` | segunda tela, oferta de 10% no último frame |
| About | `#about` | primeira seção clara, com os padrões de trabalho |
| Services | `#services` | cinco serviços, uma cor por categoria |
| Photos | `#projects` | galeria com filtros |
| FAQ | `#faq` | acordeão |
| Get a free estimate | `#contact` | formulário |

A oferta de 10% fecha o scroll do vídeo: quando a casa aparece pronta, entra um ticket
escuro com o desconto, o código FIRST10 no canhoto e os dois botões. Os recortes do ticket
são furos reais, feitos com `mask` de gradientes radiais, porque o fundo é vídeo e muda de
cor a cada frame. A sombra fica no envoltório (`drop-shadow`), já que a máscara cortaria um
`box-shadow`. No celular o ticket empilha e a dobra vira a borda picotada do canhoto. Por isso não existe uma faixa de promoção separada no meio da página.

## O vídeo controlado pelo scroll

O bloco `#stage` tem duas telas de altura. O vídeo fica fixo ao fundo e o GSAP
ScrollTrigger liga a posição do scroll ao frame do vídeo: começa na estrutura bruta e
termina na sala acabada, exatamente quando a segunda tela sai. A segunda tela traz a
oferta de 10%. Dali em diante a página rola normalmente até o formulário de contato.

Detalhes que fazem isso funcionar:

- o vídeo é recodificado com **um keyframe em cada frame** (`-g 1`), senão o seek trava;
- depois de um segundo o arquivo é baixado inteiro e trocado por um blob local, o que
  elimina as requisições por range a cada movimento do scroll;
- em telas de até 760px o vídeo roda em loop com o arquivo mais leve, porque o navegador
  do celular limita o seek quadro a quadro;
- com `prefers-reduced-motion` o vídeo fica parado no primeiro frame;
- o tween só é registrado depois que a duração do vídeo é conhecida, e a checagem usa
  `readyState` em vez de esperar apenas o evento `loadedmetadata`: com o arquivo em cache o
  evento já passou quando o script roda, a timeline ficaria vazia e o vídeo travaria no
  último frame;
- a rolagem suave das âncoras é feita no JavaScript. `scroll-behavior: smooth` no CSS
  quebra o `ScrollTrigger.refresh()`, porque ele rola a página ao topo para medir e, com a
  rolagem animada, mede antes de chegar lá;
- a sobreposição escura existe para o texto do hero e desaparece conforme o scroll avança,
  então o cartão da oferta aparece sobre a imagem limpa. O véu do topo é separado
  (`.stage__media::after`) e permanece, porque garante a leitura do cabeçalho.

### Trocar o vídeo

```bash
bash tools/build-video.sh "/caminho/do/novo-video.mp4"
```

O script gera as duas versões (1280p e 854p, 30fps) e o poster. Nada mais precisa mudar
no HTML.

### Cabeçalho durante o vídeo

O cabeçalho fica visível parado no topo, sai de cena assim que a rolagem começa e volta
quando o palco termina, já em fundo claro. É a classe `is-hidden`, aplicada em `aoRolar()`
entre 24px de rolagem e o fim do palco.

## Fundo do ticket da oferta

`assets/img/offer-bg.jpg` é a arte que aparece atrás do "10% OFF". Ela fica só no corpo do
ticket; o canhoto do código continua sólido, o que reforça a divisão. O véu por cima é
horizontal no desktop (forte à esquerda, onde está o texto, quase transparente junto à
dobra) e vertical no celular, onde o ticket empilha e a área da imagem fica alta. Para
trocar a arte basta substituir o arquivo mantendo o nome.

## Fotos da galeria

As seis imagens em `assets/img/projects/` vêm do Pexels (licença livre, uso comercial
permitido, sem exigência de atribuição). São imagens de referência, não obras executadas
pela PRODESIGN, e a nota abaixo da galeria diz isso de forma explícita. Substitua por fotos
reais assim que o cliente enviar.

| Arquivo | Categoria | Pexels |
|---|---|---|
| `interior-refresh.jpg` | interior | 8583595 |
| `exterior-repaint.jpg` | exterior | 39447777 |
| `trim-and-moldings.jpg` | details | 9036949 |
| `ceilings-and-walls.jpg` | interior | 5691677 |
| `drywall-finishing.jpg` | details | 6474308 |
| `deck-cleaning.jpg` | exterior | 4469195 |

Ao escolher novas imagens de banco, confira se não há uniforme ou logotipo de outra empresa
visível. Uma boa candidata foi descartada por isso.

## Publicar as fotos dos projetos

1. Coloque os arquivos em `assets/img/projects/`.
2. No `index.html`, dentro da seção `#projects`, troque o marcador pela imagem:

```html
<!-- de -->
<div class="shot__ph"><svg class="ico"><use href="#i-image"/></svg></div>

<!-- para -->
<img class="shot__img" src="assets/img/projects/sala-antes-depois.jpg"
     alt="Sala pintada em tom claro após o serviço">
```

Mantenha o `data-cat` do cartão (`interior`, `exterior` ou `details`), que é o que
alimenta os filtros, e o `data-tone`, que define a cor da etiqueta.

Proporção recomendada: 4:3 nos cartões normais e 16:9 nos cartões largos
(`shot--wide`). O corte é feito por `object-fit: cover`, então imagens maiores funcionam.

## Formulário

Sem backend, o envio abre o cliente de email do visitante com tudo preenchido.

Para receber por um serviço externo (Formspree, Basin, Netlify Forms), basta preencher o
atributo do formulário no `index.html`:

```html
<form class="form" id="estimateForm" data-endpoint="https://formspree.io/f/SEU_ID" novalidate>
```

O script passa a enviar por POST e mostra a confirmação na própria página.

## Design

- Superfícies claras: branco `#ffffff` como base e `#fafafa` para separar blocos. O site
  é sempre claro, sem variante escura.
- A cor vive nos elementos, uma por categoria de serviço: azul (exterior), terracota
  (interior), verde-azulado (deck), âmbar (carpintaria) e ardósia (drywall).
- Terracota `#c2410c` é a cor de ação (botões e destaques).
- Títulos em Helvetica Neue 700, textos em Plus Jakarta Sans.
- Assinatura da marca em uma linha: símbolo mais PRO em peso cheio e DESIGN em peso leve,
  na mesma família do título. A descrição "Painting and Remodeling" fica no rodapé.
- O símbolo tem duas versões (`prodesign-mark-light.png` e `prodesign-mark-dark.png`). As
  duas ficam sobrepostas no cabeçalho e trocam por opacidade: a clara enquanto o cabeçalho
  está sobre o vídeo, a escura quando ele passa para fundo branco.
- A grafia da marca no texto corrido usa `<span class="brand"><b>PRO</b>DESIGN</span>`,
  mantendo a mesma leitura de peso em qualquer lugar.
- Ícones da biblioteca Lucide, embutidos como sprite SVG no próprio HTML (sem CDN).

## Desenvolvimento

```bash
python -m http.server 5177
```

O servidor local é necessário: em `file://` o navegador bloqueia o download do vídeo
para blob e o scroll do hero fica travado.

## Pendências

- Fotos reais dos projetos.
- Confirmar o email definitivo da empresa (hoje está `contact@prodesignpainting.com`).
- Confirmar a área de atendimento exata para a resposta do FAQ e para o texto de SEO.
