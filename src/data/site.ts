/**
 * Datos del estudio usados en varios lugares (header, contacto, footer,
 * SEO y JSON-LD). Centralizados acá para tocar una sola vez.
 */
export const site = {
  nombre: 'Estudio 21',
  nombreLargo: 'Estudio 21 — Arquitectura y desarrollo',
  descripcion:
    'Desarrolladora boutique en Montevideo. Concebimos, construimos y entregamos cada proyecto de principio a fin. Más de 15 proyectos en más de 10 años.',
  email: 'estudiodearquitectos21@gmail.com',
  // Dirección real del estudio (no modificar).
  direccion: {
    calle: '21 de Setiembre 3024',
    ciudad: 'Montevideo',
    pais: 'Uruguay',
    paisISO: 'UY',
  },
  // Link a Google Maps por búsqueda de la dirección (sin necesidad de coordenadas).
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=21+de+Setiembre+3024+Montevideo',
  // El teléfono del estudio es el mismo número de WhatsApp, y va en las TRES
  // formas que pide cada consumidor: internacional para el JSON-LD (que lo
  // leen buscadores de cualquier país), como se escribe acá para mostrarlo en
  // Contacto, y los dígitos pelados que exige wa.me. Si cambia el número,
  // cambian los tres.
  telefono: '+598 99 421 576' as string | null,
  telefonoVisible: '099 421 576' as string | null,
  whatsapp: '59899421576' as string | null, // sin +, para wa.me
  // PENDIENTE: completar si querés sumarlo al sitio.
  instagram: null as string | null, // ej. 'https://instagram.com/...'
  // Imagen por defecto para compartir (Open Graph / Twitter).
  // Banner de marca 1920×1080 (negro + tagline). Para proyectos con portada,
  // cada página usa su propia portada como imagen OG (ver ProjectLayout).
  ogImage: '/og-default.png',
} as const;

/** El saludo por defecto: el que usan el botón flotante y la fila de Contacto. */
const SALUDO = 'Hola, Estudio 21. Quería hacerles una consulta.';

/**
 * Link de WhatsApp con el mensaje ya escrito. Sin argumento da el saludo
 * genérico; la ficha de cada proyecto le pasa el suyo, con el nombre de la obra
 * adentro, para que el estudio sepa por qué le escriben antes de contestar.
 * Devuelve `null` si todavía no hay número cargado, así quien lo use decide el
 * reemplazo (un `mailto:`) en vez de pintar un botón roto.
 */
export function linkWhatsApp(mensaje: string = SALUDO): string | null {
  return site.whatsapp
    ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(mensaje)}`
    : null;
}

export const whatsappHref = linkWhatsApp();
