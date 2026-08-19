/**
 * Motor inmersivo de la home de Estudio 21.
 * ------------------------------------------------------------
 * Aplica la capa de profundidad/movimiento (estilo activetheory, con identidad
 * de estudio y Z contenido) sobre el markup semántico de la home. Todo es
 * progressive enhancement: sin JS / prefers-reduced-motion / mobile → el sitio
 * queda estático y legible (esta capa ni se activa).
 *
 * Un único requestAnimationFrame maneja:
 *   · el giro del "Estudio 21" del hero (rotateY) + su retroceso y desvanecido
 *     a medida que la cámara avanza (se integra al fondo);
 *   · el "descenso" hero → cards: el corredor de marcos avanza en Z y el
 *     fantasma "21" del fondo gira lento (movimiento/profundidad continuos);
 *   · el paralaje de mouse de las capas [data-depth] + deriva autónoma del fondo;
 *   · el rail de progreso.
 *
 * Sólo se tocan `transform`/`opacity`. Al desactivar (resize a mobile, etc.) se
 * limpian todos los estilos inline — mismo patrón que `disable3D` del helicoidal.
 */

type Parallax = {
  el: HTMLElement;
  depth: number; // desplazamiento por mouse (proporción de MOUSE_RANGE)
  scroll: number; // paralaje de scroll (px por px scrolleado)
  drift: number; // amplitud de la deriva autónoma (px)
  rotate: number; // ° de rotateY a lo largo del descenso (0 = no rota)
  phase: number; // desfase de la deriva, para que no vayan todas iguales
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initImmersive(): void {
  const root = document.documentElement;
  // Sólo corre en páginas marcadas como inmersivas (la home).
  if (!root.hasAttribute('data-immersive-page')) return;

  const intro = document.querySelector<HTMLElement>('[data-immersive-intro]');
  const title = document.querySelector<HTMLElement>('[data-immersive-title]');
  // La opacidad del título NO puede ir sobre `title` (.hero-title): ese elemento
  // tiene `transform-style: preserve-3d` y `opacity < 1` es una propiedad de
  // "grouping" que lo aplana → el "21" extruido colapsaba a una sola capa 2D al
  // scrollear. La aplicamos sobre el padre (.hero-title-wrap), que no es contexto
  // 3D, así las capas siguen en 3D.
  const titleFade = title?.parentElement ?? null;
  const corridor = document.querySelector<HTMLElement>('[data-corridor]');
  // fin del "descenso": el arranque del helicoidal de proyectos (las cards).
  const descentEnd = document.getElementById('proyectos');
  // La aparición del header la resuelve el scroll siempre-activo de BaseLayout
  // (clase `past-hero`), no este motor → aparece aunque esta capa no arrancara.
  const railFill = document.querySelector<HTMLElement>('[data-rail-fill]');
  const scrollHint = document.querySelector<HTMLElement>('[data-scroll-hint]');
  // pabellón wireframe del hero: se revela SOLO (temporizado), no con el mouse
  const wireframe = document.querySelector<HTMLElement>('[data-wireframe]');

  // "hero a la vista": lo dispara el preloader al levantar el telón (primera
  // carga) o al arranque directo (reload/sin preloader). Desde ese instante se
  // cuenta el delay del wireframe. Se captura una sola vez por carga de página
  // (independiente del ciclo enable/disable del motor), con salvavidas por si el
  // evento no llegara. El flag global cubre el caso en que el preloader dispare
  // el evento ANTES de que este módulo registre el listener.
  let heroReadyAt = -1;
  const markHeroReady = () => {
    if (heroReadyAt < 0) heroReadyAt = performance.now();
  };
  if ((window as unknown as { __e21HeroReady?: boolean }).__e21HeroReady) markHeroReady();
  else document.addEventListener('e21:hero-ready', markHeroReady, { once: true });
  window.setTimeout(markHeroReady, 9000);

  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fineMq = window.matchMedia('(pointer: fine)');
  const wideMq = window.matchMedia('(min-width: 900px)');
  const capable = () => !reduceMq.matches && fineMq.matches && wideMq.matches;

  // ---- parámetros (Z contenido, movimiento cuidado) ----
  const TOTAL_ROTATION = 360; // ° extra que gira "Estudio 21" con el scroll del hero
  const SPIN_PERIOD = 18000; // ms por vuelta del giro horizontal continuo (constante)
  const TITLE_RECEDE = 460; // px que retrocede el título en Z mientras gira
  const CORRIDOR_DEPTH = 720; // px que avanza el corredor de marcos en el descenso
  const MOUSE_RANGE = 26; // px máx de desplazamiento por paralaje de mouse
  const DRIFT_SPEED = 0.00016; // velocidad de la deriva autónoma del fondo vivo
  const WF_DELAY = 1000; // ms de espera tras el hero antes de empezar a revelar el wireframe
  const WF_REVEAL_MS = 1600; // ms en que el wireframe sube de 0 a 1 (aparición gradual)
  const RAMP_MS = 1100; // rampa de arranque: deriva/cabeceo entran de a poco (ver t0)

  let parallax: Parallax[] = [];
  let raf = 0;
  let running = false;
  let enabled = false;

  // estado animado (lerpeado en cada frame)
  let mx = 0;
  let my = 0;
  let tmx = 0;
  let tmy = 0;
  let angle = 0;
  // t0 = timestamp del primer frame visible. El giro y la deriva se calculan
  // RELATIVOS a t0 (no al reloj absoluto de la página): así el primer frame del
  // motor coincide EXACTO con el estado que ya pintó el CSS (rotateY 0°, fondo
  // en reposo) y no hay salto/flash al cargar — el movimiento arranca desde ahí.
  let t0 = -1;

  // revelado del wireframe: temporizado desde heroReadyAt (no depende del mouse)
  let wfApplied = -1;

  function collect(): void {
    parallax = Array.from(document.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
      el,
      depth: parseFloat(el.dataset.depth || '0'),
      scroll: parseFloat(el.dataset.scroll || '0'),
      drift: parseFloat(el.dataset.drift || '0'),
      rotate: parseFloat(el.dataset.rotate || '0'),
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function onMouse(e: MouseEvent): void {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function frame(now: number): void {
    if (!running) return;
    if (!document.hidden) {
      // reloj relativo + rampa de arranque (smoothstep 0→1 en RAMP_MS): la
      // deriva del fondo y el cabeceo parten de 0 (= estado pintado por CSS)
      // y toman su amplitud de a poco — sin "pantallazo" en el primer frame.
      if (t0 < 0) t0 = now;
      const t = now - t0;
      const r = clamp(t / RAMP_MS, 0, 1);
      const ramp = r * r * (3 - 2 * r);
      mx = lerp(mx, tmx, 0.06);
      my = lerp(my, tmy, 0.06);
      const scrollY = window.scrollY;

      // progreso del tramo del hero (0 al empezar → 1 al terminar el giro)
      let introProgress = 0;
      if (intro) {
        const range = intro.offsetHeight - window.innerHeight;
        introProgress =
          range > 0 ? clamp(-intro.getBoundingClientRect().top / range, 0, 1) : 0;
      }
      // mismo desvanecido que el título (0.65→1 del tramo del hero): el corredor
      // de marcos lo comparte para no quedar creciendo de fondo, molestando la
      // lectura, una vez que "Estudio 21" ya se integró al espacio.
      const heroFadeOut = clamp(1 - (introProgress - 0.65) / 0.35, 0, 1);

      // progreso del "descenso" completo hero → cards (helicoidal)
      let descent = 0;
      if (descentEnd) {
        const absTop = descentEnd.getBoundingClientRect().top + scrollY;
        descent = absTop > 0 ? clamp(scrollY / absTop, 0, 1) : 0;
      }

      // "Estudio 21": gira horizontalmente de forma constante e infinita
      // (giro continuo por tiempo, desde 0° — reloj relativo a t0) + un giro
      // extra atado al scroll del hero; además retrocede en Z y se desvanece
      // integrándose al fondo.
      const spin = (t / SPIN_PERIOD) * 360;
      angle = spin + introProgress * TOTAL_ROTATION;
      if (title) {
        const recede = introProgress * TITLE_RECEDE;
        // vaivén leve autónomo + inclinación sutil hacia el mouse, para que en
        // reposo el "21" no quede estático y se perciba su profundidad. Se apaga
        // a medida que arranca el giro del scroll (idle → 0) para no competir.
        const idle = clamp(1 - introProgress * 2.5, 0, 1);
        // el giro horizontal ya es continuo (angle); acá sólo un cabeceo vertical
        // leve + la inclinación hacia el mouse para reforzar la profundidad.
        const swayX = Math.sin(now * 0.0008 + 1.3) * 2.4 * idle * ramp;
        const tiltY = mx * 5 * idle;
        const tiltX = -my * 4 * idle;
        title.style.transform =
          `translateZ(${(-recede).toFixed(1)}px) ` +
          `rotateX(${(swayX + tiltX).toFixed(2)}deg) ` +
          `rotateY(${(angle + tiltY).toFixed(2)}deg)`;
        // sombra: respira con el ángulo — de frente el bloque proyecta su
        // huella completa, de canto (90°/270°) proyecta menos → más tenue.
        const rad = (angle * Math.PI) / 180;
        title.style.setProperty(
          '--shadow-pulse',
          (0.72 + 0.28 * Math.abs(Math.cos(rad))).toFixed(3),
        );
        // el fade va en el padre (no en el nodo preserve-3d) — ver `titleFade`.
        // se mantiene bien visible girando y recién se desvanece al final del
        // tramo (introProgress 0.65 → 1), cuando se integra al fondo/espacio.
        if (titleFade) {
          titleFade.style.opacity = heroFadeOut.toFixed(3);
        }
      }

      // corredor de marcos: avanza hacia la cámara (crece por perspectiva)
      // durante todo el descenso, pero se desvanece junto con el título — sin
      // esto seguía viéndose (y agrandándose) sobre "Quiénes somos" y el resto,
      // compitiendo con la lectura. ×0.6: conserva la opacidad base tenue del
      // corredor (definida en immersive.css) en vez de pisarla a 1 mientras
      // heroFadeOut vale 1 al principio del hero.
      if (corridor) {
        corridor.style.transform = `translateZ(${(descent * CORRIDOR_DEPTH).toFixed(1)}px)`;
        corridor.style.opacity = (0.6 * heroFadeOut).toFixed(3);
      }

      // las anotaciones mono del fondo se desvanecen al dejar el hero (para no
      // entorpecer la lectura) y reaparecen al volver — se multiplica su opacidad
      // por --hero-fade desde CSS (ver .lbg-note en immersive.css).
      const heroFade = clamp(1 - scrollY / (window.innerHeight * 0.7), 0, 1);
      root.style.setProperty('--hero-fade', heroFade.toFixed(3));

      // wireframe del hero: aparece SOLO (sin el mouse). Arranca a revelarse
      // WF_DELAY después de que el hero queda a la vista (fin del preloader, o
      // load directo en reload) y sube de a poco (smoothstep) en WF_REVEAL_MS.
      // Una vez revelado, queda. El anclaje es max(heroReadyAt, t0): si la
      // pestaña cargó en background, t0 (primer frame VISIBLE) manda → el
      // revelado gradual empieza recién al hacerse visible, no ya consumido.
      if (wireframe && heroReadyAt >= 0) {
        const wfAnchor = Math.max(heroReadyAt, t0);
        const wp = clamp((now - wfAnchor - WF_DELAY) / WF_REVEAL_MS, 0, 1);
        const target = wp * wp * (3 - 2 * wp);
        const v = +target.toFixed(3);
        if (v !== wfApplied) {
          wfApplied = v;
          wireframe.style.setProperty('--wf-reveal', String(v));
        }
      }

      // capas del fondo: mouse (todas) + scroll + deriva + rotateY (data-rotate)
      // (la deriva entra con la rampa: en el primer frame es 0 = posición CSS)
      for (const p of parallax) {
        const drift = p.drift ? Math.sin(now * DRIFT_SPEED + p.phase) * p.drift * ramp : 0;
        const tx = mx * p.depth * MOUSE_RANGE + drift * 0.6;
        const ty = my * p.depth * MOUSE_RANGE + scrollY * p.scroll + drift;
        let t = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
        if (p.rotate) t += ` rotateY(${(descent * p.rotate).toFixed(2)}deg)`;
        p.el.style.transform = t;
      }

      // el indicador de scroll se desvanece apenas se avanza
      if (scrollHint) {
        scrollHint.style.opacity = clamp(1 - introProgress * 6, 0, 1).toFixed(3);
      }

      // rail de progreso de toda la página
      if (railFill) {
        const max = root.scrollHeight - window.innerHeight;
        railFill.style.transform = `scaleY(${(max > 0 ? clamp(scrollY / max, 0, 1) : 0).toFixed(4)})`;
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function enable(): void {
    if (enabled) return;
    enabled = true;
    root.classList.add('is-immersive');
    collect();
    // reloj/rampa de arranque: se re-arma en cada enable (ver frame())
    t0 = -1;
    // el wireframe arranca oculto y lo revela el reloj (heroReadyAt). Sólo se
    // fuerza a 0 si el hero todavía no está a la vista: en un re-enable posterior
    // (resize) heroReadyAt ya pasó → el próximo frame calcula el valor sin flash.
    wfApplied = -1;
    if (heroReadyAt < 0) wireframe?.style.setProperty('--wf-reveal', '0');
    window.addEventListener('mousemove', onMouse, { passive: true });
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function disable(): void {
    if (!enabled) return;
    enabled = false;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMouse);
    root.classList.remove('is-immersive');
    // limpiar todos los transforms/opacidades inline → fallback estático
    if (title) {
      title.style.transform = '';
      title.style.removeProperty('--shadow-pulse');
    }
    if (titleFade) titleFade.style.opacity = '';
    // no se limpia --wf-reveal: si el motor se re-habilita (resize) el wireframe
    // debe seguir revelado, no volver a 0.
    if (corridor) {
      corridor.style.transform = '';
      corridor.style.opacity = '';
    }
    for (const p of parallax) p.el.style.transform = '';
    if (scrollHint) scrollHint.style.opacity = '';
    if (railFill) railFill.style.transform = '';
    root.style.removeProperty('--hero-fade');
    mx = my = tmx = tmy = angle = 0;
  }

  function evaluate(): void {
    if (capable()) enable();
    else disable();
  }

  evaluate();

  // reaccionar a cambios de preferencia / tamaño / tipo de puntero
  [reduceMq, fineMq, wideMq].forEach((mq) => mq.addEventListener?.('change', evaluate));
  window.addEventListener(
    'resize',
    () => {
      // `evaluate()` también acá y no sólo en el listener de las media queries:
      // enable/disable cortan solos si ya están en el estado que corresponde, así
      // que repetirlo no cuesta nada, y cubre los navegadores/entornos donde el
      // evento `change` de matchMedia no llega al redimensionar. Sin esto, achicar
      // la ventana por debajo de los 900px podía dejar `is-immersive` puesto con
      // el motor apagado: hero sticky de 240vh, quieto, sin nada que lo mueva.
      evaluate();
      if (enabled) collect();
    },
    { passive: true },
  );
}
