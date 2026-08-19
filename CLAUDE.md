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
  descripción). Páginas de detalle `/proyectos/[slug]` con `getStaticPaths`.
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
(`Nosotros.astro`, la de las fases F01–F04) quedó con `id="como-operamos"`.
Navbar fina (58px) con el logo `banner_negro.png` ("ESTUDIO 21 ARQUITECTOS"); links
**Inicio · Nosotros · Proyectos · Equipo · Contacto** ("Contacto" es un link normal,
no CTA con recuadro). El `.nav` **no** usa `.wrap` (el contenedor centrado a `--maxw`
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
  mantiene alineados y el `padding-right` de la barra le reserva el lugar.

  Como la barra se come ~120px de la franja de arriba, el umbral de card chica subió
  de `max-height:680px` a **820px** (con un escalón extra a 660px): con la card grande
  la frontal quedaba recortada arriba y abajo en ventanas no maximizadas.
- **El giro arranca sólo cuando el panel se fija.** `headOffset` (= `sticky.offsetTop`,
  alto del header; recalculado en `layout()`) marca cuánto scrollea la sección antes de
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
- **Fallback:** el markup base es una lista semántica accesible (links navegables por
  teclado). Sin JS o con `prefers-reduced-motion` → grilla estática accesible; el 3D es
  sólo capa de presentación. `rAF` activo sólo con la sección visible
  (`IntersectionObserver`); sólo se tocan `transform`/`opacity`.

### Cómo operamos / Equipo / Contacto
- **Cómo operamos** (`Nosotros.astro` / `nosotros.css`, ancla `/#como-operamos`):
  cabecera simple (eyebrow + título + lead) y los bloques F01–F04. Las cifras de
  trayectoria **no** van acá: viven al pie de la sección de presentación.
- **Equipo** ("Nuestro equipo"): fotos optimizadas, `alt` con nombre + rol. Cada
  ficha muestra nombre y rol, sin ubicación.
- **Contacto:** mail real `estudiodearquitectos21@gmail.com` en texto + JSON-LD.

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

## Notas técnicas / convenciones

- **`window.scrollTo` instantáneo:** el `<html>` tiene `scroll-behavior: smooth`, y
  `behavior:'auto'` **respeta** ese valor (anima). Para saltos secos (p.ej. rebobinar el
  helicoidal al filtrar) usar **`behavior:'instant'`**, no `'auto'`.

## Pendientes antes de publicar

- **Dominio real** en `site` (`astro.config.mjs`) + `public/robots.txt` — de ahí salen canonical, sitemap y URLs absolutas de OG. Hoy es el placeholder `estudio21arq.com`.
- **Fotos de Sushi WOK Perú**: es el **único** proyecto sin portada ni galería (los otros 9 ya tienen). Van en `src/assets/proyectos/sushi-wok/`.
- **Imagen (o gráfico) de la columna izquierda de "Quiénes somos"**: hoy es un placeholder de blueprint. Una foto va en `src/assets/estudio/presentacion.*` y aparece sola; si va otra cosa (un plano, un SVG), hay que reemplazar esa columna en `Presentacion.astro`.
- **"Quince proyectos, una misma manera de hacer"** (título de la sección Proyectos, `ProyectosHelicoidal.astro`): hay **10** cargados. O se suman los que faltan o se ajusta el número.
- **Años estimados** de Villa Platero, Vila Rodona y Chana I; m² (área construida) de esos tres. m² de Cavas de Haedo también es **estimado** (no oficial).
- Vila Rodona: confirmar mix de dormitorios y total de unidades.
- Sushi WOK: la ficha muestra "Unidades: Pendiente" por ser un local gastronómico — debería decir **"No aplica"**, que no es lo mismo que un dato que falta.
- **Teléfono e Instagram** en `src/data/site.ts` (hoy `null`): si se completan, aparecen solos en Contacto.
- Sección de **cómo invertir**: por ahora **no se hace** (decisión del 2026-08-18). La apuesta es que el impacto visual lleve al inversor a escribir; se puede retomar más adelante.
