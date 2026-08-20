# CLAUDE.md — Contexto del Proyecto

> **Este archivo es un resumen vivo del estado actual del sitio, no un changelog.**
> Mantenerlo siempre al día: cuando algo cambia, se actualiza la sección
> correspondiente para que describa *cómo es el sitio hoy* (no "qué se modificó").
> El detalle cronológico de cambios queda en el historial de git.

## Descripción

Sitio web de **Estudio 21**, desarrolladora inmobiliaria boutique de Montevideo,
Uruguay. Migrado de WordPress a un **sitio estático con Astro**. El objetivo es
transmitir la imagen de un estudio de arquitectura moderno y atraer inversores.

La **fuente de verdad visual** es `design/estudio21-home.html`: hay que preservar
esa estética (paleta hormigón cálido + tinta + acento petróleo; tipografías Space
Grotesk / Inter / IBM Plex Mono; el "21" sobredimensionado de fondo; marcas de
registro), no rediseñar. Todo el copy va en **español rioplatense**.

## Stack

- **Astro** (estático) + **TypeScript**, sin frameworks de UI, JS mínimo.
- **CSS propio** (sin Tailwind): `src/styles/global.css` con tokens + un `.css` por componente.
- **Fuentes locales** (archivos woff2 de Fontsource, subset latin, sin Google Fonts CDN),
  pero con las `@font-face` declaradas a mano en `BaseLayout.astro` (NO importar los
  `.css` de `@fontsource/*`): cada woff2 se importa con `?url` y se usa la MISMA URL en
  un `<link rel="preload">` (con `crossorigin`, obligatorio en fuentes) y en su
  `@font-face` con **`font-display: block`**. Motivo: con los `.css` del paquete
  (`swap` + fetch perezoso post-layout) el primer paint de un refresh podía salir con la
  fuente fallback → "pantallazo" de un 21 distinto. Así las fuentes arrancan a bajar
  a ~0 ms y nunca se pinta un glifo de otra fuente.
- `@astrojs/sitemap`, `sharp`.
- Imágenes con `<Image>/<Picture>` de Astro (AVIF + WebP + srcset).
- Comandos: `npm install`, `npm run dev` (→ `http://localhost:4321`), `npm run build`
  (→ `dist/`), `npm run preview`, `npm run check` (astro check).

## Deploy

**GitHub Pages** vía Actions (`.github/workflows/deploy.yml`): cada push a `main`
buildea y publica automáticamente en `https://abellasantiago.github.io/Estudio-21/`
(hay que habilitar `Settings → Pages → Source: GitHub Actions` una vez, del lado de
GitHub). `astro.config.mjs` setea `base: '/Estudio-21'` **solo** cuando
`process.env.GITHUB_ACTIONS === 'true'`; fuera de ahí (`npm run build` local, o el
build en el hosting del dominio real) `base` es `'/'`. Por eso **todo link o asset
interno escrito a mano debe ir prefijado con `` `${import.meta.env.BASE_URL...}` ``**
(patrón: `const base = import.meta.env.BASE_URL.replace(/\/$/, '')` en el frontmatter,
`href={`${base}/algo`}`) en vez de `href="/algo"` — un absoluto hardcodeado se rompe
en Pages porque el sitio no vive en la raíz del dominio. Las imágenes que pasan por
`<Image>/<Picture>` de Astro ya resuelven el base solas. Cuando haya dominio propio,
Pages queda como preview/staging gratis y no hace falta tocar nada de esto.

## Contenido y datos

- **Proyectos:** content collection `proyectos` (`src/content.config.ts`, schema Zod),
  un `.md` por proyecto en `src/content/proyectos/` (frontmatter con datos + cuerpo =
  descripción). Páginas de detalle `/proyectos/[slug]` con `getStaticPaths` — ver
  "Página de proyecto" más abajo.
  Estados posibles: `en-proceso` · `proximamente` · `terminado` (cada uno con su chip).
  **No hay campo `codigo`** (los viejos `E21·NN`): no se mostraban en ninguna parte
  del sitio y cuatro eran placeholders sin confirmar, así que se sacaron del schema
  y de los `.md`.
- **Equipo:** los integrantes en `src/data/equipo.ts` (sólo `slug`, `nombre`, `rol`).
  **Sin ubicación**: mostrar que dos arquitectos están en España abría la pregunta
  "¿quién supervisa mi obra en Montevideo?" — más ruido que beneficio para un
  inversor. Datos del estudio (mail, dirección, redes) en `src/data/site.ts` — lo que
  se completa aparece solo en Contacto.
- **Fotos por convención** (`src/lib/images.ts`): tirar imágenes en
  `src/assets/proyectos/<slug>/` (`portada.*`, `galeria-*.*`), `src/assets/equipo/<slug>.*`
  y `src/assets/estudio/presentacion.*` (la columna gráfica de "Quiénes somos")
  y aparecen solas, sin listarlas. Hasta que existan, se muestra un placeholder.
- **Piezas de marca derivadas** (`scripts/generar-marca.mjs`): `public/favicon.png`,
  `apple-touch-icon.png` y `og-default.png` **no se editan a mano** — se generan del
  logo real (`src/assets/marca/banner_negro.png`) con la paleta del sitio. Ver
  "Marca" más abajo.

## Home — secciones

Orden: **Hero · El estudio · Cómo operamos · Proyectos · Equipo · Contacto**
(`src/pages/index.astro`). Ojo con los anclajes: **`#nosotros` es la sección de
presentación** (`Presentacion.astro`) — el link "Nosotros" del navbar entra por ahí,
que es donde se dice quiénes son; la sección del modelo de trabajo
(`Nosotros.astro`, la de las cuatro fases) quedó con `id="como-operamos"`.
Entre **Quiénes somos / Cómo operamos** y entre **Cómo operamos / Proyectos** van
**reglas divisorias** (`hr.section-rule`, sueltas en `index.astro` entre los
`<section>`): en la home inmersiva las secciones son transparentes y sin eso se leían
como un bloque continuo. Al ir sueltas entre medio quedan en el aire que dejan los
`padding-block` y, dentro de un `.wrap`, alineadas con la línea de las cifras y la del
cuadro del equipo.

El aire vertical de las secciones es **asimétrico a propósito** (tokens
`--sec-pad-top` / `--sec-pad-bottom` en `global.css`, usados por `section.block` y por
`.contact`): el techo mide ~78% del piso. Así cada sección "sube" y su título queda
más cerca de la regla divisoria, **sin mover la regla** — que sigue a la misma
distancia del bloque de arriba. Si se vuelven a igualar, el título se despega otra
vez de la línea.

Navbar fina (58px) con el logo `banner_negro.png` ("ESTUDIO 21 ARQUITECTOS"); links
**Inicio · Nosotros · Proyectos · Equipo · Contacto** ("Contacto" es un link normal,
no CTA con recuadro). **"Proyectos" abre un desplegable anidado** (`Header.astro` +
`header.css`): panel con los tres estados —En proceso · Próximamente · Terminados— y,
dentro de cada uno, un **submenú con sus proyectos** (nombre + año) que linkea directo
a la ficha. Los datos salen de la content collection, con el
mismo orden editorial que la sección de proyectos. Detalles a respetar:
- Abre con **`:hover` y `:focus-within`** → funciona sin JS y se recorre con el
  teclado. El script sólo agrega el **modo tap** (mobile / `hover:none`: el link no
  navega, despliega), el Escape, el click afuera y el `aria-expanded`.
- `.nav-links` lleva **`align-self:stretch`** para tomar los 58px del navbar: si no,
  mide sólo el alto del texto (~30px) y el panel, que cuelga de `top:100%`, arrancaba
  montado sobre el navbar.
- El submenú va **pegado al panel** (el margen compensa el `padding` del panel, porque
  `left:100%` se mide desde la fila y no desde el borde): con aire en el medio, el
  mouse "se sale" al pasar de un nivel al otro y se cierra a mitad de camino.
- Sale **hacia la izquierda** cuando no entra a la derecha (`.flyout-left`, lo mide el
  script al abrir y en cada resize). Como el navbar está alineado a la derecha, en la
  práctica casi siempre cae de ese lado.
- En **mobile** (≤760px) no hay hover: el desplegable pasa a **acordeón** dentro del
  menú hamburguesa (los paneles entran en el flujo, indentados) y `.nav-links` scrollea
  solo (`max-height` + `overflow-y`) por si la lista abierta pasa el alto de pantalla.

El `.nav` **no** usa `.wrap` (el contenedor centrado a `--maxw`
del resto del sitio): con esa centrado el margen crece mucho más rápido que el ancho
de pantalla y en monitores anchos (1920+) el logo quedaba lejos del borde. En su
lugar `padding-inline: 9vw 8vw` — mismo tipo de unidad que las anotaciones mono del
fondo vivo (`.lbg-note-1`, home inmersiva), corrido 2vw hacia el centro desde el 7vw/6vw
inicial (que dejaba el logo pegado a "Montevideo") — para que el logo quede a la
derecha de esa nota y los links más adentro del borde derecho.
En la home inmersiva el header es progresivo (`immersive.css`): **sobre el hero va
"desnudo"** — SIN panel (fondo/blur/borde) ni logo, pero con los **links visibles y
clickeables** (color `--ink-soft`, un toque más marcados) flotando arriba para
orientar a un visitante despistado antes de scrollear, sin entorpecer; el panel
transparente no capta clics (`pointer-events` sólo en los links). Al **pasar el hero**
(`#header.past-hero`, ~0,7·vh) no se overridea nada → vuelve la **navbar final** tal
cual (base + `.scrolled`: panel `--paper` 94% + blur + borde `--line`, logo visible,
links `--concrete`). En fallback/mobile (sin `is-immersive`) es la navbar sticky normal
de siempre.

### Preloader (sólo home)
`src/components/Preloader.astro` + `src/styles/preloader.css`, montado en `BaseLayout`
sólo cuando `immersive` (la home), como primer hijo del `<body>`.
**Se muestra UNA vez por sesión del navegador** (flag `e21-preloaded` en
`sessionStorage`): la primera carga lo dibuja; los reloads y el link "Inicio"
(→ recarga `/`) dentro de esa sesión lo saltean y van **directo al hero**. En una
pestaña/sesión nueva vuelve a aparecer. El **inline boot** SÓLO lee el flag (si ya
está, oculta el overlay antes del paint — sin flash ni `pl-lock`); el flag lo
**escribe el módulo** al arrancar el dibujo (si se seteara en el boot, el módulo lo
leería como "ya visto" y nunca dibujaría en la primera carga).
- Overlay a pantalla completa (fondo `--paper` **limpio** mientras se arma — sin ghosts
  propios) donde una **planta arquitectónica minimalista** en hardline
  (trazos finos y suaves en tono `--ink-soft`, lámina **chica y tenue** — `.pl-sheet`
  `min(42vw, 430px)` con `opacity: 0.7`, para que quede como un símbolo de carga sin
  protagonismo, `viewBox` ajustado al edificio) se **dibuja trazo por trazo** (stroke-dashoffset
  por elemento con `pathLength=1`, **trazo pausado** — `STROKE` 0,7 s con easing tipo lápiz):
  fase 1 contorno (envolvente a doble línea), fase 2 tabiques/aberturas (puertas con barrido,
  ventanas), fase 3 mobiliario (aparece con **fade**, evita los puntitos que dejan las formas
  cerradas al dibujarse), fase 4 **grafismo mínimo** (cota general de ancho y de alto —
  **en paralelo, mismo delay por índice vía `data-step`, se dibujan a la vez** — y recién
  al terminar ambas entra la escala gráfica; **la opacidad tenue va en el grupo `.pl-graf`,
  no en cada elemento**, para que `.pl-fade` oculte los números hasta su turno y no
  aparezcan un instante al inicio; números mono con fade). Abajo, un **indicador de carga**
  (`.pl-loader`): barra que se completa (`.pl-bar-fill`, `scaleX` en `--pl-load` = duración
  del trazado, seteada por el script) + **porcentaje mono 0→100** (rAF en `run()`). El dibujo se
  percibe **capa por capa** (`step`/`gap` por fase, más deliberado en contorno y grafismo;
  ~4 s en total). Minimalista igual: **sin carátula ni rótulos de ambiente**, sin marcas de
  esquina, sin HUD; muros a doble línea con cap `butt`. En las uniones tabique↔muro y
  tabique↔tabique, la línea **exterior/lejana** del elemento atravesado queda continua y
  la línea **interior/cercana** se abre justo en el ancho del tabique que entra — así no
  hay ninguna raya cruzando entre las dos líneas del tabique y la unión se lee fundida en
  una sola pieza, no como dos muros que se cruzan. Al completar el dibujo se mantiene
  **~0,35 s** y hace la **transición "barrida hacia arriba"** (lenta, ~1,2 s): **TODO el overlay** (papel + plano)
  se barre subiendo como un telón (`.preloader.is-transition` con `pl-wipe-up` — `clip-path`
  `inset` que sube + leve empuje en Y) y deja ver **directamente el hero real**: el "21" que
  **ya viene girando en 3D detrás** (`immersive.ts` lo gira desde el load) **junto con sus
  "21" fantasma de fondo** (`.lbg-ghost`, que recién aparecen al levantarse el telón). **No
  hay "21" intermedio** — no se percibe ningún cambio de un 21 a otro. Cierre en el script:
  `is-transition` (barrida) → `is-done` (quita el overlay ya invisible).
- El script del componente asigna los delays escalonados por fase, bloquea el scroll
  (`html.pl-lock`) y cierra con `is-done`. Robustez: si la pestaña carga oculta espera a
  ser visible (rAF/animaciones están pausadas en background); `<noscript>` lo oculta sin
  JS; con `prefers-reduced-motion` no se muestra; se saltea con cualquier interacción.
- Duración fija (~2,8 s de dibujo + fade). La planta es genérica ("unidad tipo"), no un
  proyecto real: se puede cambiar por la planta de un proyecto cuando se quiera.

### Hero (capa inmersiva)
- Motor en `src/scripts/immersive.ts` (sólo en la home, `data-immersive-page`, y sólo
  si no hay `prefers-reduced-motion`, con puntero fino y pantalla ≥900px). Progressive
  enhancement: sin eso, queda estático y legible.
- El "Estudio 21" gira en 3D (rotateY continuo + extra atado al scroll del hero,
  retrocede en Z y se desvanece integrándose al fondo), parallax de mouse en las capas
  `[data-depth]`, corredor de marcos que avanza en Z, rail de progreso.
- **Corredor de marcos** (`.depth-frame`, los cuadrados de registro en
  `LivingBackground.astro`): avanzan hacia la cámara con el scroll durante todo el
  descenso hero→cards (crecen por perspectiva) pero **se desvanecen con el mismo
  fade que el título** (`heroFadeOut`, tramo 0.65→1 del scroll del hero) — sin eso
  seguían creciendo y quedaban visibles sobre "Quiénes somos" y el resto,
  compitiendo con la lectura. El motor multiplica por 0.6 (`corridor.style.opacity
  = 0.6 * heroFadeOut`) para conservar la opacidad base tenue del corredor
  (definida en `immersive.css`) en vez de pisarla a 1 mientras el fade vale 1 al
  principio del hero.
- **Arranque en continuidad (sin flash al cargar/recargar):** dos causas cubiertas.
  (a) Fuentes: preload + `font-display: block` en `BaseLayout` (ver Stack) — el primer
  paint nunca muestra un "21" en fuente fallback. (b) Motor: el primer frame del motor
  es IDÉNTICO al estado que pinta el CSS antes de que corra el JS. El giro usa un
  **reloj relativo** a `t0` (primer frame visible, no el reloj absoluto de la página →
  arranca exacto en 0°) y una **rampa smoothstep** (`RAMP_MS` 1,1 s) hace entrar de a
  poco el cabeceo del título y la deriva de las capas de fondo (los "21" fantasma parten
  de su posición CSS de reposo). La sombra arranca igualada: `--shadow-pulse: 1` inicial
  bajo `html.is-immersive` en `hero.css` (= 0,72 + 0,28·|cos 0°|, lo que escribe el
  motor a 0°; el inline del motor lo pisa después). `t0` se resetea en cada `enable()` y
  se fija dentro del guard `!document.hidden` (una pestaña que carga en background
  arranca limpio al hacerse visible).
- **Material grafito** (referencia: render de producto sobre papel): las capas del
  extruido van de un gris cálido iluminado al fondo a casi negro al frente con
  **oscurecimiento cuadrático** (la mayor parte del canto queda en el gris iluminado y
  recién se funde a negro contra la cara → lateral liso y claro); la cara frontal
  (`.ht-face`) lleva un degradé "sheen" cenital vía `background-clip:text` (fallback:
  `--ink` plano). Dígitos casi tocándose (letter-spacing −0.045em), extrusión 38px /
  16 capas. "Estudio" en peso 700, mismo material.
- **Sombra proyectada** (`.ht-shadow`): plano acostado (`rotateX(90°)`) **sobre la
  baseline real de los dígitos** (cae al **91,9% de la caja, medido** — métricas de
  Space Grotesk × line-height 0.82, los dígitos no tienen descender; el plano va en
  `top: 92%`: cualquier valor más abajo deja un gap y el "21" parece flotar),
  **dentro del bloque preserve-3d** → gira en el piso junto con el "21", se
  acorta/alarga con la perspectiva y retrocede/desvanece con él. Cuádruple degradé
  radial: **oclusión de contacto muy angosta y casi negra pegada a la línea de
  apoyo** (el "21" se lee APOYADO, sin aire entre glifo y sombra) + banda de
  oclusión + núcleo + halo corridos **SÓLO hacia atrás: la sombra se proyecta
  DETRÁS del "21"** (luz alta desde adelante; tras el `rotateX(90°)` la mitad
  superior del plano es el lado lejano). Todos los degradés van **centrados en
  x = 50%** (no se derraman a los costados de los dígitos) y **angostos** (anchos
  ~44–52%); los centros en y < 50% (50/47,5/45/43,5%) los estiran hacia atrás.
  Tupida: alfas altas (~0,9/0,74/0,62/0,5) y caída tardía a transparente.
  `--shadow-pulse` (motor) la respira según el ángulo (de
  canto proyecta menos). Funciona también en el fallback (la rota la animación CSS
  `hero-spin-y`). El bloque `.hero-title` entero lleva `user-select: none` (el
  "Estudio 21" visible es decorativo, `aria-hidden`; el texto real va en
  `.sr-only`): no se puede seleccionar ni arrastrar.
- **Nave wireframe** (`HeroWireframe.astro` + `hero-wireframe.css`): pabellón vidriado
  en wireframe de fondo del "21", con **proyección 3D real** calculada en build (cámara
  pinhole — focal, altura de ojo — y nave girada 38° respecto del plano de cuadro → dos
  puntos de fuga francos). **La ESQUINA de la nave (el vértice) queda detrás del "2"**
  (viewBox ≈ x 705) y de ahí fuga hacia los dos lados: a la **derecha** la fachada
  larga (36 vanos → VPR ≈ (1503, HOR), casi en el borde) con **mucho más recorrido**;
  a la **izquierda** la fachada corta (5 vanos → VPL ≈ (−352, HOR), fuera de cuadro
  pero cerca → pendiente visible), recorrido ~mitad. El dibujo se **dispersa contra
  AMBAS fugas** con un fade propio del SVG (máscara `wf-fade` con degradé horizontal
  simétrico: blanco entre x 496–1000, negro en ≤232 y ≥1400 — ningún extremo termina
  seco). La nave está a **20 m** (esquina) → queda **baja, en la banda media de los
  dígitos**, y su línea de piso sube hacia el **horizonte bajo** (≈60% de la altura
  de los dígitos): mismo plano de suelo que el "21", más atrás — fondo, sin
  protagonismo. Trazo denso: columnata a paso real con opacidad según distancia,
  segunda fila de columnas, cubierta + fascia, cerchas a dos cordones con montantes
  de alma en tramos cercanos, correas, rieles + montantes de vidriado (se rarifican
  con la distancia), rieles del plano de fondo, zócalo, baldosado de piso delante
  de la nave en las dos direcciones y prolongaciones de boceto (hacia
  arriba-izquierda detrás de "ESTUDIO", y más allá del testero derecho). Hacia el
  **VPL la fachada corta se alarga** más allá del testero (todos los rieles siguen
  en dos tramos decrecientes + columnas extra desvaneciéndose): el dibujo **no
  termina en seco a la izquierda — se disuelve** contra el fade.
  Recursos de **boceto de edificio** (trazo 0.8 el rayado; el `stroke-width` va por
  atributo en cada path — no ponerlo en la CSS, lo pisaría): columnas cercanas a
  **doble línea** con arranque marcado al pie, **hatching** a lápiz en la banda de
  fascia de ambas fachadas, sombra de la cubierta rayada sobre el piso interior,
  diagonales de "vidrio" en paños cercanos y marcas de terreno al pie. Tenue
  (`--concrete`, máscara radial en bordes; fallback 0.65, inmersivo tope 0.8). En
  inmersivo **aparece SOLO, temporizado (no con el mouse)**: arranca a revelarse
  `WF_DELAY` (~1 s) **después de que el hero queda a la vista** y sube de a poco
  (smoothstep, `--wf-reveal`, ~1,6 s) — lo escribe el motor. El "hero a la vista"
  lo dispara el **Preloader** con el evento `e21:hero-ready` (al levantar el telón
  en la primera carga, o directo en reload/sin preloader) + un flag global
  `window.__e21HeroReady` por si el evento se adelanta al listener; el motor ancla
  el revelado en `max(heroReadyAt, t0)` (si la pestaña cargó en background, el
  gradual empieza recién al hacerse visible). Se va con `--hero-fade`; en fallback
  queda visible estático; **oculto en <900px** (el recorte lo magnificaba sobre los
  textos).
- **Textura técnica**: grano de papel (feTurbulence en data-URI, multiply, opacidad
  0.07, `.lbg-grain`) en el fondo vivo. Luz de estudio en el stage
  (`.hero-stage::before`: centro apenas más claro + viñeta sutil). Los parches de
  puntos matriz que hubo acá se sacaron (no gustaron).
- Easter egg de blueprint "linterna" (`HeroBlueprints.astro`): **desactivado por ahora**
  (import y uso comentados en `Hero.astro`, el componente y su CSS quedan intactos para
  retomarlo). Cuando esté activo: un solo plano a la izquierda del "21" (PLANTA); se
  descubre pasando el mouse (dibujo tipo lápiz por segmentos) y al salir queda
  "durmiendo" tenue. El de la fachada (derecha) se sacó.
- **`--hero-fade`** (seteado por `immersive.ts` según el scroll) desvanece al dejar el
  hero y trae de vuelta al subir: las notas mono del fondo vivo, el blueprint izquierdo,
  el eyebrow **"Arquitectura que trasciende"** (combinado con su reveal-on-scroll inicial
  vía una custom property `--reveal`, no pisa la transición de `.reveal`) y la línea
  **"21 de Setiembre 3024"** (`.hero-dim`). El texto/marca se corren a la izquierda con
  el token `--hero-shift` (se anula en pantallas chicas).
- **Después del hero NO va texto suelto**: se entra directo a "El estudio". El bloque
  `.hero-intro` que había ahí (claim "De la idea a la escritura, un solo estudio" +
  una frase de contexto + las cifras) se desarmó: repetía lo que ya decía Nosotros y
  demoraba la llegada a los proyectos. El claim y la frase se reemplazaron por la
  sección de presentación; las cifras pasaron a la cabecera de "Cómo operamos".

### Quiénes somos — presentación (`#nosotros`)
`src/components/sections/Presentacion.astro` + `src/styles/presentacion.css`.
Es la primera sección después del hero: responde **qué es** Estudio 21 antes de que
"Cómo operamos" explique el modelo de negocio. Esa división es la que evita que las
dos secciones se pisen — **identidad acá, modelo allá**.
- **Columna gráfica a la izquierda / texto a la derecha** (`.pres-grid`, 0.92fr 1fr).
  El grid va con el `align-items: stretch` por defecto **a propósito**: así el hueco
  gráfico toma exactamente el alto que marca el texto y el bloque queda parejo sin
  fijar una proporción a mano (medido: 448px y 448px). No poner `align-items: start`.
- **La columna gráfica está vacía por ahora.** Si aparece
  `src/assets/estudio/presentacion.*` se usa esa imagen (auto-descubierta por
  `getFotoEstudio()` en `src/lib/images.ts`, misma convención que equipo y proyectos);
  si no, se dibuja un placeholder con la grilla de blueprint del sitio — el mismo
  gesto que los retratos del equipo sin foto. Ver `src/assets/estudio/LEEME.md`.
  Está pensado para reemplazarse entero si en vez de una foto va un gráfico.
- **Título: "Estudio 21"** (sin "Arquitectos" — así no repite el lockup del logo del
  navbar), con eyebrow "Quiénes somos".
- **Los tres párrafos bajan de intensidad** (el primero en `--ink-soft`, los otros dos
  en `--concrete`). El copy es el texto del sitio viejo de WordPress, **verbatim**
  (decisión del 2026-08-18): no tocar la redacción sin que lo pida el estudio.
- **Cierra con las cifras de trayectoria** (`.pres-cifras`, +10 / +15 / 06) como banda
  horizontal de 3 columnas bajo una línea `--ink`, igual que la grilla de fases. La
  primera celda va sin `padding-left` para que el número alinee con el borde del
  contenido. Marcado `<dl>` con `<dt>` (etiqueta) antes de `<dd>` (cifra) para que el
  lector de pantalla lea "Años de trayectoria: +10", y `column-reverse` para que en
  pantalla mande la cifra. **Ojo con `justify-content: flex-end`**: en `column-reverse`
  el eje va de abajo hacia arriba, así que eso apila contra el borde superior — sin
  eso, una etiqueta que parte en dos líneas (pasa en mobile) empuja su cifra hacia
  abajo y los tres números quedan a distinta altura.

### Proyectos — carrusel helicoidal 3D
`src/components/ProyectosHelicoidal.astro` + `src/styles/proyectos-helicoidal.css`.
- Las cards se distribuyen en un **cilindro 3D** que rota y desciende atado al **scroll**
  (sección alta + panel `.ph-sticky` de 100vh; sin secuestrar el scroll). Escala/opacidad
  por curva de coseno (frente grande/nítido → dorso chico/desvanecido/blur). **Zoom al
  centro** con pico ~**1.70×** (ventana angosta = pop aislado), `RADIUS` 540 (300 mobile),
  **supersampling 2×** (card maquetada al doble y reducida ÷2 → nítida), sin snap.
- **Header (título) fuera del sticky:** scrollea con la página. En modo 3D la **barra de
  filtros + contador** se relocaliza al panel sticky (pineada mientras se recorre).
- **Dónde queda la barra de filtros en 3D — depende del ancho, y el corte es
  geométrico, no estético:**
  - **≥1700px** → **riel vertical** a la izquierda, tipo leyenda de plano.
  - **<1700px** → **barra horizontal arriba** del cilindro.

  El motivo: el cilindro tiene radio 540 y las cards laterales, proyectadas, llegan
  hasta ~550px a la izquierda del centro (medido a −45°/−60°, con opacidad 0,3–0,5 →
  bien visibles), mientras que el riel termina a ~246px del borde. Recién con ~1700px
  de ancho el centro queda lo bastante lejos como para que no lo crucen; por debajo de
  eso les pasaban por encima a los botones.

  La barra horizontal **no va pineada con un velo encima del escenario**: eso no
  alcanzaba, porque en ventanas bajas la card frontal (la más grande y opaca) se metía
  ~64px en los botones. Va como **primer ítem de la columna del panel**
  (`.ph-sticky{flex-direction:column}` + `.ph-bar{order:-1;position:static}`, porque el
  script la `appendChild`ea al final), así el escenario recibe **sólo el alto sobrante**
  y el cilindro no puede alcanzarla por más baja que sea la ventana. El toggle
  "Ver todos" queda pineado en esa misma línea a la derecha; `--ph-toolbar-top` los
  mantiene alineados y el `padding-right` de la barra le reserva el lugar. Ese token
  está calculado sobre la **altura real del navbar (58px)** más un respiro: reservaba
  74px y eso, sumado al cierre del header, dejaba ~108px entre el título y los botones.
  Ajustado el token + recortados el `padding-bottom` del header y el margen del
  `sec-head` (los dos **sólo en <1700px**, donde la barra ya no vive en el header), el
  título y los controles quedan a ~65px, o sea leyéndose como una sola unidad.

  Como la barra se come ~120px de la franja de arriba, el umbral de card chica subió
  de `max-height:680px` a **820px** (con un escalón extra a 660px): con la card grande
  la frontal quedaba recortada arriba y abajo en ventanas no maximizadas.
- **El giro arranca sólo cuando el panel se fija.** `headOffset` (alto del header,
  medido sobre **`.ph-head`** —ver la nota de `offsetTop` + sticky en "Notas técnicas";
  recalculado en `layout()`) marca cuánto scrollea la sección antes de
  pinearse. `updateTarget` deja el progreso en **0** en ese tramo (1ª card centrada) y lo
  mapea 0→1 sólo en el tramo pineado `[headOffset .. offsetHeight-innerHeight]`.
  `scrollToIndex` (foco por teclado) usa el mismo modelo.
- **Filtros** (Todos / En proceso / Próximamente / Terminados): filtrar reconstruye el
  cilindro con el subconjunto y **mantiene tu posición** remapeando el recorrido al nuevo
  N. Si pasás a un estado con **menos** proyectos y tu posición queda más allá del final,
  se **rebobina al arranque del helicoidal** (`offsetTop + headOffset`) con salto
  instantáneo (ver nota `behavior:'instant'` abajo).
- **Toggle "Ver todos" ⇄ "Volver al giro"** (`#phViewToggle`; la sección lleva
  `.is-toggleable` cuando el 3D está activo): alterna el cilindro por una **grilla estática
  con todos los proyectos a la vista** (salida rápida para quien no quiere recorrer todo el
  scroll). No es un fade — las cards **viajan** entre estados: desenrollar (cilindro→grilla)
  usa **FLIP** (se mide el rect de cada card en el cilindro y se la suelta en su celda con
  traslación+escala+fade, cascada leve por índice); reensamblar (grilla→cilindro) hace un
  **bloom** (nacen chicas/translúcidas en su lugar del anillo) y reposiciona el scroll al
  arranque del helicoidal. El botón vive en el header en grilla y se **relocaliza pineado**
  (arriba-derecha del panel; abajo-derecha en mobile) en 3D; respeta el subconjunto filtrado
  y se protege de clicks a mitad de transición (clase `.is-flipping`, que además libera el
  `overflow` para que las cards no se corten al volar). Con `prefers-reduced-motion` o sin JS
  el toggle no aparece (queda la grilla accesible de siempre).
- **Card en grilla (formato retrato):** la portada va en **`aspect-ratio: 4/5`** (en el
  cilindro el thumb es `flex:1` y queda ~0.94, casi cuadrado). Motivo: las portadas
  reales son casi todas cuadradas (1:1) o verticales (0.75–0.80) y el 4/3 apaisado que
  había antes les recortaba entre un 25% y un 44% de la foto. Con 4/5 las verticales
  entran enteras y las cuadradas pierden sólo un 20% a los lados. La ficha (`.ph-meta`)
  crece con la card y empuja ubicación + chip de estado al pie (`margin-top:auto`) → los
  estados quedan **alineados entre cards** aunque el nombre ocupe dos líneas (clamp 2), y
  el chip abraza su texto (en 3D sigue a ancho de card, sin cambios). Más aire entre filas
  que entre columnas. El `sizes` de la `<Image>` declara **el mayor de las dos vistas** por
  breakpoint (grilla 1/2/3 columnas vs. card fija de 376px del cilindro, maquetada a 2×):
  ninguna de las dos queda blanda.
- **Cards limpias:** sin cartelito `E21·NN`, sin nombre gigante de fondo, sin grilla
  blueprint; el fondo del panel es parallax multicapa (fantasma "21" + marcas de registro).
  El CTA "Ver proyecto" aparece **sólo en hover de la card al frente**.
- **Carriles de escape: no hay que recorrer todo el cilindro para seguir el sitio.**
  El tramo pegado son ~6,8 pantallas de scroll con diez proyectos, y eso obligaba a
  girar la espiral entera para llegar a la sección siguiente. La regla que lo resuelve
  es geométrica, no un botón: **encima de las cards manda el recorrido; afuera —las
  franjas de cada costado adonde el cilindro no llega, a todo el alto— manda el
  sitio.** Con el cursor en un carril y la rueda andando pasan **dos cosas**:
  1. **Las cards se CONGELAN** (`frozen`): `updateTarget` deja de tocar `targetScroll`,
     así que el cilindro y el parallax del fondo quedan clavados donde estaban por más
     que la página se mueva. Esto no depende de nada del navegador —es simplemente no
     actualizar una variable— así que es la **garantía** de que los proyectos se quedan
     quietos, pase lo que pase con el evento de rueda.
  2. **La página salta a la sección de al lado** con una animación propia (`stepJump`,
     640 ms, easeInOutCubic): abajo, el arranque de la que sigue; arriba, el arranque
     de ésta. O sea: el sitio se desplaza entre secciones y las cards ni se enteran.

  Detalles a respetar:
  - ⚠ **`preventDefault()` NO alcanza, y por eso el mecanismo principal es el
    congelamiento.** Con un gesto de scroll ya arrancado Chrome manda los `wheel` con
    `cancelable:false` y el preventDefault se ignora en silencio — justo el caso normal
    (venís scrolleando y te corrés al costado), que fue lo que dejó el carril inerte en
    las primeras versiones. Aunque el navegador scrollee por su cuenta, con las cards
    congeladas lo único que se mueve es el sitio: que es exactamente lo que se busca.
  - ⚠ **El listener de rueda va en `window`, no en la sección.** Colgado de la sección
    depende del hit-test y cualquier cosa fija bajo el cursor (el botón de WhatsApp, el
    header) se comía el evento. Es no-pasivo, así que se engancha y desengancha con el
    `IntersectionObserver`: sólo existe mientras la sección está a la vista.
  - **Un gesto = un salto.** Hace falta juntar `JUMP_TRIGGER` (24px) de rueda para
    dispararlo (un roce no te teletransporta) y después queda un cooldown de 320 ms
    para que la inercia del trackpad no encadene un segundo salto. Verificado con un
    flick de 12 eventos: un solo salto, sin pasarse.
  - **Fuera del tramo pegado el handler ni se mete** (scroll normal), y sobre las cards
    tampoco: ahí el recorrido sigue siendo el de siempre, proporcional al scroll.
  - **El ancho del carril lo calcula el script** (`fitGeometry` → `--ph-lane`) contra el
    **núcleo** del cilindro: la card al frente y sus vecinas hasta `CORE_ANGLE` (40°),
    que son las que se leen y se clickean. Más allá de eso el cilindro son fantasmas a
    0,3 de opacidad y desenfocados, y que el scroll ahí responda al sitio es lo
    esperable. Da **459px por lado en 1920**, 299 en 1600, 219 en 1440, 159 en 1024 —
    o sea toda la franja donde viven los botones de filtro (el riel termina en 246px).
    Para angostarlo, subir `CORE_ANGLE`; para ensancharlo, bajarlo.
  - **El marcador del carril igual queda libre de cards**: el filete va a ~19px del
    borde y el rótulo a 28–44px, y la card más saliente nunca pasa de 104px del borde
    en ningún ancho. Eso se sostiene porque el **RADIO** sí se ajusta contra la
    envolvente COMPLETA (el máximo |x| en todo el recorrido, con perspectiva — el pico
    no cae en 90° sino cerca de 70°): bisección entre 380 y 540 hasta dejar `LANE_MIN`
    (92px) libres a cada lado. Arriba de ~1280px no cambia nada; el ajuste sólo actúa
    entre 1024 y ~1280px.
  - Los carriles son **decoración con `pointer-events:none`** (filete punteado + rótulo
    "Seguir de largo" en el tercio de abajo, visibles sólo con el panel pegado): el riel
    de filtros y el toggle viven dentro del carril y se tienen que poder clickear igual.
  - En **touch no hay carril** (no hay `wheel` ni cursor): ahí la salida es el toggle
    "Ver todos", que está pineado y a la vista.
- **El cilindro pide LUGAR: `(min-width: 1024px) and (min-height: 620px)`.** Por debajo
  de eso el componente arranca —y vuelve— a la **grilla**. El corte es geométrico, como
  el de los 1700px del riel: con menos de 1024px de ancho ya no quedan **carriles de
  escape** (las cards proyectadas ocupan todo el ancho, así que la única forma de pasar
  la sección sería recorrerla entera); con menos de 620px de alto (un celular acostado,
  una ventana corta) la card no entra entera y se corta contra el borde de abajo.
  Sumado a eso, en un teléfono el recorrido eran ~3800px de scroll para diez proyectos.
  La grilla no es un premio consuelo: es la misma vista que da el toggle
  "Ver todos". El cambio es **en runtime** (girar el teléfono, arrastrar el borde de la
  ventana): se compara contra el estado anterior para no pisar una elección manual del
  toggle, y se engancha tanto al `change` de la media query como al `resize` —
  salvavidas para los entornos donde el `change` no llega.
- **Fallback:** el markup base es una lista semántica accesible (links navegables por
  teclado). Sin JS o con `prefers-reduced-motion` → grilla estática accesible; el 3D es
  sólo capa de presentación. `rAF` activo sólo con la sección visible
  (`IntersectionObserver`); sólo se tocan `transform`/`opacity`.

### Cómo operamos / Equipo / Contacto
- **Cómo operamos** (`Nosotros.astro` / `nosotros.css`, ancla `/#como-operamos`):
  cabecera simple (eyebrow + título + lead) y los bloques de las cuatro fases.
  Las cifras de trayectoria **no** van acá: viven al pie de la sección de
  presentación. La etiqueta de cada bloque va sólo `· Originación` /
  `· Estructura` / etc. — el prefijo `F01`–`F04` que tenía antes se sacó del
  todo (no significaba nada para quien lo lee).
  La línea que corona las fases va en **`--concrete`**, no en `--ink` como la de las
  cifras y la del equipo: es la única de las tres que tiene cuatro columnas colgando,
  y en tinta plena pesaba de más. **No lleva los puntitos** que tenía sobre cada
  fase (`.dot`, sacados).
- **Equipo** ("Nuestro equipo"): fotos optimizadas, `alt` con nombre + rol. Cada
  ficha muestra nombre y rol, sin ubicación. El **retrato NO va a ancho de celda**:
  se topa en **`--team-portrait`** (16,5rem ≈ 264px, token en `global.css`), así que
  mide 264×330 en vez de los ~330×410 que daba el ancho completo. A ancho de celda
  las fichas dominaban la página; topado, la celda sigue siendo la misma unidad de la
  retícula pero la ficha baja de alto (464 contra 559px) y la foto se lee como
  retrato de fichero, no como póster. El tope también ordena mobile, donde en una
  columna el retrato se iba a ~500px. Como el slot mide lo mismo en todos los
  breakpoints, el `sizes` de la `<Image>` es fijo (`264px`, con widths 264/396/528
  para 1,5× y 2×). En ≤600px la ficha va **sin padding lateral**: en una columna esa
  sangría no separa de nada y desalineaba el retrato respecto del título.
  **Hover**: el retrato se despega del papel (−6px + sombra + borde a `--ink`) y la
  foto hace zoom 1.05; el nombre y el rol acompañan la mitad (−3px). Se anima el
  **retrato**, no `.person`: la ficha es una celda del cuadro y **sus bordes son las
  líneas de la retícula** — moverla entera correría esas líneas y se rompería la
  grilla.
- **Contacto:** mail real `estudiodearquitectos21@gmail.com` en texto + JSON-LD.

## Página de proyecto (`/proyectos/<slug>`)

`ProjectLayout.astro` + `project-page.css`, con la galería en su propio
componente (`Galeria.astro` + `galeria.css`).

Orden de la página: **título · (portada | descripción) · ficha técnica · galería**.

- **Título arriba de todo** (`.proj-head`), con el chip de estado a la derecha.
- **Portada a la izquierda, descripción al costado** (`.proj-top`). La columna de
  la foto está **topada en 480px de ancho / 560px de alto** — pero es el **alto**
  el que manda (`--cover-h` en `.proj-cover`, `grid-template-columns:max-content
  ...` en `.proj-top`): el ancho de la columna se deriva de ese alto fijo según
  la proporción de cada portada, no al revés. Así una portada más ancha que 6/7
  (ver `portadaAspecto` abajo) ensancha su propia columna en vez de perder alto
  para seguir midiendo 480px — **todas las fichas comparten la misma banda
  vertical**, sea cual sea su proporción. Con el ancho fijo (6/7, 77 a 151
  palabras según el proyecto) la descripción queda colgando en el aire; lo que
  sobra va al texto, topado en 62ch. En ≤900px se apila y vuelve al modelo de
  ancho fijo (`--cover-h:auto`, portada centrada en `min(100%, 440px)`) — con
  una sola columna, alto fijo no tiene sentido: una cuadrada se vería tan ancha
  como una vertical, pegada al ancho completo.
- **La portada va en 6/7 por defecto** (vertical suave, más ancha que un 4/5),
  igual en la mayoría de los proyectos. Las fotos reales van de 0.75 a 1.50, así
  que cada una se encuadra a mano desde el frontmatter: **`portadaFoco`** (`--pf`,
  qué parte se conserva) y **`portadaZoom`** (`--pz`, acerca desde ese mismo
  punto). Son los mismos campos que usa la card del helicoidal → un solo ajuste
  sirve para las dos vistas. Además, **la caja entera** (no sólo el encuadre)
  hace un zoom parejo de **1.06×** sobre `--pz` (en el CSS, no en el frontmatter):
  las portadas se sentían "de catálogo", sin recortar nada, y ese acercamiento
  leve les da más presencia sin ser una decisión de encuadre por proyecto.
  Cuánto se recorta con el 6/7 (antes del 1.06× parejo): las verticales entre 7%
  y 13% (con el 4/5 anterior casi no perdían nada — el trade-off de ensanchar la
  caja), las cuadradas ~14%, Cavas de Haedo (1.03) ~17%.
  - **La proporción de la caja también se puede overridear por proyecto**, con
    `portadaAspecto` (ej. `"1/1"`) en el frontmatter — para cuando el 6/7 le
    recorta demasiado a una foto muy apaisada. Patios del Regimiento (1.41, la
    más apaisada después de Villa Platero) lo usa: en 6/7 perdía ~39%, cuadrada
    pierde ~29%. Villa Platero (1.50, ~43% en 6/7) y Terrazas de Italia (1.33,
    ~36%) se quedaron en el 6/7 default — en las tres el edificio está centrado,
    así que el foco al centro las toma bien sea cual sea la caja.
  - ⚠ **El `widths`/`sizes` de la portada NO es el ancho de la caja.** Con
    `object-fit:cover`, el navegador escala la foto hasta que su lado más
    exigente llena la caja: como el ALTO es fijo (`COVER_H_MAX = 560`, igual en
    todos los proyectos), el ancho a rasterizar es `COVER_H_MAX × max(coverBoxAr,
    coverAr) × portadaZoom` (`coverBoxAr` = el valor de `portadaAspecto` si
    existe, si no `COVER_AR_DEFAULT = 6/7`; `coverAr` = la proporción real de la
    foto). Villa Platero (1.50, caja 6/7) necesita **840px**; Patios del
    Regimiento (1.41, caja 1/1 por `portadaAspecto`) necesita **792px** — pedir
    de menos deja la foto ligeramente blanda. Lo calcula `coverRender` en el
    layout. ⚠ `COVER_H_MAX` tiene que coincidir con el `--cover-h` de
    `.proj-cover` en project-page.css, y `COVER_AR_DEFAULT` con su fallback de
    `aspect-ratio`. El zoom parejo de 1.06× es sólo CSS (`transform`), no entra
    en esta cuenta — el margen de las fuentes 2× ya lo absorbe sin que se note
    blando.
- **Ficha técnica**: banda horizontal de 5 columnas al pie del bloque, con
  `border-top` en `--ink` (marcado `<dl>` con `<dt>`/`<dd>`).
- **Galería = tira de contactos + visor.** Todas las miniaturas al **mismo alto**
  (`--gal-h`) y con el **ancho que les da su proporción real** → tira horizontal
  scrolleable, sin recortar ninguna (los ratios de la galería van de 0.56 a 1.95:
  cualquier caja fija recortaría fuerte a la mitad del material). El script
  agrega arrastrar con el mouse (umbral de 5px para no comerse el click), las
  **flechitas sobre las miniaturas de los extremos** (`.gal-arrow`, desplazan 3/4
  de lo que se ve) y los degradés de borde. Flechas y degradés sólo aparecen del
  lado donde queda algo por ver (`has-overflow` / `at-start` / `at-end`); las
  flechas usan `visibility` y no `display` para salir también del tabulado.
- **Visor**: velo de **papel translúcido + blur**, no negro — el sitio se sigue
  viendo detrás. Anterior/siguiente en un cajetín bajo la foto, **en ciclo**
  (de la última vuelve a la primera), flechas del teclado, Escape, click en el
  velo, foco atrapado mientras está abierto y precarga de las dos vecinas.
  La miniatura de la foto abierta queda marcada y se trae a la vista.
- **Sin JS sigue sirviendo**: cada miniatura es un `<a>` a la foto grande (la
  versión de 1800px que genera `getImage` en build), que es también la que
  levanta el visor. El `<img>` del visor arranca sin `src` → no se descarga
  ninguna foto grande hasta que se abre.

## Interacciones globales y SEO

- **JS global** (`BaseLayout.astro`): menú móvil, sombra del header al scrollear
  (`.scrolled` / `.past-hero`), reveal-on-scroll (`IntersectionObserver`), y la capa
  inmersiva. **Al recargar se vuelve al hero:** `history.scrollRestoration='manual'` +
  `scrollTo(0,0)` si no hay ancla (respeta `/#seccion`).
- **SEO/accesibilidad:** `BaseHead` (meta únicos, canonical, OG/Twitter, JSON-LD),
  sitemap, robots.txt; skip-link, focus-visible, `alt`, y todo respeta
  `prefers-reduced-motion`. OG: la home usa `og-default.png`; cada proyecto con
  portada usa la suya (ver `ProjectLayout`).

## Marca — piezas derivadas del logo

El logo del estudio es `src/assets/marca/banner_negro.png` ("ESTUDIO 21
ARQUITECTOS", tipografía condensada, con el "21" **calado** dentro de un recuadro
sólido — no pintado de blanco, por eso funciona sobre cualquier fondo). Es la marca
institucional y **se usa tal cual en el navbar**: cambiarla es una decisión de
identidad del estudio, no algo a resolver de rebote desde el sitio.

Lo que sí está unificado a la paleta del sitio son las **piezas derivadas**, que se
generan con `node scripts/generar-marca.mjs` (pasarle una carpeta como argumento
para previsualizar sin pisar `public/`):

- **`favicon.png` / `apple-touch-icon.png`** (512×512): salen de
  `src/assets/marca/icono-21.png`, que es **el favicon histórico tal cual** (el "21"
  blanco sobre negro, con su encuadre propio). El script sólo **remapea la escala de
  grises** — negro a `--ink`, blanco a `--paper`, interpolando por luminancia para no
  perder el antialias. La composición no se toca: es el mismo icono de siempre, con
  los colores del sitio.
- **`og-default.png`** (1200×630, antes 1920×1080 en blanco y negro con otro
  tagline): logo en `--ink` sobre `--paper`, con la "luz de estudio" del hero, el
  "21" fantasma en `--paper-deep`, las marcas de registro del sitio y la bajada
  "ARQUITECTURA Y DESARROLLO · MONTEVIDEO, URUGUAY" en mono, con la regla petróleo
  del `.eyebrow`.

Las **fuentes** son `src/assets/marca/banner_negro.png` (el lockup) e
`icono-21.png` (el icono): son artwork, no se generan — si hay que rehacer una
pieza se toca el script, no el PNG de salida.

Dos detalles que hay que respetar si se toca el script:
- **Las tipografías salen de los `.woff` de Fontsource convertidos a `.ttf` al vuelo**
  (`scripts/lib/woff-a-ttf.mjs`, WOFF1 = sfnt con cada tabla en zlib). Pango **no lee
  `woff2`** y falla en silencio cayendo a Arial, así que si se cambia a `woff2` las
  piezas salen con otra tipografía sin avisar.
- El artwork viene con alpha ~254, no 255: al quedarse con el calado hay que aplicar
  una rampa (`repintar(..., { calado:true })`), si no queda un velo de 1/255 y se ve
  un rectángulo fantasma alrededor del "21".

## Responsive y compatibilidad

Lo que hay que respetar para que el sitio siga entrando en cualquier pantalla y
cualquier navegador. Todo esto está verificado midiendo el layout de 320px a 2560px
de ancho (y en alturas de 390 a 1440), en la home y en la ficha de proyecto.

**Los cortes que mandan** (no son estéticos, cada uno tiene su geometría):
- **900px** → capa inmersiva (`immersive.ts`: además pide `pointer: fine` y no
  `prefers-reduced-motion`). Debajo, el hero es estático y el `<html>` no lleva
  `is-immersive`.
- **760px** → navbar horizontal ⇄ menú hamburguesa (`header.css`). Sale del ancho del
  wordmark + los 5 links.
- **1024px** → piso de ancho del cilindro helicoidal. Debajo de eso no entran los
  carriles de escape de los costados (ver la sección de proyectos) y el recorrido sería
  obligatorio: queda la grilla.
- **620px de ALTO** → piso del cilindro. El único corte del sitio que mira la altura
  además de las reglas de card chica del helicoidal (`max-height` 820/660).

**Cosas que ya se rompieron una vez y no hay que volver a romper:**
- **El "Estudio 21" del hero gira sólo en ≥900px.** El giro constante
  (`hero-spin-y`, modo base sin motor) a tamaño de celular era ilegible: el "21" mide
  ~123px y, de canto, las 16 capas del extruido se separan y se leen como un peine.
  Debajo de 900px el título va quieto, de frente (y no gasta batería animando 3D).
- **Las notas mono del fondo vivo (`.lbg-note`) se ocultan en ≤760px.** Van con
  `white-space: nowrap` y "EST·21 — ARQUITECTURA Y DESARROLLO" mide ~305px: en un
  teléfono se salía de pantalla por la izquierda.
- **El panel sticky del helicoidal va en `svh`** (`100vh` primero, de fallback). En
  iPad/Android `100vh` es el viewport GRANDE: el panel quedaba ~90px más alto que lo
  visible y el cilindro se cortaba abajo. **`dvh` no sirve acá** — cambiaría de alto
  en pleno scroll, justo mientras el recorrido está atado al scroll.
- **En grilla, `.ph-sticky` lleva `overflow-x: clip`.** El recorte vive en `.is-3d`,
  así que sin esto el "21" fantasma —que sangra a propósito— le sumaba ancho al
  documento. `clip` y no `hidden`: `hidden` forzaría `overflow-y: auto` y rompería el
  sticky del modo 3D.
- **Los hovers que mueven o elevan algo van detrás de `@media(hover:hover)`** (card
  de proyecto en grilla, miniatura de galería, flecha de contacto, botón de
  WhatsApp; el equipo ya lo hacía). En touch el `:hover` queda pegado después del tap
  y la card se quedaba levantada.
- **El burger mide 44×44** aunque el dibujo siga siendo de 30×24 (barras centradas +
  margen negativo que compensa). Antes el área tocable eran 24px de alto.
- **`will-change` en `.living-bg > *` sólo bajo `is-immersive`.** Sin motor promovía
  una docena de capas que no se mueven nunca — memoria de GPU regalada justo en el
  equipo que menos tiene.

**Compatibilidad (Safari/iOS es el que marca el piso):**
- `-webkit-backdrop-filter` **siempre** al lado de `backdrop-filter` (Safari <18 lo
  necesita): header, panel y submenú del nav, visor de galería, toggle del
  helicoidal.
- Cada `color-mix()` lleva **una declaración plana antes** como fallback. Si el
  navegador no lo soporta, la declaración entera se descarta y el panel queda
  transparente encima del contenido — justo donde importa la legibilidad.
- `-webkit-user-select` al lado de `user-select`; `-webkit-text-size-adjust: 100%` en
  `html` (iOS infla el texto al girar a horizontal) y `-webkit-tap-highlight-color:
  transparent` (el flash gris del tap choca con la paleta).
- `svh`/`dvh` van siempre con una línea en `vh` antes, de fallback.
- El arrastre de la tira de galería está limitado a `pointerType === 'mouse'`: en
  touch manda el scroll nativo.

**Sin scroll horizontal en ningún ancho.** `body` lleva `overflow-x: hidden` y los
fantasmas "21" sangran a propósito; verificado que no se pueda scrollear en x de
320 a 2560.

## Notas técnicas / convenciones

- **`window.scrollTo` instantáneo:** el `<html>` tiene `scroll-behavior: smooth`, y
  `behavior:'auto'` **respeta** ese valor (anima). Para saltos secos (p.ej. rebobinar el
  helicoidal al filtrar) usar **`behavior:'instant'`**, no `'auto'`.
- **`offsetTop` de un elemento `position:sticky` devuelve su posición YA PEGADA**, o
  sea que crece con el scroll. Por eso `headOffset` (lo que scrollea la sección de
  proyectos antes de que el panel se fije) se mide sobre **`.ph-head`**, que está en
  flujo normal, y NO sobre `.ph-sticky`. Medirlo mal era el bug de "al achicar la
  ventana el helicoidal deja de recorrerse": `layout()` corre en cada `resize` y en
  cada filtro, y con el panel pegado leía p.ej. 4032 en vez de 247 → `range` quedaba
  en ~0 y el progreso clavado en 0. Si se agrega otro cálculo de layout ahí, medirlo
  siempre contra un elemento que no sea sticky.
- **`headOffset` se remide con un `ResizeObserver` sobre `.ph-head`**, no sólo en el
  `resize` de la ventana. `layout()` corre apenas parsea el script, o sea con las
  métricas de la fuente **fallback**; cuando entra Space Grotesk el título reflowea y la
  medición queda vieja **sin que dispare ningún `resize`** → el tramo pegado se calcula
  corrido (el cilindro arranca desfasado y los carriles no se enteran de que el panel ya
  está pegado). Observando `.ph-head` —que es exactamente lo que se mide— la corrección
  llega sola. La primera notificación del observer se descarta: es el estado inicial.

## Pendientes antes de publicar

- **Dominio real** en `site` (`astro.config.mjs`) + `public/robots.txt` — de ahí salen canonical, sitemap y URLs absolutas de OG. Hoy es el placeholder `estudio21arq.com`.
- **Fotos de Sushi WOK Perú**: es el **único** proyecto sin portada ni galería (los otros 9 ya tienen). Van en `src/assets/proyectos/sushi-wok/`.
- **Imagen (o gráfico) de la columna izquierda de "Quiénes somos"**: hoy es un placeholder de blueprint. Una foto va en `src/assets/estudio/presentacion.*` y aparece sola; si va otra cosa (un plano, un SVG), hay que reemplazar esa columna en `Presentacion.astro`.
- **Años estimados** de Villa Platero, Vila Rodona y Chana I; m² (área construida) de esos tres. m² de Cavas de Haedo también es **estimado** (no oficial).
- Vila Rodona: confirmar mix de dormitorios y total de unidades.
- Sushi WOK: la ficha muestra "Unidades: Pendiente" por ser un local gastronómico — debería decir **"No aplica"**, que no es lo mismo que un dato que falta.
- **Teléfono e Instagram** en `src/data/site.ts` (hoy `null`): si se completan, aparecen solos en Contacto.
- Sección de **cómo invertir**: por ahora **no se hace** (decisión del 2026-08-18). La apuesta es que el impacto visual lleve al inversor a escribir; se puede retomar más adelante.
