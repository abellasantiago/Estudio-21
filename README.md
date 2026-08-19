# Estudio 21 — sitio estático (Astro)

Sitio de **Estudio 21**, desarrolladora boutique de Montevideo. Migrado de
WordPress a un sitio **estático** con [Astro](https://astro.build), TypeScript y
CSS propio. Sin frameworks de UI, con JavaScript mínimo.

- Diseño: hormigón cálido + tinta + acento petróleo · tipografías Space Grotesk /
  Inter / IBM Plex Mono.
- Tipografías servidas **localmente** (Fontsource, woff2, sin Google Fonts CDN).
- Imágenes optimizadas (AVIF + WebP + `srcset`) con el componente de Astro.
- SEO técnico: meta únicos por página, Open Graph/Twitter, JSON-LD, `sitemap.xml`
  y `robots.txt`.

---

## Requisitos

- **Node.js 20 LTS o superior** y **npm** (vienen juntos). Si no lo tenés,
  bajalo de <https://nodejs.org> (versión LTS) y reiniciá la terminal.

Para verificar que quedó instalado:

```bash
node -v   # debería imprimir v20.x o superior
npm -v
```

## Correr el sitio en local

```bash
npm install        # instala dependencias (la primera vez)
npm run dev        # servidor de desarrollo en http://localhost:4321
```

Otros comandos:

```bash
npm run build      # genera el sitio estático en dist/
npm run preview    # sirve dist/ para revisar el build final
npm run check      # chequeo de tipos y del proyecto (astro check)
```

---

## Estructura

```
src/
├─ assets/
│  ├─ proyectos/<slug>/portada.jpg, galeria-*.jpg   (ver LEEME.md)
│  └─ equipo/<slug>.jpg                              (ver LEEME.md)
├─ components/
│  ├─ BaseHead.astro     SEO: title/description, canonical, OG/Twitter, JSON-LD
│  ├─ Header.astro · Footer.astro · FloatingWhatsApp.astro · Preloader.astro
│  ├─ ProyectosHelicoidal.astro · TeamMember.astro
│  ├─ LivingBackground.astro · HeroWireframe.astro · ProgressRail.astro
│  └─ sections/          Hero · Nosotros · Proyectos · Estudio · Contacto
├─ content/proyectos/    un .md por proyecto (datos + descripción)
├─ content.config.ts     colección "proyectos" + schema Zod
├─ data/
│  ├─ equipo.ts          los 6 integrantes
│  └─ site.ts            datos del estudio (mail, dirección, etc.)
├─ layouts/
│  ├─ BaseLayout.astro   shell + fuentes + JS global (menú, scroll, reveal)
│  └─ ProjectLayout.astro  detalle de proyecto
├─ lib/images.ts         descubre fotos por convención de carpetas
├─ pages/
│  ├─ index.astro            home
│  ├─ proyectos/[slug].astro detalle por proyecto (getStaticPaths)
│  └─ 404.astro
└─ styles/               global.css (tokens) + un .css por componente
public/                  robots.txt, favicon.png, apple-touch-icon.png, og-default.png
design/estudio21-home.html   diseño original (fuente de verdad visual)
```

---

## Agregar o editar un proyecto

1. **Datos.** Creá (o editá) un archivo en `src/content/proyectos/<slug>.md`.
   Usá uno existente como molde. El frontmatter lleva los datos y el cuerpo del
   `.md` es la descripción:

   ```markdown
   ---
   nombre: Terrazas de Italia
   slug: terrazas-de-italia
   estado: en-proceso        # en-proceso | terminado | proximamente
   ubicacion: Montevideo
   barrio: Pocitos           # opcional
   anio: 2025
   unidades: 24              # opcional
   metros: 1800              # m² — opcional
   ---

   Acá va la descripción del proyecto, en uno o varios párrafos.
   ```

   - El **nombre del archivo** y el campo `slug` definen la URL: `/proyectos/<slug>/`.
   - Si un dato todavía no se sabe, dejalo comentado (`# unidades:`) o sacá la
     línea: en la ficha técnica aparece como “Pendiente”.

2. **Fotos.** Tirá las imágenes en `src/assets/proyectos/<slug>/`:

   ```
   src/assets/proyectos/<slug>/portada.jpg      -> portada (grande)
   src/assets/proyectos/<slug>/galeria-01.jpg   -> galería
   src/assets/proyectos/<slug>/galeria-02.jpg
   ```

   Aparecen solas (no hay que listarlas). Formatos: `jpg`, `png`, `webp`, `avif`.
   Astro genera AVIF/WebP, varios tamaños y agrega `width`/`height`.

   **La portada se muestra siempre en 4/5** (vertical suave). Si el encuadre no
   te convence, ajustalo en el frontmatter del proyecto sin tocar el archivo:
   `portadaFoco: "50% 30%"` mueve qué parte de la foto se conserva y
   `portadaZoom: 1.15` acerca desde ese mismo punto.

   **Las fotos de galería no hace falta recortarlas a ningún formato**: se
   muestran en una tira horizontal donde todas van al mismo alto y cada una con
   el ancho que le corresponde por su proporción. Al clickear una se abre grande,
   con flechas para pasar a la anterior o la siguiente.

El proyecto aparece automáticamente en la grilla de la home (respeta el filtro
Todos / En proceso / Terminados) y genera su página de detalle.

## Fotos del equipo

Una foto por persona, con el nombre igual al `slug` (definido en
`src/data/equipo.ts`):

```
src/assets/equipo/gustavo-abella.jpg
src/assets/equipo/guillermo-tosi.jpg
...
```

Hasta que cargues la foto, se muestra un placeholder con las iniciales.

## Imagen de "Quiénes somos"

La sección de presentación tiene una columna gráfica a la izquierda, hoy vacía.
Para llenarla, tirá una imagen apaisada en:

```
src/assets/estudio/presentacion.jpg
```

Aparece sola. Ver [`src/assets/estudio/LEEME.md`](src/assets/estudio/LEEME.md).

## Piezas de marca (favicon, icono de iOS, imagen para compartir)

No se editan a mano: se generan del logo original con la paleta del sitio.

```bash
node scripts/generar-marca.mjs
```

Lee el artwork de `src/assets/marca/` (`banner_negro.png`, el lockup, e
`icono-21.png`, el icono) y escribe en `public/`: `favicon.png` y
`apple-touch-icon.png` (512×512, el icono de siempre remapeado a tinta y papel)
y `og-default.png` (1200×630, el logo sobre papel con el "21" fantasma, las
marcas de registro y la bajada en mono). Usa las mismas tipografías del sitio,
convirtiendo los `.woff` de Fontsource a `.ttf` al vuelo
(`scripts/lib/woff-a-ttf.mjs`), porque Pango no lee `woff2`. Para probar sin
pisar nada: `node scripts/generar-marca.mjs <carpeta>`.

---

## Antes de publicar (PENDIENTE)

- [ ] **Dominio:** cambiar `site` en [`astro.config.mjs`](astro.config.mjs) y la
      línea `Sitemap:` en [`public/robots.txt`](public/robots.txt) por el dominio real.
- [ ] **Datos de proyectos:** unidades y m² de los cuatro proyectos nuevos.
- [ ] **Fotos:** portada y galería de Sushi WOK Perú (es el único sin fotos).
- [ ] **Contacto opcional:** teléfono / WhatsApp / Instagram en `src/data/site.ts`
      (si los completás, aparecen solos en la sección de contacto).

---

## Deploy (hosting estático)

El sitio se compila a HTML/CSS/JS en `dist/`. Recomendado: **Cloudflare Pages**
(rápido, gratis, CDN global). También sirven Netlify o Vercel; los tres detectan
Astro solos.

**Cloudflare Pages / Netlify / Vercel** (desde el repo de GitHub):

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20

Pasos (Cloudflare Pages): crear proyecto → conectar el repositorio → poner esos
valores → Deploy. Cada `git push` vuelve a publicar.

> Acordate de configurar el dominio real (ver PENDIENTE) para que `canonical`,
> el `sitemap.xml` y los previews de Open Graph usen las URLs correctas.

---

## Notas técnicas

- **Tipografías:** Fontsource carga sólo los pesos del diseño (Space Grotesk
  400/500/700, Inter 400/500, IBM Plex Mono 400/500) con `font-display: swap`.
  Se hace `preload` de Space Grotesk 500 (los titulares) en el `<head>`.
- **Estilos:** los tokens y helpers compartidos están en `src/styles/global.css`;
  cada componente importa su propio `.css`.
- **JS:** el menú móvil, el desplegable de "Proyectos" del navbar (los tres estados y,
  dentro de cada uno, sus proyectos; abre con hover/teclado sin JS, el script agrega el
  modo tap y el Escape), la sombra del header al scrollear, el reveal-on-scroll, el
  filtro de proyectos y el carrusel **helicoidal 3D** (giro del cilindro atado al scroll,
  que arranca recién cuando el panel se fija; la 1ª card queda centrada hasta ahí). Al
  **recargar** la página se vuelve al inicio (hero) en vez de restaurar la posición previa.
  Todo respeta `prefers-reduced-motion` (sin motion, el helicoidal queda como grilla
  estática accesible).

## Solución de problemas

- Si el build se queja del import del `preload` en `src/components/BaseHead.astro`
  (la línea del `.woff2` de Space Grotesk), revisá el nombre exacto del archivo en
  `node_modules/@fontsource/space-grotesk/files/`. La convención de Fontsource v5 es
  `space-grotesk-latin-500-normal.woff2`; si tu versión usa otro nombre, ajustá esa
  única línea de import.
