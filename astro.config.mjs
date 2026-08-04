// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// IMPORTANTE: cambiá `site` por el dominio real de producción.
// Se usa para canonical, sitemap.xml y las URLs absolutas de Open Graph.
const SITE = 'https://estudio21arq.com'; // PENDIENTE: dominio definitivo

// El build en GitHub Actions publica en https://<usuario>.github.io/Estudio-21/,
// así que necesita el nombre del repo como base. Fuera de ese entorno (build local,
// dominio propio) `base` queda en '/' y no cambia nada.
const isGhPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: SITE,
  base: isGhPages ? '/Estudio-21' : '/',
  integrations: [sitemap()],
  // Las imágenes se optimizan con sharp (AVIF + WebP) vía <Image>/<Picture>.
});
