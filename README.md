# PRODESIGN Painting and Remodeling

Site de página única, em inglês, para o mercado dos Estados Unidos. Sem framework e sem
build: são arquivos estáticos que rodam em qualquer hospedagem.

## Estrutura

```
index.html                      página inteira, com âncoras por seção
css/style.css                   folha única (tokens no :root)
js/main.js                      vídeo por scroll, idioma, menu, galeria, FAQ, formulários
js/pt.js                        dicionário da tradução para português
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
| Photos | `#projects` | galeria por serviço, com visualizador |
| FAQ | `#faq` | acordeão |
| Get a free estimate | `#contact` | formulário |

A oferta de 10% fecha o scroll do vídeo: quando a casa aparece pronta, entra um ticket
escuro com o desconto e, no canhoto, um formulário curto de nome e telefone. Os recortes do ticket
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
- em telas de até 760px não há vídeo nenhum: o `<video>` sai do DOM e o palco usa duas
  imagens fixas, `hero-mobile.jpg` na primeira tela e `offer-mobile.jpg` (último quadro) na
  tela da oferta, mantendo a leitura de obra bruta virando casa pronta. O seek quadro a
  quadro não fica fluido em aparelho móvel e ainda custaria megabytes de rede. Uma
  sequência de imagens em canvas chegou a ser testada no lugar disso e foi descartada;
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

O script gera o vídeo de desktop (1280p, 30fps, keyframe em cada frame), o poster e as
duas imagens fixas do celular: `hero-mobile.jpg` do primeiro quadro e `offer-mobile.jpg`
do último. Nada mais precisa mudar no HTML.

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
| `interior-refresh.jpg` | Interior painting | 8583595 |
| `ceilings-and-walls.jpg` | Interior painting | 5691677 |
| `exterior-repaint.jpg` | Exterior painting | 39447777 |
| `deck-cleaning.jpg` | Deck washing | 4469195 |
| `trim-and-moldings.jpg` | Finish carpentry | 9036949 |
| `drywall-finishing.jpg` | Drywall taping | 6474308 |

Ao escolher novas imagens de banco, confira se não há uniforme ou logotipo de outra empresa
visível. Uma boa candidata foi descartada por isso.

## Publicar as fotos dos projetos

A galeria fica logo depois da faixa de números e é organizada por serviço. Cada cartão é
uma categoria: a capa que aparece no grid e, escondida dentro dele, a lista das fotos que
o visualizador abre.

1. Coloque os arquivos em `assets/img/projects/`.
2. No `index.html`, dentro da seção `#projects`, acrescente uma linha na `.cat__fotos` do
   cartão da categoria:

```html
<ul class="cat__fotos" hidden>
  <li data-src="assets/img/projects/sala-antes-depois.jpg"
      data-alt="Sala pintada em tom claro após o serviço"></li>
</ul>
```

Só isso. O contador do cartão ("4 photos") e os pontos de navegação do visualizador saem
da própria lista, então não existe número escrito à mão para desencontrar. Com uma foto
só, as setas e os pontos somem.

A capa do cartão é a `<img class="cat__img">`, separada da lista: pode ser a melhor foto
do conjunto ou uma imagem só para o grid.

Para criar uma categoria nova, copie um `<li class="cat">` inteiro e troque o
`data-cat-nome` do botão, o `.cat__nome` e a lista. `cat--wide` faz o cartão ocupar duas
colunas.

Proporção recomendada: 4:3 nos cartões normais e 16:9 no cartão largo. O corte é por
`object-fit: cover`, então imagens maiores funcionam. Dentro do visualizador a foto
aparece inteira, sem corte.

### O visualizador

Fecha com Esc, com clique fora ou no X. As setas do teclado e o arrastar do dedo trocam
de foto, e a navegação é circular. Ao fechar, o foco volta para o cartão que abriu.

## Idiomas

O site nasce em inglês. O seletor no cabeçalho troca para português do Brasil e a escolha
fica guardada no navegador, então na visita seguinte a pessoa cai direto no idioma que
escolheu.

Não existem duas páginas: a tradução é feita na hora. O script percorre os nós de texto,
troca cada trecho que encontra no dicionário de `js/pt.js` e guarda o original, então
voltar ao inglês é restaurar o que estava lá. Atributos (`placeholder`, `aria-label`,
`title`, a descrição do `<meta>`) passam pelo mesmo caminho.

### Mudar ou adicionar um texto

1. Edite a frase em inglês no `index.html`.
2. Edite a **chave** correspondente em `js/pt.js`, que precisa ser idêntica à frase nova.

Se a chave não bater, aquele trecho simplesmente fica em inglês quando o visitante troca
de idioma, sem quebrar nada. Para achar o que ficou de fora, abra o console com o site em
português e digite:

```js
TRADUCAO_FALTANDO
```

A lista traz tudo que apareceu na tela e não estava no dicionário. Telefone, endereço,
e-mail e a marca PRODESIGN aparecem aí de propósito: não devem ser traduzidos.

### Texto escrito pelo script

O contador de fotos de cada categoria ("3 photos" / "3 fotos") é gerado em JavaScript, não
está no HTML. Elementos assim levam `data-sem-traducao` e se inscrevem em `aoTrocarIdioma`
para se reescreverem sozinhos quando o idioma muda.

## Formulários

São dois, com o mesmo comportamento: o curto no canhoto do ticket da oferta
(`#offerForm`, nome e telefone) e o completo na seção Contact (`#estimateForm`).

Sem backend, o envio abre o cliente de email do visitante com tudo preenchido.

Para receber por um serviço externo (Formspree, Basin, Netlify Forms), basta preencher o
atributo `data-endpoint` no `index.html`. Vale para os dois, e cada um pode ter o seu:

```html
<form class="form" id="estimateForm" data-endpoint="https://formspree.io/f/SEU_ID" novalidate>
```

O script passa a enviar por POST e mostra a confirmação na própria página. Qualquer
`form` com a classe `.form` é ligado automaticamente, e a confirmação é o `.form__done`
que estiver dentro dele.

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
