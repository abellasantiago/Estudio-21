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
  Los **helpers compartidos** viven en `global.css` (`.wrap`, `.eyebrow`, `.section-title`,
  `.lead`, `.marks`, `.ghost21`, `.status`, `.reveal`, `.btn`, y los tonos de sección
  `section.mesa` / `section.alt`) y NO tienen componente `.astro`: se usan como clase.
  Ver "Botón" más abajo antes de maquetar cualquier acción.
- **La capa mono tiene una escala y una regla de color** (tokens en `global.css`).
  El mono es la letra chica del sitio —eyebrows, chips, datos de las cards,
  etiquetas de la ficha, pie— y es la que más fácil se calibra para la pantalla
  del que diseña en vez de la del que lee. Dos tamaños, que son un PISO:
  **`--mono-dato` (12px)** para todo lo que lleva información y
  **`--mono-fino` (11,2px)** para lo secundario donde el lugar manda de verdad.
  Y el color: **`--ink-soft`** (9,4:1) para el mono que lleva información,
  **`--concrete`** (4,8:1) para lo secundario —pasa AA justo, no bajar de ahí— y
  **`--concrete-soft`** (2,8:1) **sólo para decoración**: no pasa AA sobre papel
  y nunca puede llevar un dato. ⚠ Sobre el fondo tinta (footer, Contacto) la
  tabla se invierte: ahí `--concrete-soft` sí pasa (5,0:1) y `--concrete` no.
  Y sobre la **mesa de Proyectos** (`section.mesa`, un punto más honda que el
  papel) `--concrete` se redefine a `#605E57` para conservar el mismo contraste —
  ver "los tres papeles" en "Home — secciones".
  Todo esto está medido, no estimado: hay un auditor que recorre cada bloque de
  texto de una página y reporta contraste y tamaño — ver "Verificar legibilidad".
- **Fuentes locales** (archivos woff2 de Fontsource, subset latin, sin Google Fonts CDN),
  pero con las `@font-face` declaradas a mano en `BaseLayout.astro` (NO importar los
  `.css` de `@fontsource/*`): cada woff2 se importa con `?url` y se usa la MISMA URL en
  un `<link rel="preload">` (con `crossorigin`, obligatorio en fuentes) y en su
  `@font-face` con **`font-display: block`**. Motivo: con los `.css` del paquete
  (`swap` + fetch perezoso post-layout) el primer paint de un refresh podía salir con la
  fuente fallback → "pantallazo" de un 21 distinto. Así las fuentes arrancan a bajar
  a ~0 ms y nunca se pinta un glifo de otra fuente.
  **Sólo se cargan los 4 pesos que el sitio realmente pinta** (Space Grotesk 500 y 700,
  Inter 400, IBM Plex Mono 400). Los otros tres que había (Space Grotesk 400, Inter 500,
  Mono 500) no los usaba nada: eran 52 KB de descarga **bloqueante** en cada página,
  porque un `preload` baja sí o sí, se use o no. Si se agrega un peso nuevo en algún CSS
  hay que **sumarlo a la tabla `fontFaces` de `BaseLayout`**: si no está declarado, el
  navegador lo sintetiza (falso bold) o cae al más cercano — que es lo que pasaba con el
  `font-weight:600` de `.ph-name`, que en realidad se veía 700 (hoy declarado 700).
- `@astrojs/sitemap`, `sharp`.
- Imágenes con `<Picture>` de Astro (AVIF + WebP + srcset). **Las fuentes de
  `src/assets/` son AVIF**, generadas a mano con `scripts/optimizar-fotos.mjs` —
  ver "Fotos — formato, peso y entrega", que explica por qué AVIF y no WebP, y
  qué hay que respetar al agregar una foto o un `<Picture>` nuevo.
- Comandos: `npm install`, `npm run dev` (→ `http://localhost:4321`), `npm run build`
  (→ `dist/`), `npm run preview`, `npm run check` (astro check).

## Deploy

**Trabajo de código:** se trabaja directamente en `main`. Las ramas anteriores
ya están incorporadas y eliminadas tanto localmente como en el remoto; no hay
trabajo pendiente de mergear. Un push a `main` también publica el sitio.

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
  El **orden editorial** (primero en proceso, después próximamente, al final
  terminados; por año descendente dentro de cada grupo) vive en
  `src/lib/proyectos.ts` y lo comparten el cilindro de la home y las flechas
  Anterior / Siguiente de la ficha — tienen que recorrer el mismo anillo.
  Cada proyecto lleva además **`direccion`** (calle y número) y **`coords`**
  (`[lon, lat]`), que son lo que ubica la cruz del mapa de situación de la ficha
  — ver "Mapa de situación". Las diez coordenadas se geocodificaron una vez a
  mano; **no se geocodifica en el build**.
- **Equipo:** los integrantes en `src/data/equipo.ts` (sólo `slug`, `nombre`, `rol`).
  **Sin ubicación**: mostrar que dos arquitectos están en España abría la pregunta
  "¿quién supervisa mi obra en Montevideo?" — más ruido que beneficio para un
  inversor. Datos del estudio (mail, dirección, redes) en `src/data/site.ts` — lo que
  se completa aparece solo en Contacto.
- **Fotos por convención** (`src/lib/images.ts`): tirar imágenes en
  `src/assets/proyectos/<slug>/` (`portada.*`, `galeria-*.*`) y `src/assets/equipo/<slug>.*`
  y aparecen solas, sin listarlas. Hasta que existan, se muestra un placeholder.
  La columna gráfica de "Quiénes somos" **no** es una foto: es la axonometría que se
  genera en el build (ver "Axonometría de Quiénes somos").
- **Sushi WOK Perú** está terminado (octubre de 2026). Su carpeta de imágenes
  conserva una portada para card, ficha y vista previa del menú, y ocho fotos
  retocadas (`galeria-01` a `galeria-08`) — **las ocho siguen en WebP** y no en
  AVIF, porque salían del retoque tan bien comprimidas que convertirlas no
  ahorraba nada (ver "Fotos — formato, peso y entrega"). Orden: fachada diurna,
  salón principal, salón con hormigón visto, salón con parquet, detalle de escalera,
  barra, cocina y fachada nocturna. La galería conserva las proporciones de cada
  toma y carga las versiones grandes al abrir el visor.
- **Geometría del mapa** (`scripts/bajar-mapa.mjs` + `scripts/lib/shapefile.mjs`):
  baja la costa, los barrios de la Intendencia y las avenidas, y escribe
  `src/data/mapa/montevideo.json`. Se corre **a mano**, no en el build. Ver
  "Mapa de situación".
- **Piezas de marca derivadas** (`scripts/generar-marca.mjs`): `public/favicon.png`,
  `apple-touch-icon.png` y `og-default.png` **no se editan a mano** — se generan del
  logo real (`src/assets/marca/banner_negro.png`) con la paleta del sitio. Ver
  "Marca" más abajo.

## Fotos — formato, peso y entrega

Dos cosas distintas que conviene no mezclar: **la fuente** que vive en el repo y
**lo que baja un visitante**, que Astro reencodea en el build. Todo lo de acá
está medido con SSIM contra el original, en la ruta de entrega más exigente del
sitio (el visor de la galería, que sirve a `min(ancho,1800)`); los números viven
en la cabecera de `scripts/optimizar-fotos.mjs` y en los comentarios de cada
componente.

**Las fuentes son AVIF q80**, y las produce `node scripts/optimizar-fotos.mjs`
**a mano** (no en el build), igual que el mapa y las piezas de marca. Se corre
después de tirar fotos nuevas y se puede correr siempre: saltea lo ya convertido.
Cuatro decisiones que ya se tomaron y no conviene rehacer a ojo:
- ⚠ **WebP se probó y se descartó para las fuentes.** A la calidad que hace falta
  los archivos salían **más grandes que el JPEG original** (+15% a +20%) y además
  más blandos (SSIM −1,3% a −1,7%): su encoder alisa el detalle fino, que en
  fotos de fachada es justo lo que se mira. En los retratos recortados es peor
  (SSIM 0,79–0,90 contra 0,99 de AVIF: le arruina el borde del alfa).
- **No se reescala.** El ancho máximo que el sitio pide es 1800 y las fuentes son
  de 2000, así que recortarlas parecía gratis: no lo es. La fuente a 1800 obliga
  al navegador a un segundo remuestreo para llegar al ancho de pantalla, y eso
  costó hasta −3% de SSIM en las fotos con detalle fino.
- **El alfa se conserva sólo en `equipo/`**, que son recortes sobre transparencia
  (ese canal ES el fondo de la foto). En `proyectos/` cualquier alfa es basura de
  un guardado mal hecho y se aplana contra `--paper`. Tres archivos venían
  guardados como PNG con extensión `.jpg` —uno de ellos con alfa, 916 KB para
  0,5 MP— y eran el peor desperdicio del repo.
- **Nunca se reencodea por menos de un 8% de ahorro** (`MIN_AHORRO`): la
  conversión cuesta una generación de pérdida y tiene que comprar algo. Por eso
  **quedan `.jpg` y `.webp` sueltos entre los `.avif` a propósito** (varias de
  Villa Platero y casi toda la galería de Sushi WOK ya venían bien comprimidas);
  `src/lib/images.ts` los descubre igual por convención de carpetas.

Del lado de **la entrega**, cuatro cosas que son fáciles de romper:
- **Las cards de proyecto van con `<Picture>`, no con `<Image>`.** `<Image>` emite
  UN solo formato y el default de Astro es webp (`DEFAULT_OUTPUT_FORMAT`), así que
  las diez cards —lo más visible de la home— eran las únicas fotos del sitio que
  no recibían AVIF. Van en `quality={70}` y no en el default de Astro: a avif q50
  pesan la mitad pero el SSIM cae un 1,5%, y esa card se agranda a 1,70× al pasar
  por el frente del cilindro. ⚠ Al envolver una foto en `<Picture>` hay que
  agregarle la regla `picture{display:block;width:100%;height:100%}` a su CSS: el
  `<picture>` es inline y sin eso el `height:100%` del `<img>` se mide contra un
  contenedor del alto del contenido. Lo llevan `.ph-thumb`, `.proj-cover`,
  `.gal-item` y `.person .portrait`.
- **El `sizes` de las miniaturas de la galería lleva un `calc(... * 22vh)`**, no
  un número de píxeles, porque `--gal-h` es `clamp(150px, 22vh, 240px)` y el
  hueco real cambia con el alto de la ventana. Los dos tramos planos del clamp
  van como condiciones de media delante. Había un `sizes="252px"` fijo —de un
  clamp anterior— que declaraba de más casi siempre; declarar el máximo (240) es
  todavía peor, porque en la ventana de 900px de alto, que es la más común, el
  hueco mide 198. ⚠ Si cambia el clamp en `galeria.css`, cambian los números de
  `Galeria.astro`.
- **El visor de la galería sirve AVIF y cae a WebP**, y la elección la hace el
  script (`url()`), no un `<picture>`: el visor precarga las dos fotos vecinas con
  `new Image()` y hay que precargar el mismo archivo que después se muestra. El
  `href` del `<a>` se queda en webp, que es lo que abre un navegador sin JS.
  ⚠ El soporte se detecta con una sonda: un AVIF de 1px en base64. **Tiene que ser
  un AVIF válido de verdad** (generado con sharp): hubo una mal armada y el
  navegador tiraba `onerror`, así que `avifOk` quedaba en false para siempre y el
  visor servía webp a todo el mundo, en silencio y sin romperse. Si se toca, hay
  que verificar en un navegador que el visor baje `.avif`.
- **El logo del navbar va con `densities`, no con `widths`/`sizes`.** Se muestra a
  111px de ancho (`.mark-img` lo topa en `height:2rem`) y se pedía a `width={864}`
  —el ancho del PNG—: 35 KB para pintar 111, en cada página. Con `widths` el `src`
  de respaldo sigue saliendo al ancho del original y el build emite igual ese
  archivo; con `densities` el respaldo es el de 111px y el de 864 no existe.

⚠ **El build en frío pasó de 3m58s a 9m18s**: AVIF decodifica bastante más lento
que JPEG y cada variante vuelve a decodificar la fuente. Localmente no se nota
(el caché de `node_modules/.astro/assets` deja los builds en ~6s), pero en CI cada
push arrancaba de cero, así que `deploy.yml` **cachea esa carpeta** (unos 108 MB)
con `restore-keys`, para que al cambiar una foto se reusen igual las variantes de
todas las demás.

## Home — secciones

Orden: **Hero · Quiénes somos · Proyectos · Cómo operamos · Equipo · Contacto**
(`src/pages/index.astro`, desde el 2026-11-12). **El orden responde las preguntas
de quien llega, en el orden en que se las hace**: qué es esto, qué hicieron, cómo
se trabaja con ellos, quiénes son, cómo los contacto. Hasta esa fecha "Cómo
operamos" iba ANTES que Proyectos, o sea que se explicaba el proceso antes de
mostrar la prueba: leídas sin haber visto un edificio, las cuatro fases son una
promesa que puede escribir cualquiera; leídas después de diez obras, explican cómo
se hicieron. Y la primera foto de arquitectura aparecía en la pantalla 4,8 de 10
(medido a 1440×900): ahora aparece en la 3,9, y en el celular en la 2,3. El
navbar ya decía "Inicio · Nosotros · Proyectos · Equipo · Contacto"; la página es
la que ahora lo cumple. Proyectos **no** va pegado al hero: el hero no dice qué hace
el estudio, y unas cards sin contexto no se sabe si son obras propias, encargos o
fotos de referencia — Quiénes somos lo aclara en una pantalla.
Ojo con los anclajes: **`#nosotros` es la sección de presentación**
(`Presentacion.astro`) — el link "Nosotros" del navbar entra por ahí, que es donde
se dice quiénes son; la sección del modelo de trabajo (`Nosotros.astro`, la de las
cuatro fases) tiene `id="como-operamos"`.

**Las secciones se separan por el tono del papel, no por filetes: "los tres
papeles"** (2026-11-13, bloque con ese nombre en `global.css`). Tres valores a la
misma distancia —unos 8 niveles entre uno y otro— y, al pie, la tinta:

| Clase | Tono | Secciones |
|---|---|---|
| `section.mesa` | un punto más hondo, ≈ `#E1DFD8` | Proyectos |
| (sin clase) | el papel abierto, `--paper` `#EAE8E2` | Hero, Quiénes somos, Cómo operamos |
| `section.alt` | un punto más claro, `--paper-2` `#F2F1EC` | Equipo |
| `.contact` | `--ink` | Contacto |

Así **ninguna sección queda pegada a otra del mismo tono**, salvo el hero y Quiénes
somos, que son a propósito un mismo espacio. Con el cambio de orden del 2026-11-12
Quiénes somos, Proyectos y Cómo operamos habían quedado las tres sobre el mismo
papel, separadas sólo por dos `hr.section-rule`, y se leían como un bloque
continuo; las reglas se sacaron (y el helper con ellas) porque ahora el tono es la
división. Las cards de proyecto son de papel claro: sobre la mesa se despegan
solas, como láminas apoyadas en la mesa de trabajo.
- ⚠ **La mesa es un TINTE translúcido** (`rgba(110,98,78,.07)`), no un color
  plano: deja ver el fondo vivo (grano, "21" fantasma, marcas), así que sigue
  siendo el mismo espacio con la luz un punto más baja. Un plano opaco lo cortaría
  en seco y además el motor lo seguiría animando sin que se vea: `immersive.ts` lo
  apaga recién en la primera sección OPACA, que sigue siendo Equipo. El tinte es
  marrón y no gris porque un gris enfriaba el papel.
- ⚠ **Sobre la mesa se redefine `--concrete`** (a `#605E57`, en el mismo
  `section.mesa`): el de siempre da ahí 4,37:1 y no pasa AA; el nuevo da 4,86,
  casi lo mismo que el `--concrete` tiene sobre el papel (4,77). Al ser el token,
  el eyebrow, los filtros, el contador del 3D y el indicador del carrusel lo
  toman solos. Medido en el sitio.

**Las tres primeras secciones no pintan fondo opaco** —Quiénes somos, Proyectos y
Cómo operamos—, ni "21" fantasma, ni marcas de registro propias: todo eso lo pone
el fondo vivo (`LivingBackground`), con el motor y sin él. Antes había parches en
`immersive.css` que las volvían transparentes sólo en la home inmersiva; fuera de
ella (celular, tablet) Proyectos tenía un `--paper` opaco y se armaba un sándwich
de papeles. Se sacó de raíz en cada componente, así todas las pantallas ven lo
mismo. **Equipo es la primera sección que tapa el fondo** (`section.alt`) y es la
que usa el motor para apagarlo (ver "Zonas" en el presupuesto del motor).

El aire vertical de las secciones es **asimétrico a propósito** (tokens
`--sec-pad-top` / `--sec-pad-bottom` en `global.css`, usados por `section.block` y por
`.contact`): el techo mide ~78% del piso. Así cada sección "sube" y su título queda
más cerca del borde donde empieza —el cambio de tono— que del contenido de la
sección de arriba. Si se vuelven a igualar, el título se despega de su sección.

Navbar fina (58px) con el logo `banner_negro.png` ("ESTUDIO 21 ARQUITECTOS"); links
**Inicio · Nosotros · Proyectos · Equipo · Contacto**. **"Contacto" va en petróleo**
(`.nav-contacto`, 2026-11-11) y el resto en `--ink-soft`: es la acción del sitio y
hasta ahora se veía igual que "Inicio". **No lleva recuadro** —un botón relleno en una
barra de 58px rompe la línea de mono y pelea con el logo—; el color alcanza, y es el
mismo petróleo que ya significa "acción" en el botón primario y en el de WhatsApp.
Medido: 7,7:1 sobre el papel. El subrayado del hover lo acompaña en petróleo (si no,
al pasar el mouse volvía al negro de los demás) y **el color no cambia en hover**: el
petróleo ya es el estado marcado. **"Proyectos" abre un desplegable anidado** (`Header.astro` +
`header.css`): panel con los tres estados —En proceso · Próximamente · Terminados— y,
dentro de cada uno, un **submenú con sus proyectos** (nombre + año) que linkea directo
a la ficha. Los datos salen de la content collection, con el
mismo orden editorial que la sección de proyectos. Detalles a respetar:
- Sin JS abre con **`:hover` y `:focus-within`**. Con JS (`.js-nav`), cada nivel
  abre sólo con **`.is-open`**, sincronizado con mouse, foco y `aria-expanded`.
  Al salir se cierra el árbol completo, se limpian `.is-prev` / `.tiene-prev`,
  timers y rastro del puntero. Los paneles ocultos llevan `pointer-events:none`:
  pasar por donde estuvieron no los vuelve a abrir. En mobile / `hover:none`
  abre con tap; Escape y click afuera también cierran. Escape devuelve el foco
  al disparador **antes** de cerrar, para que `focusin` no lo reabra.
- `.nav-links` lleva **`align-self:stretch`** para tomar los 58px del navbar: si no,
  mide sólo el alto del texto (~30px) y el panel, que cuelga de `top:100%`, arrancaba
  montado sobre el navbar.
- El submenú va **pegado al panel** (el margen compensa el `padding` del panel, porque
  `left:100%` se mide desde la fila y no desde el borde): con aire en el medio, el
  mouse "se sale" al pasar de un nivel al otro y se cierra a mitad de camino.
  Dos puentes transparentes cubren el píxel del borde del header y el padding
  entre el estado y su lista; sólo reciben el mouse mientras el menú está abierto.
- Sale **hacia la izquierda** cuando no entra a la derecha (`.flyout-left`, lo mide el
  script al abrir y en cada resize). Como el navbar está alineado a la derecha, en la
  práctica casi siempre cae de ese lado.
- En **mobile** (≤760px) no hay hover: el desplegable pasa a **acordeón** dentro del
  menú hamburguesa (los paneles entran en el flujo, indentados) y `.nav-links` scrollea
  solo (`max-height` + `overflow-y`) por si la lista abierta pasa el alto de pantalla.
- Cada proyecto del submenú muestra su **vista previa** del lado de afuera: portada
  chica + chip de estado + barrio, que se funde de un proyecto a otro (`.nav-prev`).
  Sólo con mouse y navbar horizontal. Tres cosas que parecen detalle y no lo son:
  el **marco es uno solo por submenú** (`::before`) y las fotos se funden adentro —si
  cada una llevara su marco, a mitad del fundido habría dos papeles al 50% encimados
  y la sombra parpadearía—; el proyecto activo lo marca el script (`.is-prev`, el
  último que tocó el mouse) y **no `:hover`**, con una "puntería" que espera un
  instante mientras el puntero va en diagonal hacia la foto (si no, la vista previa
  cambiaba justo mientras uno iba a mirarla); y `placeFlyout()` busca un lado donde
  entren **submenú + vista previa juntos**, y si no entra en ninguno deja el submenú
  donde quepa y esconde la previa (`.sin-preview`).
- Las fotos de la previa recién se piden al abrir el menú por primera vez
  (`.prev-lista`; hasta entonces van con `display:none` y el lazy-load no las baja):
  son unos KB que no tiene sentido cargar en cada página.
- El **subrayado de los links entra por la izquierda y sale por la derecha** — una
  línea a ancho completo escalada en X, donde lo que cambia de lado es el
  `transform-origin`, con `0s` de duración y el retardo del propio trazo para que el
  salto de origen caiga cuando la línea ya no se ve. Con el desplegable abierto,
  "Proyectos" queda subrayado aunque el mouse esté recorriendo el panel.

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
- **Duración ~2,9 s** hasta ver el hero: 1,95 s de trazado (`--pl-load`, que el script
  calcula y mide la barra de carga) + `HOLD` 0,15 + `TRANS` 0,8 de barrida. Estaba en
  **6,07 s** y se recalibró a la mitad bajando todo en proporción (2026-11-05), para que
  el dibujo se siga percibiendo capa por capa en vez de aparecer de golpe: era mucha
  puerta delante de la primera visita de alguien que no sabe que puede saltearlo tocando
  la pantalla. ⚠ Si se tocan los tiempos, `STROKE` tiene que coincidir con `pl-stroke` y
  `TRANS` ser ≥ `pl-wipe-up`, las dos en `preloader.css`.
  La planta es genérica ("unidad tipo"), no un proyecto real: se puede cambiar por la
  planta de un proyecto cuando se quiera.

### Hero (capa inmersiva)
- Motor en `src/scripts/immersive.ts` (sólo en la home, `data-immersive-page`, y sólo
  si no hay `prefers-reduced-motion`, con puntero fino y pantalla ≥900px). Progressive
  enhancement: sin eso, queda estático y legible.
- El "Estudio 21" hace un **péndulo** en 3D en reposo y, al bajar por el hero, **una
  vuelta entera de salida** mientras retrocede en Z y se desvanece; además parallax
  de mouse en las capas `[data-depth]`, corredor de marcos que avanza en Z y rail de
  progreso. Ver "Péndulo y giro de salida" abajo.
- **Péndulo y giro de salida — dos movimientos con reglas opuestas.**
  - **En reposo (por reloj):** va y viene entre **±40°** (`SWING`) con un ciclo de
    **10 s** (`SWING_PERIOD`), sin completar nunca la vuelta. El máximo real es
    **~45°** (los 40 del péndulo + los 5 de la inclinación hacia el mouse, que sólo
    actúa arriba del todo, con `rest` > 0). El seno da el arranque en **0° exacto**
    —el mismo estado que pinta el CSS antes del primer frame, sin salto— y de yapa
    la física correcta: rápido al cruzar el frente, frenando en los extremos.
  - **Al irse (por scroll):** `Math.pow(introProgress, EXIT_EASE) * EXIT_SPIN` suma
    **360°** a lo largo del tramo. Como sale de `introProgress` —función pura del
    scroll— **subir lo desanda solo**: arriba de todo vuelve a 0°, Z 0 y opacidad 1,
    sin ningún estado que resetear (verificado en el sitio andando).
  - ⚠ **Por qué el reposo NO se ata al scroll pero la salida SÍ.** El problema de
    siempre es la **espalda** (a 180° se ve la capa más lejana del extruido,
    espejada y en gris claro — el navegador no oculta la cara trasera) y **el canto**
    (cerca de 90° las 16 capas se separan y el "21" se lee como un peine). En reposo
    eso arruina la marca, así que el péndulo se queda corto. En la salida no molesta,
    porque para cuando llega la espalda el bloque ya está lejos y translúcido. Se
    probaron además dos formas de atar el *vaivén* al scroll y ninguna quedó: sumarle
    un ángulo chico no se percibía (0,02°/px, el hero se sentía estático), y meter el
    scroll en la fase del seno lo sacudía con la rueda del mouse.
  - ⚠ **`EXIT_EASE` (2.5) y el tramo del fade están calibrados juntos.** Con el
    exponente el giro arranca lento y acelera, así que los 180° caen recién al **76%**
    del tramo; y `heroFadeOut` va de **0.5→0.9** (no 0.65→1) para que en ese punto la
    opacidad sea **0,35** en vez de 0,69. Medido en el sitio: a 76% el título está en
    `rotateY(181°)`, `translateZ(-350px)`, opacidad 0,35 — la espalda pasa casi sin
    verse. Con el fade viejo se leía clarísimo el "OIDUTSE" al revés. **Si se toca
    uno de los dos, hay que rever el otro.**
  - El corredor de marcos comparte `heroFadeOut`, así que también se va un poco antes
    que antes — no molesta, era justamente para que no compita con la lectura.
  - El fallback CSS (`hero-sway-y` en `hero.css`, para sin-JS / puntero grueso)
    replica el vaivén con los tiempos de un seno (0/25/75/100%) y el **easing por
    tramo** (`ease-out` / `ease-in-out` / `ease-in`). Si se cambia la amplitud o el
    período hay que tocar **los dos lados** para que sigan siendo el mismo
    movimiento.
- **Presupuesto de trabajo por frame — el motor es lo más caro del sitio, así que
  sólo trabaja cuando hace falta** (todo medido; el efecto se ve idéntico, verificado
  con diff de píxeles: la diferencia antes/después queda POR DEBAJO del ruido natural
  entre dos cargas del mismo código, porque la deriva del fondo arranca con fase
  aleatoria). Cuatro reglas que hay que respetar si se toca `immersive.ts`:
  - **Zonas.** Cada bloque corre sólo si lo que anima está a la vista. El bloque del
    "21" (transform sobre un `preserve-3d` de 25 capas + la sombra) se saltea entero
    fuera del tramo del hero, y el fondo vivo cuando la primera sección OPACA
    (`#estudio`, Equipo, `section.alt`) llega al tope y lo tapa — es `position:fixed`, así que
    el corte es `scrollY < opaqueTop`, no un rect. Medido: pasadas las secciones
    opacas el motor hace **0 frames** (antes seguía a 60fps hasta el pie de página).
  - **Escribir sólo si cambió** (`put`). Tocar el DOM dispara recálculo de estilo
    aunque se escriba el mismo valor. Quieto en el hero eran ~120 escrituras por
    segundo para dejar todo igual.
  - **Los custom properties se HEREDAN — ojo dónde se escriben.** `--shadow-pulse` iba
    en `.hero-title` e invalidaba el estilo de sus 26 descendientes (las 25 capas del
    extruido) en cada frame; ahora va en `.ht-shadow`, su única consumidora.
    `--hero-fade` iba en `:root` e invalidaba el documento ENTERO (~840 nodos); ahora
    va en `.hero` y `.living-bg`, que contienen a todos sus consumidores
    (`.hero-stage::before`, `.hero-eyebrow`, `.hero-wireframe`,
    `.lbg-note`). Si se agrega un consumidor fuera de esos dos, hay que sumarlo ahí.
  - **Geometría cacheada** (`measure`): las posiciones son invariantes al scroll, así
    que se miden al cargar, en `resize` y cuando cambia el alto del documento (un
    `ResizeObserver` sobre el `body`: fuentes, imágenes, el helicoidal al filtrar).
    Medirlas dentro del frame, además de costar, fuerza layout sincrónico.
  Con eso el loop **se apaga solo** (`idle`) cuando no queda nada continuo que animar;
  `kick()` lo despierta con cualquier scroll, movimiento de mouse o resize — el
  paralaje de las secciones de abajo sigue respondiendo al mouse igual que antes.
  El **rail de progreso** salió del rAF: sólo depende del scroll, así que se pinta en
  el listener (`paintRail`) y sigue exacto aunque el motor esté dormido.
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
  ~43–53%); los centros en y < 50% (50/47,1/44,2/42,1%) los estiran hacia atrás.
  Tupida: alfas altas (0,9/0,74/0,62/0,5) y caída tardía a transparente.
  - ⚠ **A 90° la perspectiva aplasta la distancia hacia atrás**, así que para que
    la sombra gane *recorrido* visible hay que exagerar mucho en las unidades del
    plano: llevarla de 62% a **120% de alto** con los degradés reescalados sólo
    corrió el borde lejano **27px** en pantalla. Si se quiere más, hay que seguir
    agrandando el plano — no alcanza con mover los centros.
  - ⚠ **Los radios verticales son % de la altura DEL PLANO**: al cambiar `height`
    hay que reescalar los cuatro degradés o cambian de tamaño solos. La oclusión de
    contacto se recalculó (3,6%) justamente para quedar **igual de fina** que antes:
    es la que hace que el "21" se lea apoyado, y engordarla lo despega del piso.
  - Al agrandar el plano los degradés se superponen más, así que la sombra **gana
    densidad además de alcance**. Se probó bajarle las alfas exteriores para dejar
    sólo el alcance, pero quedó demasiado tímida: la elección fue la versión densa
    (decisión del 2026-09-09). Si alguna vez se quiere alcance sin peso, el ajuste
    es bajar esas dos alfas (0,62 y 0,5), no achicar el plano.
  `--shadow-pulse` (motor) la respira según el ángulo (cuanto más girado, menos
  huella; con el péndulo es un latido sutil, porque el recorrido es corto).
  Funciona también en el fallback (la rota la animación CSS
  `hero-sway-y`). El bloque `.hero-title` entero lleva `user-select: none` (el
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
  queda visible estático.
  **En <900px es el visual del hero mobile** (2026-11-05). Antes iba `display:none`
  porque el dibujo es 16:9 y, con el `slice` que pide el SVG, el navegador lo escalaba
  para CUBRIR una caja alta y angosta: lo magnificaba ~3× y las líneas cruzaban los
  textos. El arreglo no fue otro dibujo sino darle a la caja del `<svg>` la **misma
  proporción que su viewBox** (`aspect-ratio:1600/900`): así `slice` no recorta nada y el
  pabellón entra entero, como una franja de horizonte detrás del "21". Manda el **alto**
  (`clamp(200px,40vh,420px)`) y el ancho sale de la proporción, así pesa lo mismo en un
  teléfono chico que en una tablet en vez de crecer con el ancho; sangra a los costados a
  propósito (`overflow:hidden` en el contenedor para no sumar ancho al documento) y los
  extremos se disuelven contra el fade del propio SVG. **No costó un byte: el SVG ya
  viajaba en el HTML, apagado.**
- **Textura técnica**: grano de papel (feTurbulence en data-URI, multiply, opacidad
  0.07, `.lbg-grain`) en el fondo vivo. Luz de estudio en el stage
  (`.hero-stage::before`: centro apenas más claro + viñeta sutil). Los parches de
  puntos matriz que hubo acá se sacaron (no gustaron).
- Easter egg de blueprint "linterna" (`HeroBlueprints.astro`): **eliminado**. Estuvo
  desactivado un tiempo (import y uso comentados en `Hero.astro`) y se sacó en la
  limpieza junto con `hero-blueprints.css`. Era un plano a la izquierda del "21" que se
  descubría con el mouse. Si se quiere retomar, está entero en git: los archivos viven
  en el commit `51a539c` (`git show 51a539c:src/components/HeroBlueprints.astro`).
- **En el hero NO va la dirección del estudio.** Hubo una línea mono
  **"21 de Setiembre 3024"** bajo el "21" (`.hero-dim`) y se sacó (2026-11-09):
  arriba de todo el visitante no está ubicando el estudio en un mapa, está
  tratando de entender qué hace. La dirección sigue donde sirve, en Contacto y
  en el JSON-LD.
- **Debajo del "21" no va ninguna frase.** Se probó subir el claim al hero —el
  propio "Desarrollamos, no solo proyectamos." de "Cómo operamos"— en una línea
  display bajo el lockup, y se descartó (2026-11-09, decisión del estudio): el
  hero se queda con el eyebrow, el "21" y nada más. Si alguna vez se retoma,
  dos cosas que ya se aprendieron: el claim tiene que ir FUERA del elemento con
  `data-immersive-title` (es el que gira en 3D) y, si se lo mete en el `<h1>`,
  el lockup tiene que salir de ahí —son 25 capas con el mismo texto y el título
  le llega a Google como "Estudio Estudio Estudio… 21 21 21…".
- **`--hero-fade`** (seteado por `immersive.ts` según el scroll) desvanece al dejar el
  hero y trae de vuelta al subir: las notas mono del fondo vivo y
  el eyebrow **"Arquitectura que trasciende"** (combinado con su reveal-on-scroll inicial
  vía una custom property `--reveal`, no pisa la transición de `.reveal`).
  **Sin motor** (touch, reduced-motion, sin JS) nadie escribe `--hero-fade`, y las
  notas mono —que son `position:fixed`— quedaban a 0,5 sobre toda la página: pasaban
  por detrás de la axonometría de "Quiénes somos", que va sin recuadro. Ahí las
  desvanece una scroll-driven animation (`html:not(.is-immersive) .lbg-note`, en
  `immersive.css`) en el mismo tramo que usa el motor: el primer 70% de pantalla.
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
- **La columna gráfica es una axonometría seccionada** que se dibuja con el scroll
  (`Axonometria.astro`, ver la sección siguiente). Va **suelta sobre el papel de la
  página**: `.pres-visual` no lleva fondo, filete, marcas de registro ni pie. Al
  principio fue una lámina `--paper-2` con filete y un pie ("Axonometría seccionada ·
  Vivienda tipo"), pero ese recuadro claro contrastaba de más con el fondo y se sacó
  (decisión del 2026-09-15). Tampoco lleva `.reveal`: la animación del dibujo ya hace
  la entrada.
- **La axonometría sólo se ve con las dos columnas.** En ≤900px, donde el grid pasa a
  una columna, quedaría arriba del texto y bajando del hero se pasaría primero por el
  dibujo: ahí `.pres-visual` va con `display:none` y del hero se entra directo al
  texto (decisión del 2026-09-15). El SVG igual viaja en el HTML.
- **Título: "Estudio 21"** (sin "Arquitectos" — así no repite el lockup del logo del
  navbar), con eyebrow "Quiénes somos".
- **Los tres párrafos bajan de intensidad** (el primero en `--ink-soft`, los otros dos
  en `--concrete`). El copy **se reescribió entero** (2026-11-11): era el texto del
  WordPress viejo tal cual, que presentaba a Estudio 21 como un estudio de
  arquitectura que trabaja "en colaboración con nuestros clientes" —o sea, un
  estudio de servicios—, declaraba obra "residencial, comercial e industrial"
  (de industrial no hay ninguna) y no traía un solo dato verificable.
  - ⚠ **EL ESTUDIO TRABAJA DE DOS MANERAS, Y LAS DOS VAN EN EL COPY.** (a) Origina
    sus propios desarrollos: consigue el terreno o la propiedad a reciclar, dibuja
    el proyecto, lo arma como negocio y después sale a buscar a los inversores que
    lo financian — **es la modalidad más frecuente**. (b) Toma encargos de terceros
    que ya tienen el inmueble y contratan al estudio para proyectar y dirigir la
    obra (Patios del Regimiento y Sushi WOK, confirmados por el estudio). Ningún
    texto del sitio puede negar la segunda ni presentarla como el modelo central.
    El lead de "Cómo operamos" **afirmaba** *"Estudio 21 no trabaja a honorarios
    para terceros"*, que además de ser falso le cerraba la puerta a quien llega con
    su propio terreno; hoy abre con la originación y cierra con *"Cuando el inmueble
    es de un tercero, asumimos el mismo recorrido para él"*, que deja válidas las
    cuatro fases de abajo (describen la modalidad (a)).
  - **La división de trabajo entre las dos secciones se mantiene**: acá va la
    identidad —qué es el estudio y cómo llega a cada obra—, y en "Cómo operamos"
    el modelo paso a paso. El segundo párrafo nombra las dos modalidades sin
    explicar el mecanismo, que es trabajo de la otra sección.
  - **El texto dice lo que las cifras no pueden.** Abajo ya están +10 años, +15
    proyectos y 06 profesionales: repetir esos números gasta renglones.
  - **Sin atenuantes.** Se descartaron "la mayoría de las veces" y "la mayoría de
    nuestros proyectos" (decisión del estudio): la jerarquía entre las dos
    modalidades la da **el orden de las frases** —primero la propia, después
    "También…"—, no un adverbio que suena a que el estudio se está midiendo. Por la
    misma razón el segundo párrafo arranca directo con los verbos, sin frase que lo
    presente: se probaron cinco arranques ("Originamos nuestros desarrollos",
    "Desarrollamos por cuenta propia", "Tomamos la iniciativa"…) y ganó no poner
    ninguno. Y el remate es **"respondemos por el proyecto y por la obra"**, no
    "son nuestras": al inversor le importa quién se hace cargo, no de quién es.
  - **El lead de "Nuestro equipo" (`Estudio.astro`) se corrigió en la misma
    tanda** (2026-11-11): era la última frase del sitio que presentaba al
    estudio como proveedor de servicios ("foco en las necesidades de nuestros
    clientes"). Conserva el molde de siempre —"Nuestro equipo está formado
    por… que comparten un mismo objetivo: …"— porque el registro cálido de esa
    sección es deliberado; lo que cambió es el final, que ahora habla de la
    obra: "que cada obra llegue a término con la calidad con la que fue
    pensada". ⚠ **No cerrarlo con "espacios que mejoren la vida de quienes los
    habitan"**, por tentador que suene: es casi textual el remate del tercer
    párrafo de "Quiénes somos" y quedarían dos secciones de la misma página
    terminando igual.
- **Cierra con las cifras de trayectoria** (`.pres-cifras`, +10 / +15 / 06) como banda
  horizontal de 3 columnas bajo una línea `--ink`, igual que la grilla de fases. La
  primera celda va sin `padding-left` para que el número alinee con el borde del
  contenido. Marcado `<dl>` con `<dt>` (etiqueta) antes de `<dd>` (cifra) para que el
  lector de pantalla lea "Años de trayectoria: +10", y `column-reverse` para que en
  pantalla mande la cifra. **Ojo con `justify-content: flex-end`**: en `column-reverse`
  el eje va de abajo hacia arriba, así que eso apila contra el borde superior — sin
  eso, una etiqueta que parte en dos líneas (pasa en mobile) empuja su cifra hacia
  abajo y los tres números quedan a distinta altura.
- **Las cifras cuentan desde cero como un contador mecánico** la primera vez que la
  banda entra en pantalla (`IntersectionObserver` al 50%, script de
  `Presentacion.astro`). Cada dígito es una **rueda**: una tira 0…9 más un 0 final
  (para pasar de 9 a 0 sin salto) detrás de una ventana de `--alto`. La de las
  unidades gira y la de las decenas avanza **recién mientras las unidades pasan de 9
  a 0**, como un cuentakilómetros (`posicion()`). 1,9 s con salida cuártica y 140 ms
  de desfase entre cifras.
  - La CSS deja cada tira en su dígito final (`--p`): **sin JS o con reduced-motion se
    ven los valores directo**. El valor real va en `.sr-only` para los lectores de
    pantalla; las ruedas son `aria-hidden` y `user-select:none`.
  - `--alto` es **0,9em = el line-height que tenía la cifra**, así la banda mide lo
    mismo que con texto plano. Medido: a los dígitos les sobran ~2,8px arriba y abajo
    de la ventana, no se cortan.
  - Se respeta la cantidad de dígitos del valor ("06" conserva el cero, "+10" cuenta
    +00…+10). Los números de Space Grotesk son tabulares (22,85px todos, medido):
    ninguna cifra cambia de ancho mientras rueda.
  - ⚠ El script escribe el `transform` **inline en cada tira**, no `--p`: un custom
    property se hereda a las 11 celdas de la tira y las invalidaría en cada cuadro.
  - La banda queda muy por debajo del hero, así que el salto del valor final a cero
    al armarse (al cargar) no se ve.

### Axonometría de "Quiénes somos"
`src/components/Axonometria.astro` + `src/styles/axonometria.css`; la escena vive en
`src/lib/axonometria/`. Es una **axonometría seccionada de una "vivienda tipo"**
(genérica, igual que la planta del preloader): planta baja vidriada con un volumen de
servicio en sillería, caja alta de hormigón con celosía que vuela 5 m sobre el jardín,
terraza, pérgola, deck, piscina, paneles solares, equipamiento, árboles y figuras de
escala. **No es un archivo gráfico**: es una escena 3D (metros; X este, Y norte, Z
arriba) que se proyecta y se resuelve en el build a un SVG plano. Para cambiar el
dibujo se edita el modelo, no un SVG.
- **Archivos:** `motor.ts` (proyección ortogonal, ocultamiento, jerarquía de línea,
  cortes, sombras), `piezas.ts` (estilos → clases CSS, prismas, texturas de fachada y
  de piso, grupos: escalera, listones, paneles, árboles, matas, figuras), `casa.ts`
  (estructura, `CORTES`, `VISTA`, `SOL`), `equipamiento.ts` (muebles y ambientación),
  `niveles.ts` (cotas de nivel) y `lamina.ts` (serializa todo a un string SVG: el
  reparto de la animación por etapas y el grafismo de lámina viven ahí, no en el
  `.astro`, porque el dibujo se emite como archivo aparte).
- **Ocultamiento = algoritmo del pintor.** Caras con relleno opaco (tono de papel
  según hacia dónde miran: cubierta clara, sur media, este oscura) y las aristas
  encima; lo más cercano se pinta después. El orden es topológico entre cajas cuyos
  contornos **proyectados** se pisan, y el eje que las separa dice cuál está detrás
  (la mirada avanza hacia −X, +Y y −Z: por eso `az` tiene que estar entre 0° y 90°).
  - ⚠ **Las cajas no pueden interpenetrarse**: si dos se cortan, el orden sale a ojo y
    algo se tapa mal. Por eso lo que apoya sobre una alfombra arranca 2 cm más arriba y
    la losa alta empieza en X = 6, no adentro del volumen de piedra. `dibujar()`
    devuelve `avisos` (cajas que se cortan y ciclos rotos) y el componente los imprime
    en el build: **tienen que quedar en cero**.
  - ⚠ **Comparar rectángulos envolventes no alcanza.** Una losa larga en diagonal
    "pisa" medio dibujo en su rectángulo y generaba dependencias falsas → ciclos → los
    paneles solares quedaban tapados por la cubierta. La prueba de solapamiento es
    sobre el hexágono proyectado de cada caja (ejes separadores).
- **Jerarquía de línea automática:** arista con una sola cara visible → silueta
  (gruesa); entre dos caras visibles → arista fina; cara sobre un plano de corte →
  poché con contorno más grueso. Los grosores van en unidades del viewBox (`esc` 13 ≈
  px a tamaño desktop).
- **Cortes** (`CORTES` en `casa.ts`): regiones `x < X < x1 · y0 < Y < y · z0 < Z < z1`.
  Son dos, escalonados: planta alta + cubierta (se ven el dormitorio y el baño, con los
  tabiques cortados a 2,40 m y el tope en poché) y la terraza de planta baja (se ve la
  escalera). Las caras que caen sobre esos planos salen en poché solas; el vidrio
  cortado lleva su propio tono (`poche`/`cor` por estilo). ⚠ Una cara no puede quedar
  a medias sobre un plano de corte: se parte el lado de la planta con vértices
  colineales (la losa alta lleva (21,14) y (24,14) por eso).
- **Sombras:** sólo al suelo (z = 0) y todas en **un único path** con `nonzero`, así
  las superposiciones no se oscurecen de más. La de un prisma convexo es la envolvente
  de sus puntos (un polígono en vez de seis: la sombra llegó a ser el path más pesado).
  Los muebles de adentro llevan `sinSombra`.
- **Se amuebla sólo lo que se ve:** bajo la losa de planta baja la mirada entra apenas
  ~3 m detrás del vidriado, así que el estar y el comedor van contra el vidrio.
- **Árboles:** copa festoneada con arcos SVG, relleno y contorno en un mismo path
  (`c-copa`) y tres trazos cortos de sombreado. Las matas chicas llevan menos lóbulos,
  más marcados y sin sombreado: a ese tamaño se leían como globos con cara.
- **Vista 35°/42°** (giro/elevación), elegida comparando vistas en cajas del tamaño
  real de la lámina: conserva la fachada larga (la celosía) como protagonista, muestra
  más interior por el corte y es menos apaisada que la 30/38 (1,48 contra 1,59) → el
  dibujo llena más la columna.
- **Grafismo:** norte (un círculo apoyado en el suelo, o sea una elipse) y escala
  gráfica paralela al canto de la maqueta, en petróleo. Nada más: sin recuadro,
  marcas de registro ni pie (ver "Quiénes somos"). El SVG ocupa todo el hueco de la
  columna y se centra con `meet`.
- **Animación — se dibuja por etapas de obra:** terreno → planta baja → losa y planta
  alta → cubierta y pérgola → equipamiento → sombras, vegetación y figuras. Cada path
  cae en uno de 48 tramos (`kN`, respetando el orden del pintor dentro de cada etapa):
  los trazos (`t`, con `pathLength=1`) se dibujan con `stroke-dashoffset` y los
  rellenos (`r`) entran con fundido.
  - Con scroll-driven animations (`view-timeline` en `.axo-lamina`), el tramo va de
    `cover 17%` a ~61% (`--r0`/`--rp`/`--rd`): arranca con ~3/4 de la lámina a la
    vista y termina con la lámina un poco por encima del centro. **Al subir, se
    desarma.** ⚠ Arrancándolo antes, casi toda la obra se dibujaba con la lámina
    todavía cortada contra el borde de abajo de la pantalla (medido en 1024×768).
  - Sin soporte: se dibuja por tiempo la primera vez que entra en pantalla (script con
    `IntersectionObserver`, clases `.axo-pendiente` / `.axo-dibujando`). Sin JS o con
    `prefers-reduced-motion`: completa desde el principio.
  - Medido: 60 fps mientras se dibuja (mediana de 16,7 ms por frame).
- **Peso y entrega:** la lámina son ~116 KB de SVG (~27 KB con gzip) y **no viaja en el
  HTML**. Se sirve como archivo propio —`src/pages/axonometria.svg.ts` → `/axonometria.svg`,
  que Astro prerenderiza en el build— y `Axonometria.astro` la trae con `fetch` **sólo si
  `(min-width: 901px)`**, que es donde se ve; se queda escuchando la media query por si se
  agranda la ventana. Antes iba inline y la bajaba todo el mundo: era el **55% del HTML de
  la home** y en mobile, donde la columna va `display:none`, no se veía nunca. Con el
  cambio la home pasó de **218,7 KB / 51,8 KB gzip a 98,5 KB / 23,8 KB gzip**, y lo que
  descarga un teléfono (HTML+CSS+JS) de 64,5 a 36,4 KB gzip.
  Las reglas `.kN` de los tramos viajan **dentro** del SVG, así tampoco llegan al teléfono.
  **Sin JS no hay lámina** (no hay quién la pida): ahí `html:not(.js)` en `presentacion.css`
  no reserva la columna y la sección se lee a una columna, igual que en mobile. La clase
  `js` la pone el boot inline de `BaseLayout` antes del primer paint.
  Antes de sumar detalle, medir: las texturas de líneas (tablas, juntas) pesan poco en
  gzip pero suman nodos al DOM.
- **Iterar el dibujo fuera de Astro:** los `.ts` importan con extensión `.ts`
  (`allowImportingTsExtensions`), así que Node 24 los corre directo. Un script que
  importe `casa.ts`, arme un HTML con el SVG + `axonometria.css` y lo capture con Chrome
  headless alcanza para iterar sin levantar el sitio (`axonometria()` acepta otra
  `Vista` para comparar encuadres).

### Proyectos — carrusel helicoidal 3D
`src/components/ProyectosHelicoidal.astro` + `src/styles/proyectos-helicoidal.css`.
- Las cards se distribuyen en un **cilindro 3D** que rota y desciende atado al **scroll**
  (sección alta + panel `.ph-sticky` de 100vh; sin secuestrar el scroll). Escala/opacidad
  por curva de coseno (frente grande/nítido → dorso chico/desvanecido/blur). **Zoom al
  centro** con pico ~**1.70×** (ventana angosta = pop aislado), `RADIUS` 540 (300 mobile),
  **supersampling 2×** (card maquetada al doble y reducida ÷2 → nítida), sin snap.
- **Rendimiento — dos recortes sin tocar el resultado visual** (medidos con Chrome
  headless; el filtro "Todos", con 10 proyectos, era el que se sentía pesado):
  - **El blur sólo se aplica hasta cierta opacidad** (`BLUR_OPACITY_FLOOR = 0.35` en
    `render()`). Una card ya tan tenue que casi no se ve no necesita además el
    desenfoque encima — la opacidad sola cumple el mismo trabajo visual — y
    `filter:blur` es el efecto más caro de componer que hay. Con "Todos" llegaban a
    girar **7 cards borrosas a la vez, en cada fotograma**; con el piso quedan en 1-2.
    Los filtros con pocos proyectos (En proceso, Próximamente) no tenían ninguna
    borrosa ni antes ni después — por eso ahí ya fluía bien.
  - **El loop de render (`tick()`/`loop()`) se PARA SOLO en cuanto `scroll` alcanza a
    `targetScroll`** (asentado, nada más que animar) en vez de seguir pidiendo
    `requestAnimationFrame` 60 veces por segundo para redibujar exactamente lo mismo
    mientras la sección sigue a la vista. `updateTarget()` (el listener de `scroll`)
    llama a `start()` para reactivarlo apenas hay un scroll nuevo. Medido: 0 escrituras
    de estilo en 2s de reposo (antes, continuas); el recorrido y los filtros no
    cambian en nada.
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
- **La vista de ENTRADA es la grilla, no el cilindro** (2026-11-10). El recorrido
  helicoidal se lleva **6.084 px de scroll — 6,8 pantallas, el 49% del alto del
  sitio** (medido a 1440×900); para quien entra por segunda vez eso es peaje. Con
  la grilla de entrada la sección mide **2.802 px (3,1 pantallas)** y la home baja
  de 12.418 a 9.136 px. En el teléfono el cilindro nunca se monta (por debajo de
  760px), y lo que había eran diez cards apiladas en una columna: 5.925 px, 7
  pantallas. Eso se resolvió con el carrusel de abajo.
- **En ≤600px la grilla es un CARRUSEL** (2026-11-12, junto con el cambio de
  orden: con Proyectos entre Quiénes somos y Cómo operamos, siete pantallas de
  cards enterraban el modelo de negocio). La lista se desliza de costado con
  `scroll-snap`; la sección pasó de 5.925 a ~910 px. Es la MISMA lista —mismos
  links, orden y filtro—: sólo cambia la disposición.
  - **La tira sangra hasta el borde** (margen negativo = `--gutter`): la primera
    card arranca alineada con el título y la siguiente **asoma ~50px** por la
    derecha, que es la señal de que hay más. Por eso la card mide 82% y no 100%,
    con techo de 340px (en un teléfono grande o acostado llegaba a 470 y se veía
    una sola, enorme).
  - **El dato de la card no parte en los teléfonos comunes**: la línea más larga
    ("BRAZO ORIENTAL · 2028 · 10 UNIDADES") entra entera desde 375px, con el
    tracking apenas cerrado y el relleno lateral en 1rem. En 320–360 parte, pero
    **nunca separa el número de "unidades"** (`.ph-nw`, `nowrap`): partía en
    "… · 20" / "UNIDADES".
  - **El indicador** (`.ph-desliza`) reemplaza la barra de scroll del sistema,
    que va oculta: un filete de 1px con una barra de 2px que mide lo que se ve de
    la tira y avanza con el deslizamiento, y la card actual sobre el total. Lo
    escribe `pintarDesliza()` con `--frac`/`--pos`, derivado del scroll de la
    tira sin estado propio. La card actual es la alineada al borde izquierdo, y
    al tope de la tira la última (con el snap, la última nunca llega a alinearse).
  - **Filtrar devuelve la tira al principio**; y **volver de una ficha trae la
    card a la vista DENTRO de la tira** antes de centrarla en la pantalla — si
    no, quedaba fuera a la derecha y la foto que vuelve de la ficha no tenía dónde
    aterrizar. Verificado volviendo a la card 9 sin bfcache: aterriza, indicador
    en 09/10.
  - El aire del final de la tira va en un `::after` y no en `padding-inline-end`:
    en Safari viejo el relleno final de un flex con scroll no se cuenta.
- **Los dos botones de vista viven en una caja** (`.ph-vistas`, `#phVistas`): el
  toggle del cilindro y un segundo botón **deshabilitado a propósito** ("Vista
  nueva") que marca dónde iría una tercera vista todavía sin construir. La caja es
  lo que se muestra, se esconde y **viaja al panel sticky** en 3D: si se movieran
  de a uno, el segundo se quedaría en el header.
- **Toggle "Recorrer en 3D" ⇄ "Ver todos"** (`#phViewToggle`; la sección lleva
  `.is-toggleable` cuando el 3D está activo): alterna la grilla por el cilindro.
  El texto nombra **a dónde lleva**, no de dónde se vuelve: con la grilla de
  entrada, "volver al giro" no se entiende porque nadie estuvo ahí todavía.
  La grilla es **una grilla estática con todos los proyectos a la vista**. No es un fade — las cards **viajan** entre estados: desenrollar (cilindro→grilla)
  usa **FLIP** (se mide el rect de cada card en el cilindro y se la suelta en su celda con
  traslación+escala+fade, cascada leve por índice); reensamblar (grilla→cilindro) hace un
  **bloom** (nacen chicas/translúcidas en su lugar del anillo) y reposiciona el scroll al
  arranque del helicoidal. El botón vive en el header en grilla y se **relocaliza pineado**
  (arriba-derecha del panel; abajo-derecha en mobile) en 3D; respeta el subconjunto filtrado
  y se protege de clicks a mitad de transición (clase `.is-flipping`, que además libera el
  `overflow` para que las cards no se corten al volar). Con `prefers-reduced-motion` o sin JS
  el toggle no aparece (queda la grilla accesible de siempre).
- **Card en grilla (formato retrato):** la portada va en **`aspect-ratio: 6/7`** —el
  mismo que la caja de la ficha— (en el cilindro el thumb es `flex:1` y queda ~0.94,
  casi cuadrado). Motivo: las portadas reales van de 0,75 a 1,50 y el 4/3 apaisado que
  había antes les recortaba entre un 25% y un 44% de la foto. El 6/7 es un vertical
  suave: las verticales entran casi enteras y las cuadradas pierden poco a los lados.
  ⚠ El `portadaAspecto` del frontmatter **no cambia la card**, sólo la caja de la
  ficha: la card es una celda de la retícula y tiene que medir lo mismo en las diez. La ficha (`.ph-meta`)
  crece con la card y empuja ubicación + chip de estado al pie (`margin-top:auto`) → los
  estados quedan **alineados entre cards** aunque el nombre ocupe dos líneas (clamp 2), y
  el chip abraza su texto (en 3D sigue a ancho de card, sin cambios). Más aire entre filas
  que entre columnas. El `sizes` del `<Picture>` declara **el mayor de las dos vistas** por
  breakpoint (grilla 1/2/3 columnas vs. card fija de 376px del cilindro, maquetada a 2×):
  ninguna de las dos queda blanda.
- **En el cilindro la card tiene su propia escala de letra chica** (`.ph.is-3d
  .ph-loc` y `.ph.is-3d .status`), más grande que en la grilla porque la card se
  proyecta reducida casi todo el recorrido. Pero tiene un techo: estuvo en
  0,95rem y 16px y **en la card del frente eso llegaba a 14,7 y 15,5 px de
  pantalla** —más que la letra del cuerpo del sitio—, y como el renglón de datos
  va con `white-space: nowrap`, el más largo ("Brazo Oriental · 2028 · 10
  unidades", 35 caracteres) **no entraba en los 326 px de la card y se cortaba**.
  Hoy están en **0,8rem y 12px** (12,3 y 11,5 px de pantalla al frente). ⚠ Si se
  vuelven a tocar, la cuenta del ancho es: IBM Plex Mono avanza 0,6 em por glifo
  y el renglón lleva 0,03 em de tracking, así que 35 caracteres piden
  `35 × 0,63 × cuerpo` px — a 15,2 son 335 y no entran; a 12,8 son 282 y sobran 44.
- **El renglón de datos de la card es `barrio · año · N unidades`, y una obra que
  no se cuenta en unidades pone ahí QUÉ ES** (`tipoObra` en el frontmatter;
  2026-11-11). Hoy sólo Sushi WOK, que dice "Restaurant" — sin eso su card se
  quedaba en "Carrasco · 2026" y se leía más pobre que las otras nueve. El campo
  **sólo se usa cuando no hay `unidades`**: el número manda. En la ficha técnica
  no cambia nada: ahí la celda se llama "Unidades" y la respuesta correcta sigue
  siendo "No aplica" (ver "Página de proyecto").
- **Cards limpias:** sin cartelito `E21·NN`, sin nombre gigante de fondo, sin grilla
  blueprint; el fondo del panel es parallax multicapa (fantasma "21" + marcas de registro),
  visto a través del tinte de la **mesa** (`section.mesa`, ver "Home — secciones"): las
  cards de papel claro se despegan del fondo un punto más hondo, en grilla y en 3D.
  El CTA "Ver proyecto" aparece **sólo en hover de la card al frente**.
- **El cilindro pide LUGAR: `(min-width: 760px) and (min-height: 620px)`.** Por debajo
  de eso el componente arranca —y vuelve— a la **grilla**. El corte es geométrico, como
  el de los 1700px del riel: con menos de 760px la barra de filtros pasa a dos filas y
  la card frontal (que va a 1,70×) le monta encima; con menos de 620px de alto (un
  celular acostado, una ventana corta) la card no entra entera y se corta contra el
  borde de abajo. Sumado a eso, en un teléfono el recorrido eran ~3800px de scroll para
  diez proyectos. La grilla no es un premio consuelo: es la misma vista que da el toggle
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
  va **después de Proyectos** —el proceso, una vez vista la obra— y desemboca en
  Equipo: así trabajamos → éstos somos → escribinos. Sin fondo propio: va sobre el
  papel abierto, entre la mesa de Proyectos y el papel claro de Equipo, así se
  despega de las dos (ver "los tres papeles" en "Home — secciones"). Cabecera simple (eyebrow + título + lead) y los bloques de las
  cuatro fases.
  Las cifras de trayectoria **no** van acá: viven al pie de la sección de
  presentación. La etiqueta de cada bloque es **el número de la fase y su
  nombre** (`1 · Originación`, `2 · Estructura`…): el número lo pone el
  `.map` del componente, así que no se puede desfasar del orden en que están
  escritas. El prefijo `F01`–`F04` que hubo antes **no vuelve**: era un código
  interno que no le decía nada a quien lo lee; un 1, 2, 3, 4 sí, porque son
  pasos en orden.
  El numerito (`.pf-n`) va en la **display**, no en la mono petróleo del resto
  de la etiqueta —es la única cifra de la banda y tiene que leerse como cifra—,
  pero **acompaña a su etiqueta en vez de competir con ella**: `--ink-soft`
  (no `--ink`, que al lado del petróleo se leía como un número en negrita) y
  0,95rem, apenas por encima de los 12px del mono. Lleva **`line-height: 1`**:
  sin eso el renglón crece y empuja hacia abajo el título de las cuatro fases.
  Va inline, no flex, para que la línea de base caiga sola sobre la del mono.
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
  breakpoints, el `sizes` del `<Picture>` es fijo (`264px`). En ≤600px la ficha va
  **sin padding lateral**: en una columna esa sangría no separa de nada y
  desalineaba el retrato respecto del título.

  ### Equipo · encuadre de los retratos
  Las seis fotos son **recortes sobre transparencia** (PNG con alfa, 800×1000),
  de sesiones distintas. Venían con la cabeza a distinto tamaño —de 220px
  (Federico) a 324px (Lucía) de coronilla a mentón, un **47% de diferencia**— y
  la línea de los ojos repartida en 77px. Puestas en el cuadro se leían como
  seis fotos sueltas, no como un equipo.
  - Se corrige **sin tocar los archivos**, con tres números por persona en
    `equipo.ts` (`zoom`, `x`, `y`) que el componente baja como `--rz/--rx/--ry`
    y la CSS aplica como `scale() translate()` sobre el `<img>`. Es el mismo
    patrón que `portadaZoom`/`portadaFoco` en las portadas de proyecto.
  - **El `zoom` iguala el alto de la cabeza** (al mayor de los seis: con un
    objetivo menor alguno tendría que achicarse y, al ser un recorte, el torso
    se despegaría del borde de abajo dejando un busto flotando) y **`x`/`y`
    centran la cara y ponen los ojos al 38% del alto**, igual en los seis.
  - ⚠ **Los números no se ajustan a ojo.** Salen de medir coronilla, ojos y
    mentón de cada foto con el detector de rostros de macOS (Vision). Si se
    cambia una foto hay que volver a medirla: un script Swift de 60 líneas con
    `VNDetectFaceLandmarksRequest` da los tres puntos, y de ahí
    `zoom = cabezaObjetivo / cabeza`, `x = -(caraX − 0,5)`,
    `y = (0,38 − 0,5)/zoom − (ojosY − 0,5)`.
  - ⚠ **El `zoom` es un `transform`, y un transform agranda lo ya rasterizado.**
    Por eso `TeamMember` pide los anchos **multiplicados por el zoom** (topados
    en los 800px del archivo); si se piden los 264/396/528 pelados, las fotos
    más zoomeadas salen blandas. Mismo problema y misma solución que
    `coverRender` en la ficha de proyecto.
  - El **fondo del retrato es `--paper-2`**, no `--paper-deep`. Como las fotos
    son recortes, ese color ES el fondo de la foto: el deep es el gris del sitio
    para huecos y placeholders, y detrás de una persona leía frío y sucio contra
    el papel cálido de la página.
  **Hover**: el retrato se despega del papel (−6px + sombra + borde a `--ink`) y la
  foto hace zoom 1.05; el nombre y el rol acompañan la mitad (−3px). Se anima el
  **retrato**, no `.person`: la ficha es una celda del cuadro y **sus bordes son las
  líneas de la retícula** — moverla entera correría esas líneas y se rompería la
  grilla.
- **Contacto: un formulario y, al lado, los canales directos** (2026-11-11).
  Hasta ahora la sección eran tres filas y nada más: las tres sacaban al
  visitante del sitio, y no había **un solo `<form>`** en todo el código. El
  que miraba de noche desde el teléfono tenía que abrir el mail y redactar de
  cero; ahí se perdía (era el B1 de la lista de mejoras, el único crítico).
  - **Dos columnas** (`.contact-grid`, áreas `"texto form" "canales form"`): a
    la izquierda lo que la sección dice y abajo los canales; a la derecha el
    formulario, que ocupa la columna entera. **En ≤900px el orden pasa a texto
    → formulario → canales**, no al revés: en el teléfono la acción va primero
    y los canales son la alternativa para el que NO quiere llenar nada.
  - **Cuatro campos y ninguno de más**: nombre, email, qué te interesa y un
    mensaje opcional. Cada campo que se agrega es gente que abandona, y el
    mensaje va opcional justamente para que el que no quiere escribir igual
    deje el dato.
  - **Las opciones de "qué te interesa" son `radio` de verdad**, estilados como
    los chips del sitio (`.cf-chip input:checked+label`). Con botones y un
    campo oculto habría que sostener el estado con JS; así el grupo anda sin
    JavaScript, se recorre con las flechas y lo anuncia solo el lector de
    pantalla.
  - **La lámina es oscura, no de papel**: la misma tinta de la sección un
    escalón más clara y más cálida (`--panel: #26231D`, local a
    `.contact-form`). Lo que la separa del fondo son **tres cosas chicas
    sumadas** —el escalón de valor, el filete de un píxel y la sombra— más el
    grano del papel del sitio en `overlay`; con una sola de las tres habría que
    exagerarla y la caja dejaría de ser sutil. Se probó también en papel y en
    petróleo profundo; la elección fue ésta (decisión del estudio).
  - **El botón va relleno en papel, no en petróleo**: sobre la tinta el
    petróleo da 1,5:1 y desaparece (ver "Botón"). Medido con el auditor: el
    mono de la lámina pasa AA cómodo (chips 8,6:1, la nota 5,3:1).
  - **La lámina tiene UNA regla vertical y está medida**: en reposo, lo que
    se ve de cada campo es su línea, y las cuatro caen a la misma distancia de
    su etiqueta — 47px el filete de nombre y email, 49 el pie de los chips,
    47 el primer renglón del mensaje. Entre un campo y el siguiente, 29px.
    Dos cosas la sostienen y es fácil romperlas:
    · **el `<legend>` no recibe el `gap`** del fieldset (el navegador lo
      dibuja en el borde, fuera del flex), así que la separación de los chips
      va como `margin-top` en `.cf-chips`. Sin eso quedaban pegados al título;
    · **el mensaje lleva los renglones dibujados** —un degradé que se repite
      al alto del interlineado, con el filete en el último píxel— para que la
      primera línea no flote sobre una caja vacía. El interlineado es de
      **32px exactos**: con un valor fraccionario el degradé cae entre píxeles
      y unas líneas salen más gruesas, y a 28 las letras con descendente (la
      "p" o la "g" de "pagos") tocaban la línea. Va sin `padding` arriba —el
      degradé arranca en el borde de la caja y el texto bajaría sin las
      líneas— y con `background-attachment: local`, para que si se escribe
      más de tres renglones las líneas se desplacen con el texto.
  - **El encabezado de la lámina es sólo "Dejanos tus datos"**: tuvo a la
    derecha un rótulo mono "24 h hábiles" y se sacó (2026-11-12, decisión del
    estudio).
  - ⚠ **A dónde se manda: `formEndpoint` en `src/data/site.ts`, hoy en
    `null`.** El sitio es estático (GitHub Pages): no hay servidor propio que
    reciba un POST, así que lo recibe un servicio que lo reenvía por mail
    (Formspree, 50 consultas al mes gratis; Web3Forms, 250). **Mientras sea
    `null` el formulario no se rompe**: arma el correo con los datos ya
    escritos y lo abre en el cliente de mail del visitante. Eso es un respaldo,
    no un envío —puede no haber cliente configurado—, así que es lo primero a
    completar antes de publicar.
  - **Sin JS se manda igual**: con servicio, el `action` es el POST de siempre
    y se ve la página de gracias del servicio; sin servicio, el `action` es un
    `mailto:` con `enctype="text/plain"`. **Con JS no se sale nunca de la
    página**: se manda por `fetch` y la respuesta se escribe en la misma
    lámina, que se reemplaza por "Listo, <nombre>. Te respondemos a <mail>…".
    Si falla, el aviso da el mail y el botón vuelve a habilitarse con los
    campos intactos.
  - **Contra el spam, un campo trampa** (`_gotcha`, fuera de pantalla, sin
    tabulación ni lectura), **no un CAPTCHA**: resolver un cuadriculado de
    semáforos para mandar cuatro campos es exactamente lo que un sitio premium
    no hace, y además los dos servicios ya lo soportan. Va con `position`
    fuera de pantalla y NO con `display:none`, que algunos robots detectan.
  - El aviso de resultado se oculta con **`:empty`** y no con una clase: así la
    región viva (`role="status"`) existe desde el principio y el lector de
    pantalla anuncia el cambio apenas se le escribe el texto.
  - ⚠ **El plazo de respuesta sigue en un solo lugar: el aviso de éxito**
    ("Te respondemos a <mail> dentro de las 24 horas hábiles", en el script
    de `Contacto.astro`). Es una promesa del estudio, no una decisión de
    diseño: si no se contesta en ese plazo, el formulario es peor que no
    tenerlo. Confirmarla antes de publicar o sacarla también de ahí.
- **Los canales directos**, debajo del texto: tres filas, en este orden — **Escribinos** (el mail real
  `estudiodearquitectos21@gmail.com`), **WhatsApp** (`099 421 576`) y **Dónde
  estamos** (la dirección del estudio). El mail va primero porque la lista es
  el ÚNICO lugar del sitio donde existe, mientras que WhatsApp además tiene su
  botón flotante en todas las páginas: el primer renglón es para lo que no
  tiene otra puerta de entrada. Las etiquetas son dos invitaciones y un nombre
  de canal; "Estudio" a secas, que es lo que decía la tercera, nombraba el
  continente y no el dato.
  El link de WhatsApp con el saludo ya escrito (`whatsappHref`, en
  `data/site.ts`) lo usan la fila y el botón flotante: con el texto en un solo
  lugar no pueden quedar con saludos distintos. Y el número vive en `site.ts`
  en **tres formas** —internacional para el JSON-LD, como se escribe acá para
  mostrarlo, y los dígitos pelados de wa.me—: si cambia, cambian las tres.

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
  vertical**, sea cual sea su proporción. Lo que sobra va al texto, topado en
  62ch. En **≤1100px se apila** y vuelve al modelo de ancho fijo
  (`--cover-h:auto`, portada centrada en `min(100%, 440px)`) — con una sola
  columna, alto fijo no tiene sentido: una cuadrada se vería tan ancha como una
  vertical, pegada al ancho completo. ⚠ Ese corte es **1100 y no 900** como el
  resto de la página: ver "El cuerpo de cada proyecto" acá abajo.
- **El cuerpo de cada proyecto es un párrafo y después las características en
  viñetas** (2026-11-10). Antes eran dos párrafos de prosa: el primero decía
  dónde está la obra y el segundo enumeraba unidades, amenities, estructura y
  régimen **escritos como una oración con comas**, que es justo lo que un
  inversor no lee. Hoy el segundo párrafo es una lista (`.proj-desc ul`), con
  la etiqueta de cada línea en tinta y el dato en el gris del cuerpo.
  - **No lleva título.** Un "Características" entre el párrafo y la lista
    agregaba un escalón de lectura sin decir nada que no se viera.
  - **Sin esquema fijo, pero con lógica común**: cada proyecto usa sólo las
    etiquetas que le corresponden —Villa Platero cinco, Patios Maldonado dos—
    pero cuando dos proyectos tienen el mismo dato se llama igual y va en el
    mismo orden: Tipologías · Niveles · Espacio exterior · Cocheras · Amenities ·
    Servicios · Estructura · Régimen · Beneficios fiscales · Preexistencia.
    Sushi WOK, que es un local, usa las suyas (Programa · Estructura). Así dos
    fichas se comparan leyendo en paralelo.
  - **"Unidades" NO es una etiqueta de la lista**: el número ya está en la ficha
    técnica. La línea se llama "Tipologías" y lleva el desglose, no el total.
  - **Cada viñeta tiene que ser un dato, no una promesa** (2026-11-10). Se
    sacaron las cuatro que decían **"Gastos comunes: bajos"** (Patios del
    Regimiento, Terrazas de Cajal, Terrazas de Italia y Vila Rodona) y el
    "Terminaciones: pensadas para el uso comercial" de Sushi WOK: un inversor
    lee "bajos" y no sabe cuánto es, y la memoria del estudio tampoco da la
    cifra ni el motivo. Si alguna vez llega el número —o la razón concreta, por
    ejemplo que no hay ascensor ni portería—, la viñeta vuelve con el dato; sin
    eso, no va. Misma vara para cualquier viñeta nueva.
  - **Puntuación: la viñeta que termina en palabras cierra con punto; la que es
    sólo una cifra, no.** "Cocheras: 26, en subsuelo." lleva punto porque es una
    frase; "Cocheras: 10" no, porque es una celda de dato, como las de la ficha
    técnica. Hoy la única sin punto es la de Terrazas de Cajal.
  - **Números: palabras hasta nueve, cifras de 10 para arriba, y una sola
    familia por enumeración.** Por eso Chana I, Villa Platero y Terrazas de
    Cajal llevan la línea de tipologías en cifras (tienen un 25, un 12, un 15) y
    Cavas de Haedo, Patios del Vitraux y Patios Maldonado en palabras (ninguna
    pasa de seis). Mezclar "cinco monoambientes" con "25 unidades" en el mismo
    renglón es lo que hay que evitar.
  - **"Dormitorios" se escribe en el primer miembro de la enumeración y en el
    último; los del medio lo eliden.** "8 unidades de un dormitorio, 12 de dos y
    4 dúplex de tres dormitorios." Terminar en "y cinco de dos" deja la frase
    colgada y se lee informal, que es como estaba hasta el 2026-11-10.
  - **El régimen se nombra siempre igual: "Ley de Vivienda Promovida N.º
    18.795"**, y los beneficios van en su propia viñeta ("exoneración de ITP, de
    IRPF/IRAE sobre los alquileres y del Impuesto al Patrimonio"), no colgados
    del régimen. Antes convivían tres redacciones distintas ("Ley de Vivienda
    Promovida", "Vivienda Promovida (ANV)" y la larga con los beneficios
    adentro) y dos fichas del mismo régimen no se podían comparar de un vistazo.
  - ⚠ **Hay un dato que el estudio todavía no precisó**: en Patios Maldonado la
    memoria dice que "varias" unidades de planta alta son dúplex, sin decir
    cuántas, y la viñeta "Niveles" arrastra ese "parte de". Si el estudio da el
    número, se escribe.
  - ⚠ **La lista no puede pasar el alto de la portada.** Si a un proyecto hay
    que sumarle un dato y ya no entra, se saca el de menos peso para un
    inversor antes que dejar crecer la columna; el orden de importancia es el
    de la lista de arriba, de más a menos. Medido en la ficha más larga (Villa
    Platero, 5 viñetas): a 1440 la foto mide 560 y el texto 451 —sobran 109—; a
    1101, 488 contra 418 —sobran 70, el margen más chico de las diez—. **Por eso el bloque se apila en 1100px y no en 900**:
    entre 900 y 1080 la foto baja con el ancho de la ventana (44,33vw) pero el
    texto, con menos columna, parte en más renglones, y a 1040 el texto ya mide
    472 contra 461 de foto. Subir la curva de `--cover-h` no lo arregla: una
    foto más alta es también más ancha, le roba ancho al texto y el texto
    vuelve a crecer.
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
    recorta demasiado a una foto muy apaisada. **Lo usan dos**: Patios del
    Regimiento (1.41 — en 6/7 perdía ~39%, cuadrada ~29%) y Terrazas de Italia
    (1.33), cuya portada es un render de fachada con la calle entera: en 6/7 se
    veía el 57% de la foto, apretaba la fachada contra los bordes y cortaba al
    ciclista por la mitad; cuadrada se ve el 67% y entra el edificio con sus
    vecinos. Esa ficha es además la que más lugar tiene para ensanchar la
    columna de la foto —sólo tres viñetas—: medido, al texto le sobran 209px a
    1440 y 157 a 1101. Villa Platero (1.50, ~43% en 6/7) se queda en el 6/7
    default: el edificio está centrado y el foco al centro lo toma bien.
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
  `border-top` en `--ink` (marcado `<dl>` con `<dt>`/`<dd>`). La **primera celda
  va sin `padding-left`** para que su valor caiga sobre la misma línea que el
  título, la portada y el filete —lo mismo que hace `.pres-cifra:first-child` en
  la home—; en dos columnas (≤900px) son las celdas impares. Las **etiquetas van
  en `--ink-soft`**, no en el gris de los eyebrows: son las que dejan leer los
  valores.
  El valor tiene tres tratamientos: el dato, **"Pendiente"** (gris claro: se lee
  como el hueco que es) y **"No aplica"** (más chico y en `--concrete`, porque es
  una respuesta y no un hueco). "No aplica" se activa con **`sinUnidades: true`**
  en el frontmatter, para obras que no se cuentan en unidades — hoy sólo Sushi
  WOK, que es un local gastronómico.
- **Galería = tira de contactos + visor.** Todas las miniaturas al **mismo alto**
  (`--gal-h`) y con el **ancho que les da su proporción real** → tira horizontal
  scrolleable, sin recortar ninguna (los ratios de la galería van de 0.56 a 1.95:
  cualquier caja fija recortaría fuerte a la mitad del material).
  `--gal-h` es `clamp(150px,22vh,240px)` → ~190px en un teléfono, ~210px en un
  portátil. Antes era `clamp(112px,15vh,168px)` y daba **127px medidos contra una
  portada de 510px**: los renders, que son lo mejor que tiene la página, se leían
  como un pie de página. Si se vuelve a tocar, el techo es que siga siendo una
  tira que se recorre, no una grilla. El script
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

### Mapa de situación
`src/components/Mapa.astro` + `src/styles/mapa.css`; el dibujo lo arma
`src/lib/mapa/` (`encuadre.ts` + `lamina.ts`) y la geometría vive en
`src/data/mapa/montevideo.json`.

Va **entre la ficha técnica y la galería**, en dos columnas: el plano a la
izquierda y, centrada contra él, una cartela de tres líneas — eyebrow
"Ubicación", la dirección en display y `barrio · Montevideo`. **Nada más.**
Tuvo al pie la coordenada en grados y el crédito de las fuentes y **se
sacaron** (2026-11-06): eran dos cartelitos de letra chica que ensuciaban la
ficha. El crédito, que la licencia de OSM sí exige, pasó a una segunda línea
del **footer del sitio** (`Footer.astro`, `.foot-datos`) — si algún día se saca
el mapa, esa línea se va con él.
**No lleva título de sección**: cuelga de la ficha, cuya celda "Ubicación" dice
el barrio, y el plano es ese dato desplegado. Y va **suelto sobre el papel**,
sin recuadro ni filete, igual que la axonometría de "Quiénes somos".

- **No es una imagen ni una captura de un servicio de mapas.** Es geometría
  real proyectada y resuelta en el build: la costa es el borde sur del
  contorno del departamento (OSM), la malla son los límites de los 62 barrios
  de la Intendencia, las avenidas son las radiales, los dos bulevares y la
  rambla, y alrededor de la obra va el callejero fino (todo OSM). Un mapa de
  Google o Mapbox traería sus colores, su tipografía y sus pines, y al lado de
  la axonometría se leería como una captura pegada.
- **El barrio del proyecto NO se pinta.** Hubo una mancha en petróleo sobre el
  polígono del barrio y se sacó (2026-11-06): el límite administrativo no es
  exacto, no es lo que importa y le competía a la cruz, que es lo único que
  hay que mirar. En su lugar, alrededor de la obra se dibuja el **callejero
  fino**, que se funde con la distancia (`m-detalle` + la máscara `m-halo`):
  el único punto del plano con ese nivel de detalle es el proyecto, así que
  funciona de foco sin pintar nada.
  - ⚠ **Sólo las calles terciarias.** Con las residenciales también, a 11 km de
    ancho la trama cae tan junta que el halo se pinta como una mancha negra: a
    esa escala una calle de barrio no es una línea, es ruido. Las residenciales
    igual se guardan en el JSON (`detalle.res`) por si el encuadre se cierra
    algún día.
- **La geometría se baja A MANO** con `node scripts/bajar-mapa.mjs` y el JSON
  se commitea. El build **no toca la red**: mientras se armaba esto, Overpass
  devolvió 502 "at capacity" varias veces y dos mirrors no contestaron; un
  build en Actions no puede depender de eso. Lo bajado queda en `.cache/mapa/`
  (gitignoreada) y no se vuelve a pedir. El JSON de datos **no viaja al
  navegador**: se consume en el build y lo único que se publica es el SVG.
- **Cada proyecto tiene SU encuadre, armado alrededor de la obra**
  (`encuadre.ts`): 11 km de ancho, la misma escala en los diez — cambia el
  centro, no el zoom. Primero fue un encuadre fijo de toda la ciudad, igual en
  las diez fichas, para poder comparar proyectos; se cambió (2026-11-06)
  porque en la ficha no se compara nada: se mira una obra. Con el plano de la
  ciudad entera, un proyecto del norte —Villa Platero, en Millán— quedaba como
  una cruz chiquita arriba a la izquierda y lo que se leía era Montevideo, no
  el proyecto.
  - La obra va a un **43% del alto** (`Y_BASE`) y no en el medio: el encuadre
    toma así algo más de ciudad del lado del sur, que es donde está la costa.
    Sin eso los de La Blanqueada se quedaban a unos cientos de metros de
    mostrar la rambla.
  - **Y los de los extremos se corren todavía más, en contra de la ciudad.**
    Centrar a rajatabla funciona en Pocitos o el Cordón, rodeados de ciudad por
    los cuatro lados; en Carrasco la mitad este del plano era agua y chacras, y
    en el Prado la mitad norte era Casavalle y Las Acacias — medio dibujo
    gastado en lo que no se quiere mostrar. Moviendo la obra hacia AFUERA del
    cuadro (a la derecha si está al este, arriba si está al norte) el encuadre
    se come ese vacío y entra más ciudad. El corrimiento crece con la distancia
    a `NUCLEO` —que es Parque Batlle / Pocitos, el corazón de la zona que le
    interesa a un inversor, no el centro geométrico del departamento— hasta
    `DIST_PLENA_KM` y ahí se planta. Medido: la cruz queda siempre entre el 40%
    y el 65% del ancho y entre el 33% y el 46% del alto; ninguna en una
    esquina.
  - ⚠ **La contra es real**: a 11 km los proyectos tierra adentro ya no
    muestran la costa oceánica —están a 6 km de ella y meterla pedía el doble
    de ancho, justo lo que se sacó—. Se leen por la trama de barrios y de
    avenidas. Lo que los salva es la **bahía**, que sube bastante al norte:
    verificado que los diez encuadres tocan agua. `lamina.ts` igual tiene la
    guarda por si alguna vez entra un proyecto más al norte (sin costa no
    dibuja ni agua ni relleno de tierra, y no se rompe).
- **La cruz sale de `coords`** en el frontmatter: las diez direcciones se
  geocodificaron una vez con Nominatim (todas a nivel de número de puerta) y se
  verificaron contra los polígonos de barrio. Sin `coords` la ficha no muestra
  mapa.
- ⚠ **El barrio que se PINTA no siempre es el que dice `barrio`.** Se pinta el
  que contiene a la dirección; el rótulo de la cruz es el nombre que usa el
  estudio. Tres proyectos caen sobre un límite y la capa oficial los pone en
  otro barrio del que usa el mercado: **Terrazas de Cajal** (Tres Cruces según
  la IM), **Terrazas de Italia** (Unión) y **Villa Platero** (Paso de las
  Duranas). La mancha es geografía y el nombre es del estudio; por eso el
  barrio pintado **no se rotula** —diría una cosa y la cruz, otra— y tampoco se
  rotula un barrio vecino que se llame igual que la cruz (si no, Villa Platero
  escribía "PRADO" dos veces).
- **Peso: ~14 KB gzip de SVG inline** (de 9 en Sushi WOK a 17 en Villa Platero,
  según cuántos barrios entren) sobre una ficha que sin el mapa pesa 12,6 KB
  gzip. Va **inline y no como archivo aparte** —al revés que la
  axonometría— porque los números son otros: la axonometría son 27 KB gzip en
  la página que recibe a todo el mundo y en mobile ni se ve; el mapa es la
  mitad, va en una ficha que se abre de a una y en un teléfono se ve igual.
  Inline además lo pinta junto con la página, usa la tipografía y los tokens
  del sitio y anda sin JS. Para llegar ahí hay **tres recortes que no se pueden
  perder** (con el encuadre de la ciudad entera, que es el caso más pesado,
  eran 23,4 KB y quedaron en 14,8):
  - **La malla no se dibuja polígono por polígono.** Dos barrios vecinos
    comparten su límite: trazar los 62 polígonos dibujaba cada línea interior
    dos veces. `lindes` (en el JSON) ya viene deduplicada por segmento y cosida
    en cadenas largas.
  - **Las avenidas se cosen antes de simplificar.** OSM parte cada avenida en
    decenas de ways; llegaban como ~600 pedazos de dos puntos, y cada pedazo
    cuesta un `M x y L x y` entero. Cosidas: 1.108 tramos → 161, y
    Douglas–Peucker por fin puede trabajar (26 KB → 7,4 KB).
  - **La costa se escribe UNA vez** (`<path id="m-costa-d">` + tres `<use>`):
    recorta el rayado del agua, pinta la tierra y traza la línea. Escribirla
    dos veces costaba 10 KB. ⚠ Lleva `vector-effect` **por atributo**: dentro
    de un `<use>` los selectores CSS del documento no alcanzan al path.
  - Encima va una segunda simplificación en unidades del viewBox, con
    tolerancia por capa (`TOL` en `lamina.ts`): la costa es la línea más
    marcada del plano y la malla una trama de fondo de 0,7 px.
- **Los barrios que se rotulan salen de una lista CURADA** (`BARRIOS` en
  `lamina.ts`), y es una decisión editorial, no técnica: la ficha la mira un
  inversor, así que se nombran los barrios conocidos y los de la zona donde
  querría comprar. Montevideo tiene 62 y nombrarlos a todos apretaba el dibujo
  hasta volverlo ilegible y lo llenaba de nombres que no le dicen nada a nadie
  o que directamente no suman (Aires Puros, Castro Castellanos, Casavalle…).
  Sumar uno es agregar una línea a ese objeto. Hay además un tope de
  **`MAX_ROTULOS` (11) por plano**: con más, el dibujo deja de respirar.
  De los que quedan se dibujan los más cercanos a la obra primero, con
  **anti-colisión** (`colocar`); el que pisa a uno ya puesto se cae, y por eso
  el orden por cercanía importa: gana el que ubica.
  Tres detalles que parecen de más y no lo son:
  - **El rótulo se corre hacia adentro** si el centroide cae en la franja que
    la máscara de bordes funde, pero sólo hasta `CORRIDA_MAX` (24 px): más que
    eso el nombre ya no cae sobre su barrio. En Carrasco, que está en el borde
    de la ciudad, es la diferencia entre nombrar dos vecinos y ninguno.
  - **Si choca, se prueba apenas más arriba o más abajo** antes de descartarlo.
  - **La escala y el norte reservan su lugar de antemano** aunque se dibujen al
    final: un rótulo caía justo encima de la barra de escala.
  El ancho del texto se calcula a mano (IBM Plex Mono avanza 0,6 em por glifo)
  porque en el build no hay layout. ⚠ **`FS_REF` en `lamina.ts` y
  `.mapa .m-ref` en `mapa.css` tienen que valer lo mismo**: con ese número se
  mide el ancho de cada rótulo y se resuelve el anti-colisión en el build, así
  que si uno sube sin el otro los nombres se pisan (o se descartan de más).
  Están en 9,5px desde la tanda de legibilidad: el plano se dibuja a 560 de
  viewBox y se muestra a ~660px, así que los 8px de antes llegaban a la
  pantalla como 9,4 — verificado que con 9,5 no se cae ningún rótulo de
  ninguno de los diez planos. La **escala gráfica se adapta**: toma el
  número redondo más grande que no pase del 30% del ancho del plano, así sigue
  al encuadre si cambia.
- En **≤620px** los rótulos de referencia se ocultan y el de la cruz se agranda
  (`mapa.css`): el mapa mide ~350 px y a esa escala 8 px de viewBox caen a 5.
  Como el tamaño va en unidades del viewBox, subirlo desde la CSS lo agranda en
  pantalla sin tocar el SVG; y al no quedar rótulos chicos no hay con qué
  chocar (el anti-colisión se resolvió en el build, a 8 px).

**La ficha no lleva ninguna acción de venta** (decisión del 2026-11-04,
reafirmada el 2026-11-10): ni CTA de consulta, ni línea de contexto, ni una
frase de remate por proyecto. Se probó **dos veces** y se descartó las dos:
primero un bloque de cierre al pie con una línea propia de cada obra y botones
de WhatsApp/mail; después un botón "Quiero información sobre este proyecto" en
la cartela del mapa, que abría WhatsApp con el nombre de la obra ya escrito.
Las dos quedaron andando y las dos se sacaron: la ficha muestra la obra y nada
más. El canal de contacto en esta página sigue siendo el botón flotante de
WhatsApp, que ya está en todo el sitio. Lo único que se sumó después del
contenido es **navegación**, no venta: las flechas Anterior / Siguiente
(2026-11-06, ver abajo). ⚠ Si alguna vez se vuelve a intentar, dos cosas ya
aprendidas: el texto del botón mide ~33 caracteres y `.btn` es
`white-space: nowrap`, así que en un teléfono se sale de pantalla y estira la
columna de la cartela; y la regla que lo arregla necesita el padre delante
(`.ubic-datos .ubic-cta`), porque sola empata en especificidad con `.btn` y el
orden en que Astro junta las hojas no está garantizado.

### Anterior / Siguiente
`src/styles/proyecto-nav.css` + el `<nav class="proj-nav">` al pie de
`ProjectLayout`. Deja pasar de una obra a la otra sin volver a la home.

- **El recorrido es el del cilindro**, y sale de un solo lugar
  (`src/lib/proyectos.ts`: `ordenEditorial` / `vecinos`), que es de donde lo
  toma también `ProyectosHelicoidal`. Si cada uno lo calculara por su lado,
  "Siguiente" podría llevar a un proyecto distinto del que viene después en la
  home. Va **en ciclo**: después del último está el primero, igual que el
  cilindro, que es un anillo. Así ninguna ficha queda con una sola flecha.
- **Dos presentaciones del mismo markup**, según el lugar que haya:
  - **Pastilla** (≥1000px de ancho, con mouse de verdad): un cuadrado de
    58×58 a media altura con la flecha sola, **apenas separado** del borde
    de la ventana (`--pn-sep`, de 10 a 16px): despegada se lee como una
    pieza apoyada sobre la página —con sus cuatro lados y su sombra— y no
    como algo que se salió por el costado.
    Al acercar el mouse **se abre hacia adentro** y aparece el nombre del
    proyecto. Es un control FLOTANTE, como el botón de WhatsApp: no vive en
    la retícula, así que puede apoyarse sobre la página y no necesita que el
    margen de `.wrap` le dé lugar. Por eso su piso no es geométrico como los
    demás del sitio: pide `hover: hover` y `pointer: fine` —sin mouse no hay
    forma de leer el nombre antes de hacer click— y 1000px para que el panel
    abierto (~280px) no se coma media pantalla.
  - **Banda al pie** en todo lo demás (touch, ventanas angostas), con el
    tratamiento de la ficha técnica: filete `--ink` arriba, hairline entre
    las dos celdas, la primera sin sangría. En ≤600px la flecha pasa arriba
    del nombre.
- **Cómo se abre la pastilla, que es casi todo el efecto** (`proyecto-nav.css`):
  - El ancho se anima con **`grid-template-columns: 0fr → 1fr`**, no con un
    `max-width`. Así crece hasta el ancho REAL del nombre: con un número fijo,
    un proyecto de nombre corto terminaba de abrir a mitad de la animación y
    el resto del tiempo era tramo muerto, que es exactamente lo que hace que
    un movimiento se sienta barato.
  - ⚠ El aire del panel va en los **renglones**, no en `.pn-texto`.
    `min-width: 0` deja que el ítem del grid baje de su contenido, pero el
    padding del ítem no entra en esa cuenta: con el padding en `.pn-texto` la
    pastilla cerrada medía 83px en vez de 60 y asomaba una franja vacía.
  - **Cerrar es más rápido que abrir** (las duraciones largas van en el estado
    `:hover`): con la misma curva lenta, el panel se siente pegajoso y parece
    perseguir al mouse.
  - El texto entra **escalonado y desde atrás del mango** (la etiqueta a los
    120 ms, el nombre a los 190), y la **cola de la flecha se estira** de 0,4
    a 1 — el mismo gesto que el panel, en chico. `transform-box: fill-box`
    para que el origen sea el extremo del trazo; escalar en X no engorda una
    línea horizontal, así que el grosor no cambia.
  - La **sombra se abre hacia adentro y casi no cae**: el panel se desplaza en
    horizontal, y una sombra con mucho desplazamiento vertical lo deja
    flotando como un globo en vez de deslizándose.
  - Abre también con **`:focus-visible`**, así que se recorre con el teclado.
- Con el visor de la galería abierto las pastillas se apagan solas
  (`body:has(.lbox:not([hidden]))`). Donde no haya `:has()` quedan detrás del
  velo, que ya las tapa: no se rompe nada.

## Transiciones entre páginas

`Transiciones.astro` (en el `<head>` de todas las páginas) + `transiciones.css`.
Usa **View Transitions nativas de navegación** (`@view-transition`), no una librería:
el navegador saca una foto de la página que se va, arma la nueva y anima entre las
dos. Donde no hay soporte (Firefox hoy) o con `prefers-reduced-motion`, se navega
como siempre y no se pierde nada.

- **Fundido completo**: las páginas entrante y saliente cambian su opacidad a la
  vez durante **0,65 s**, sin `clip-path`, barridos ni desplazamientos. Ida y vuelta
  usan el mismo gesto, activado con `data-vt` en `<html>` al llegar (`pagereveal`).
  La foto viaja por separado y se asienta en **0,85 s**. El telón del preloader
  de la primera carga de la home conserva su animación propia.
- **De una ficha a su vecina (las flechas Anterior / Siguiente) se DESLIZA la
  pantalla entera**, no hay fundido: la ficha que se va sale por un costado y
  la que llega entra desde el otro, pegadas, en **0,75 s**. "Siguiente" se va
  hacia la izquierda y trae la nueva desde la derecha; "Anterior", al revés.
  El navbar y el botón de WhatsApp tienen nombre propio, así que **no viajan**:
  la página corre por debajo y ellos quedan quietos, que es lo que lo hace
  leer como un cambio de pantalla y no como una recarga.
  Cuatro cosas de la CSS que parecen detalle y no lo son:
  - **`mix-blend-mode: normal`**, pisando el `plus-lighter` del fundido parejo.
    Ése existe para que dos capas que se funden sumen 1; acá las capas no se
    funden, se tapan — con plus-lighter el borde donde se tocan se prendía
    fuego.
  - **Las dos se mueven el 100% exacto y nada se escala.** Van pegadas como dos
    baldosas: cualquier escala, por chica que sea, abre una ranura de papel en
    la junta (a 1440px, once píxeles de costura a la vista). La profundidad
    sale de apagar apenas la que se va y de la sombra, no de un zoom.
  - **La sombra va en el borde de ataque de la que llega**: es lo que la hace
    leer como una hoja que entra POR ENCIMA.
  - Las reglas direccionales tienen **la misma especificidad** que las del
    fundido parejo, así que tienen que ir DESPUÉS en el archivo.
  La dirección la anota el link (`data-pn="ant"|"sig"`), la guarda `pageswap`
  junto con la foto y la lee `pagereveal`, que en vez de `data-vt="ida"` pone
  `data-vt="sig"` / `"ant"`. Sin ese dato —"atrás", o cualquier otro link—
  queda el fundido parejo de siempre. Entre dos fichas **no viaja ninguna
  foto**: son portadas distintas y fundir una con otra queda mal
  (`vt-sin-portada`).
- **La foto que viaja** (`proj-foto`): de la card del helicoidal —o de la vista
  previa del menú— a la portada de la ficha, y de vuelta a su card. El CSS no puede
  saber CUÁL foto viaja: la de origen la nombra la página que se va (`pageswap`) y
  la de destino la que llega (`pagereveal`), pasándose el dato por `sessionStorage`.
  La card entera viaja aparte (`proj-card`) para que, al despegarse la foto, el
  resto de la card se desvanezca en vez de quedar como un marco vacío.
- **Volver a la card**: si la home quedó en el bfcache el navegador la devuelve
  intacta y no hace falta nada. Si se recarga, al salir se anotó la posición —y, si
  se salió por una card, CUÁL, con qué filtro y en qué vista— y el helicoidal se
  rearma con esa card al frente, que es donde la foto tiene que aterrizar. La
  anotación va en `sessionStorage` con una clave por entrada del historial
  (`navigation.currentEntry.key`, o un id propio en `history.state` donde no hay
  Navigation API).
- **"Volver a proyectos"** en la ficha hace `history.back()` cuando la entrada
  anterior ES la home (así se aprovecha el bfcache y la foto vuelve volando); si se
  llegó de otro lado, es el link normal a `/#proyectos`.
- Dentro de la ficha, la **galería** usa la misma técnica pero en la misma página
  (`startViewTransition`): la miniatura crece hasta el visor y vuelve a su lugar al
  cerrar. Mientras dura, `<html>` lleva `vt-galeria` y el navbar/WhatsApp/portada
  sueltan su `view-transition-name` (con nombre se pintarían por encima del velo).
- Las fichas se **precargan** al apoyar el mouse en un link de proyecto
  (`speculationrules`, `prefetch` + `eagerness: moderate`). `prefetch` y NO
  `prerender`: pre-renderizar es mucho más caro y, medido en Chrome, choca con
  cualquier cambio reciente del historial y la transición se descarta.

## Interacciones globales y SEO

- **JS global** (`BaseLayout.astro`): menú móvil, sombra del header al scrollear
  (`.scrolled` / `.past-hero`), reveal-on-scroll (`IntersectionObserver`), y la capa
  inmersiva. **Al recargar se vuelve al hero:** `history.scrollRestoration='manual'` +
  `scrollTo(0,0)` si no hay ancla (respeta `/#seccion`). **"Atrás" es la excepción**:
  ahí se vuelve a donde uno estaba (ver "Transiciones entre páginas").
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

## Botón

Primitivo único en `global.css` (`.btn`). Antes había cuatro botones escritos por
separado —la 404, los filtros del helicoidal, el toggle "Ver todos"— con tres
tamaños distintos por accidente (.72 / .74 / .78rem); hoy son todos éste. **Toda
acción nueva usa `.btn`**: no escribir otro botón.

- **`.btn--primary`** (relleno petróleo) pide el click. **Una por pantalla.**
- **`.btn--ghost`** (filete) es la acción secundaria.
- **`.btn--select`** es una opción dentro de un grupo y marca la elegida con
  `[aria-pressed="true"]` (relleno tinta). La usan los filtros de proyectos.
- **`.btn--sm`** es el mismo botón en densidad de barra de herramientas (36px de
  alto en vez de 44).
- **`.btn-arrow`** es la flechita opcional que se corre en hover —el mismo gesto
  que `.crow .arrow` de Contacto—; con `--back` se corre hacia el otro lado.

Cuatro cosas que parecen detalle y no lo son:
- **El primario va en PETRÓLEO, no en tinta.** El relleno de tinta ya significaba
  "seleccionado" en los filtros, y el petróleo ya era el color de acción del sitio
  (el botón de WhatsApp). Con el CTA también en tinta, el mismo tratamiento diría
  dos cosas distintas en la misma página.
- **El estado seleccionado va en `.btn--select`, NO en `.btn[aria-pressed]`.** El
  toggle del helicoidal también usa `aria-pressed` (para "estoy en grilla") y se
  rellenaría de tinta al alternar: `aria-pressed` no significa lo mismo en los dos
  lados.
- **Sobre `.contact` el primario se invierte a papel.** El petróleo contra `--ink`
  da 1,5:1 y prácticamente desaparece; el papel da 15,5:1.
- **`.btn` es flex**, así que a ancho completo (el riel vertical de ≥1700px) lo que
  alinea el texto es `justify-content`, no `text-align`.

## Responsive y compatibilidad

Lo que hay que respetar para que el sitio siga entrando en cualquier pantalla y
cualquier navegador. Todo esto está verificado midiendo el layout de 320px a 2560px
de ancho (y en alturas de 390 a 1440), en la home y en la ficha de proyecto.

**Los tres cortes que mandan** (no son estéticos, cada uno tiene su geometría):
- **900px** → capa inmersiva (`immersive.ts`: además pide `pointer: fine` y no
  `prefers-reduced-motion`). Debajo, el hero es estático y el `<html>` no lleva
  `is-immersive`. También es donde "Quiénes somos" pasa a una columna y **la axonometría
  ni siquiera se descarga** (se pide con `fetch` a partir de 901px, ver su sección), y
  donde el **wireframe del hero cambia de encuadre** y pasa a ser el visual del hero
  mobile en vez de ocultarse.
- **760px** → navbar horizontal ⇄ menú hamburguesa (`header.css`), y piso de ancho
  del cilindro helicoidal. Es el mismo número por casualidad: el del navbar sale del
  ancho del wordmark + los 5 links, el del cilindro del radio de las cards.
- **620px de ALTO** → piso del cilindro. (Ojo: hay otro **620px, pero de ANCHO**,
  en `mapa.css` — ahí el mapa de la ficha oculta los rótulos de referencia y
  agranda el de la cruz. Y un tercero, de ALTO otra vez, en `proyecto-nav.css`.
  Comparten número por casualidad.)
- **1100px** → la ficha de proyecto apila portada y texto (`project-page.css`).
  Es geométrico y está explicado en "Página de proyecto": por debajo de eso la
  lista de características pasa el alto de la foto y las dos columnas quedan
  disparejas.
- **1000px + `hover: hover` + `pointer: fine`** → las flechas Anterior /
  Siguiente pasan de banda al pie a pastilla flotante en los bordes
  (`proyecto-nav.css`). Es el único corte del sitio que **no** es geométrico:
  la pastilla flota sobre la página (como el WhatsApp), así que no necesita
  entrar en ningún margen. Lo que pide es mouse —sin hover no hay manera de
  leer el nombre antes de hacer click— y pantalla suficiente para que el
  panel abierto no tape media ficha.

**Cosas que ya se rompieron una vez y no hay que volver a romper:**
- **El "Estudio 21" del hero no da la vuelta entera, y sólo se mueve en ≥900px.**
  Las dos cosas por separado. (a) El **péndulo** (ver arriba) existe porque pasados
  los ~90° se veía la **espalda** del bloque, que no es una cara diseñada sino la capa
  más lejana del extruido espejada por el navegador (`backface-visibility: visible`
  → el "21" al revés, y en el gris claro del fondo del degradé), y cerca del canto las
  16 capas se separan y se lee como un peine. (b) Debajo de **900px** el título va
  quieto y de frente igual: el 3D a 60fps de fondo no paga lo que gasta de batería en
  un celular. Ojo: el peine ya no es motivo del corte de 900px —el péndulo no llega
  nunca a ese ángulo—, pero la batería sí.
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
  equipo que menos tiene. La regla lleva **`:not(.lbg-grain)`**: el grano es una capa
  estática y declara `will-change:auto` a propósito, pero esta regla (más específica)
  le ganaba y lo promovía igual — justo lo que ese `auto` quería evitar.

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

- **Un link interno sin la barra final NO transiciona.** Todos los links a una
  ficha se escriben `` `${base}/proyectos/${slug}/` ``, con barra. Sin ella el
  servidor (y GitHub Pages) responde un **redirect** a la versión con barra, y
  Chrome **descarta la view transition en una navegación redirigida**: el
  fundido no corre y la página aparece de golpe. El síntoma engaña, porque la
  página que se va SÍ arranca su transición (`pageswap` tiene `viewTransition`)
  y la que llega no (`pagereveal` lo recibe en `null`).
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
- **`focus` NO es "el usuario llegó con el teclado".** Al hacer click con el mouse el
  link también recibe el foco. En el helicoidal, el handler de `focus` que rota el
  cilindro hasta la card enfocada se disparaba con cada click: arrancaba un scroll
  suave de cientos de px justo en el momento de abrir la card —la card se movía y
  crecía bajo el cursor— y, con las transiciones, la foto que viaja salía de donde la
  card había quedado y no de donde se hizo click; peor todavía, el corrimiento de
  scroll le hacía perder a `Transiciones.astro` la anotación de QUÉ card se abrió, así
  que al volver el cilindro no la traía al frente y la foto no tenía dónde aterrizar.
  Para "sólo con el teclado" hay que chequear **`:focus-visible`**, no `focus`.
- **La card anotada no se decide mirando si el scroll se movió.** Entre el click y el
  `pagehide` la página puede seguir moviéndose sola (inercia del trackpad, un scroll
  suave frenando). Lo que decide es si nos estamos yendo POR ese click — por eso se
  anota cuándo fue el último click que marcó una card, y no se compara `scrollY`.
- **`fallbackFormat` en `<Picture>`**: el `<img>` de adentro del `<picture>` (el que
  se usa si ninguna `<source>` sirve) por defecto sale en el formato ORIGINAL, y eso
  obliga a generar cada ancho TAMBIÉN en jpg/png. Eran ~40 MB de un build de 155 MB
  que ningún navegador llegaba a pedir. Con `fallbackFormat="webp"` el build dejó de
  generarlos, sin que cambie un solo byte de lo que descarga un visitante.
- **El build emite igual el original de cada foto**: `images.ts` las importa
  con `import.meta.glob(..., { eager: true })` para que aparezcan solas por
  convención de carpetas, y Vite emite todo lo importado. No lo descarga nadie —es
  peso del artefacto de deploy, no del visitante— y es el precio de esa comodidad.
- **`dist/` pesa ~149 MB y eso NO es lo que baja un visitante.** Son todas las
  variantes de todas las fotos (cada ancho en avif y en webp) más los originales
  emitidos; cada visitante baja una sola variante de cada foto que mira. El número
  a vigilar es el de "Fotos — formato, peso y entrega", no el de `du -sh dist`.

## Verificar legibilidad

El contraste y el tamaño **se miden, no se estiman**. El procedimiento que se
usó para la tanda D (y que conviene repetir al tocar colores o tamaños):
un script con Chrome por CDP que recorre **todos los bloques de texto** de una
página, resuelve el color de fondo real (incluyendo capas translúcidas y la
opacidad heredada, que en el cilindro es clave) y reporta ratio y píxeles,
marcando lo que no llega a AA (4,5:1 para texto normal) y lo que mide menos de
12px. Tres cosas que hacen que la medición sea honesta y que es fácil olvidar:
- **`getComputedStyle().color` no sirve en SVG**: ahí el color del texto es
  `fill`. Sin eso, los rótulos del mapa dan cualquier número.
- **`color-mix()` computa a `color(srgb 0.91 0.9 0.88 / 0.84)`**, con los
  canales de 0 a 1 y no de 0 a 255. Un parser que no lo contemple lee el header
  del sitio como casi negro y reporta fallas que no existen.
- **La opacidad del ancestro cuenta**: las cards del fondo del cilindro están
  al 13% y van a dar "no pasa" siempre. Son el efecto 3D, no un problema —
  lo que hay que mirar es la card del frente.

⚠ **Hay que medir con la página ASENTADA.** El panel del navbar entra con una
transición de 0,45 s y los `.reveal` con otra de 0,7 s: midiendo antes, el
auditor lee el texto del header contra la sección que todavía se ve a través
del panel a medio pintar y reporta fallas que no existen (pasó con el link de
Contacto en petróleo: 1,66:1 a mitad de transición, 7,7:1 cuando terminó). El
scroll previo tiene que ser `behavior:'instant'` y hay que esperar un par de
segundos antes de leer.

Medido así, hoy **el único texto que no pasa AA** en la home, en la ficha de
proyecto ni en la 404, a 1440 y a 390px de ancho, es el botón **deshabilitado**
"Vista nueva" (2,03:1) — y es a propósito: está en `opacity:.5` porque todavía
no hace nada.

## Verificar menú y navegación

⚠ **Las transiciones entre páginas NO se pueden probar en `npm run dev`**: en
dev, Astro inyecta la CSS de los componentes con JS después de parsear, así que
el `@view-transition` todavía no está cuando el navegador decide si corre la
transición. Hay que mirarlas siempre sobre `npm run build` + `npm run preview`.
(Y el navegador embebido de algunos editores las saltea aun así — para verlas
de verdad, un Chrome común.)

Al tocar `Header` o las transiciones, probar también en `npm run build` +
`npm run preview`: abrir estado → proyecto → vista previa, salir y volver a pasar
por el lugar donde estaban los paneles. Deben quedar cero `.is-open`, `.is-prev`
y `.tiene-prev`, y los paneles ocultos no deben recibir el puntero. Reabrir desde
la barra debe mostrar sólo los tres estados. Revisar Tab/Escape y el acordeón en
390px; el tap en "Proyectos" no debe cerrar la hamburguesa ni navegar.
Abrir una card y volver con Atrás debe conservar el fundido completo y aterrizar
en la card correcta, sin telón entre páginas.

## Pendientes antes de publicar

- **Dominio real** en `site` (`astro.config.mjs`) + `public/robots.txt` — de ahí salen canonical, sitemap y URLs absolutas de OG. Hoy es el placeholder `estudio21arq.com`.
- **m² de Cavas de Haedo**: es **estimado** (~80 m²/unidad, promedio de los
  otros proyectos), no es dato oficial. Es el único que queda estimado: los
  años y los m² de Villa Platero, Vila Rodona y Chana I los dio el estudio
  (los tres entregan en 2028).
- **`formEndpoint`** en `src/data/site.ts` (hoy `null`): sin eso el formulario
  de Contacto abre el cliente de mail del visitante en vez de mandarse solo.
  Es lo primero de esta lista. Ver "Contacto".
- **Instagram** en `src/data/site.ts` (hoy `null`): si se completa, aparece solo como una fila más de Contacto.
- **Confirmar con el estudio que las direcciones exactas se publican**: la ficha
  muestra calle y número bajo el mapa (`direccion` en el frontmatter). Si para
  algún proyecto no corresponde, se borra ese campo y la cartela queda con el
  barrio solo — el mapa sigue andando, porque la cruz sale de `coords`.
- **Tres proyectos declaran un barrio distinto del oficial** (Terrazas de Cajal,
  Terrazas de Italia y Villa Platero: ver "Mapa de situación"). Está resuelto en
  el dibujo, pero si el estudio prefiere usar el nombre oficial en la ficha, se
  cambia `barrio` en esos tres `.md` y el mapa se acomoda solo.
- Sección de **cómo invertir**: por ahora **no se hace** (decisión del 2026-08-18). La apuesta es que el impacto visual lleve al inversor a escribir; se puede retomar más adelante.
