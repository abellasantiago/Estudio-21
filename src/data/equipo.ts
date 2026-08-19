export interface Integrante {
  /** slug = nombre del archivo de foto en src/assets/equipo/<slug>.jpg */
  slug: string;
  nombre: string;
  rol: string;
}

/**
 * Equipo de Estudio 21 (6 personas).
 * Para agregar la foto de cada uno, tirá el archivo en:
 *   src/assets/equipo/<slug>.jpg   (también vale .png / .webp / .avif)
 * y aparece sola. Mientras tanto se muestra un placeholder con las iniciales.
 */
export const equipo: Integrante[] = [
  { slug: 'gustavo-abella', nombre: 'Gustavo Abella', rol: 'Socio · Arquitecto' },
  { slug: 'guillermo-tosi', nombre: 'Guillermo Tosi', rol: 'Socio · Arquitecto' },
  { slug: 'lucia-arrieta', nombre: 'Lucía Arrieta', rol: 'Arquitecta' },
  { slug: 'santiago-abella', nombre: 'Santiago Abella', rol: 'Dirección de Empresas' },
  { slug: 'sofia-tosi', nombre: 'Sofía Tosi', rol: 'Arquitecta' },
  { slug: 'federico-cardozo', nombre: 'Federico Cardozo', rol: 'Arquitecto' },
];
