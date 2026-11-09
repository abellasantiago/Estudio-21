export interface Integrante {
  /** slug = nombre del archivo de foto en src/assets/equipo/<slug>.png */
  slug: string;
  nombre: string;
  rol: string;
  /**
   * Encuadre del retrato, para que los seis se lean como una misma serie.
   *
   * Las fotos son recortes (PNG con transparencia) de 800×1000 tomados en
   * sesiones distintas, y venían con la cabeza a distinto tamaño y a distinta
   * altura: de 220px (Federico) a 324px (Lucía) de coronilla a mentón — un
   * 47% de diferencia — y la línea de los ojos repartida en 77px. Puestos uno
   * al lado del otro se leían como seis fotos sueltas, no como un equipo.
   *
   * Estos tres números corrigen eso sin tocar los archivos: `zoom` iguala el
   * tamaño de la cabeza, y `x`/`y` (en % de la caja) llevan la cara al centro
   * y la línea de los ojos al 38% del alto, igual en los seis.
   *
   * ⚠ NO están puestos a ojo ni se ajustan a ojo: salen de medir cada cara
   *    (coronilla, ojos y mentón) con el detector de rostros de macOS. Si se
   *    cambia una foto, hay que volver a medir — el procedimiento está en
   *    CLAUDE.md, "Equipo · encuadre de los retratos".
   */
  zoom: number;
  /** corrimiento horizontal en % de la caja (centra la cara) */
  x: number;
  /** corrimiento vertical en % de la caja (pone los ojos en la línea común) */
  y: number;
}

/**
 * Equipo de Estudio 21 (6 personas).
 * Para agregar la foto de cada uno, tirá el archivo en:
 *   src/assets/equipo/<slug>.png   (también vale .jpg / .webp / .avif)
 * y aparece sola. Mientras tanto se muestra un placeholder con las iniciales.
 */
export const equipo: Integrante[] = [
  { slug: 'gustavo-abella', nombre: 'Gustavo Abella', rol: 'Socio · Arquitecto', zoom: 1.264, x: -1.34, y: 10.89 },
  { slug: 'guillermo-tosi', nombre: 'Guillermo Tosi', rol: 'Socio · Arquitecto', zoom: 1.155, x: -0.26, y: 8.11 },
  { slug: 'lucia-arrieta', nombre: 'Lucía Arrieta', rol: 'Arquitecta', zoom: 1.0, x: 0.13, y: 2.9 },
  { slug: 'santiago-abella', nombre: 'Santiago Abella', rol: 'Dirección de Empresas', zoom: 1.359, x: -1.26, y: 12.07 },
  { slug: 'sofia-tosi', nombre: 'Sofía Tosi', rol: 'Arquitecta', zoom: 1.393, x: -2.92, y: 12.57 },
  { slug: 'federico-cardozo', nombre: 'Federico Cardozo', rol: 'Arquitecto', zoom: 1.472, x: -2.16, y: 14.48 },
];
