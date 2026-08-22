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
 *   · el rail de progreso (éste va por scroll, no por frame — ver `paintRail`).
 *
 * Sólo se tocan `transform`/`opacity`. Al desactivar (resize a mobile, etc.) se
 * limpian todos los estilos inline — mismo patrón que `disable3D` del helicoidal.
 *
 * ---- Presupuesto de trabajo por frame (lo que mantiene esto barato) ----
 * El efecto se ve igual que siempre; lo que cambia es CUÁNTO se trabaja para
 * pintarlo. Tres reglas, todas medidas:
 *   1. ZONAS: cada bloque corre sólo si lo que anima está a la vista. El "21"
 *      (25 capas 3D + sombra) es lo más caro del motor y se saltea entero fuera
 *      del hero; el fondo vivo, cuando lo tapan las secciones opacas.
 *   2. ESCRITURAS SÓLO SI CAMBIAN (`put`): tocar el DOM dispara recálculo de
 *      estilo aunque se escriba el mismo valor. Quieto (sin scroll ni mouse) el
 *      motor no escribe nada.
 *   3. GEOMETRÍA CACHEADA (`measure`): las posiciones no cambian con el scroll,
 *      así que se miden al cargar / al cambiar el tamaño, no 60 veces por
 *      segundo (medir en el frame además fuerza layout sincrónico).
 * Con eso, pasadas las secciones opacas no queda nada continuo que animar y el
 * loop SE APAGA SOLO (`idle`); cualquier scroll o movimiento de mouse lo
 * reactiva (`kick`).
 */

type Parallax = {
  el: HTMLElement;
  depth: number; // desplazamiento por mouse (proporción de MOUSE_RANGE)
  scroll: number; // paralaje de scroll (px por px scrolleado)
  drift: number; // amplitud de la deriva autónoma (px)
  rotate: number; // ° de rotateY a lo largo del descenso (0 = no rota)
  phase: number; // desfase de la deriva, para que no vayan todas iguales
  fixed: boolean; // vive dentro del fondo vivo (position:fixed) → siempre en cuadro
  top: number; // posición absoluta en el documento (sólo las NO fijas)
  bottom: number;
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
  // La sombra proyectada es la ÚNICA que lee --shadow-pulse. Se escribe sobre
  // ella y no sobre .hero-title (como se hacía antes): un custom property se
  // hereda, así que escribirlo en el título invalidaba el estilo de sus 26
  // descendientes (las 25 capas del extruido + la sombra) en cada frame.
  const shadow = document.querySelector<HTMLElement>('.ht-shadow');
  const corridor = document.querySelector<HTMLElement>('[data-corridor]');
  // fin del "descenso": el arranque del helicoidal de proyectos (las cards).
  const descentEnd = document.getElementById('proyectos');
  // Primera sección OPACA de la página (#estudio, `section.alt`): de ahí para
  // abajo el fondo vivo —que es position:fixed— queda tapado y no hay nada suyo
  // que animar. (Contacto, más abajo, también es opaca.)
  const opaque = document.getElementById('estudio');
  // Contenedores que reciben --hero-fade. Antes iba en :root, pero un custom
  // property se hereda: escribirlo en el <html> invalidaba el estilo del
  // documento ENTERO (~840 nodos) en cada frame del scroll. Sus consumidores
  // reales viven todos dentro de estos dos (.hero-stage::before, .hero-eyebrow,
  // .hero-dim, .hero-wireframe y .lbg-note).
  const heroEl = document.querySelector<HTMLElement>('.hero');
  const bgEl = document.querySelector<HTMLElement>('.living-bg');
  // La aparición del header la resuelve el scroll siempre-activo de BaseLayout
  // (clase `past-hero`), no este motor → aparece aunque esta capa no arrancara.
  const railFill = document.querySelector<HTMLElement>('[data-rail-fill]');
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
  const MARGIN = 220; // px de colchón para dar por "a la vista" una capa de paralaje
  const IDLE_FRAMES = 8; // frames sin nada que animar antes de apagar el loop

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

  // ---- escrituras memorizadas ------------------------------------------------
  // Tocar el DOM dispara recálculo de estilo AUNQUE se escriba el mismo valor,
  // así que se guarda lo último puesto en cada elemento y se saltea si no
  // cambió. Sin esto, quieto en el hero el motor escribía ~120 veces por segundo
  // para dejar todo igual. Devuelve si efectivamente escribió (alimenta `idle`).
  const memo = new WeakMap<Element, Record<string, string>>();
  function put(el: HTMLElement | null, prop: string, val: string): boolean {
    if (!el) return false;
    let m = memo.get(el);
    if (!m) {
      m = {};
      memo.set(el, m);
    }
    if (m[prop] === val) return false;
    m[prop] = val;
    if (prop === 'transform') el.style.transform = val;
    else if (prop === 'opacity') el.style.opacity = val;
    else el.style.setProperty(prop, val);
    return true;
  }
  const forget = (el: HTMLElement | null) => {
    if (el) memo.delete(el);
  };

  // ---- geometría cacheada ----------------------------------------------------
  // Todo esto es INVARIANTE al scroll (posiciones absolutas en el documento):
  // sólo cambia si cambia el tamaño de la ventana o el alto del documento. Se
  // recalcula ahí y no en cada frame — medir dentro del frame, además de costar,
  // fuerza layout sincrónico justo después de haber escrito transforms.
  let introTop = 0;
  let introH = 0;
  let descentTop = 1;
  let opaqueTop = Number.POSITIVE_INFINITY;
  let maxScroll = 1;
  let geomDirty = true;

  function measure(): void {
    const y = window.scrollY;
    if (intro) {
      introTop = intro.getBoundingClientRect().top + y;
      introH = intro.offsetHeight;
    }
    if (descentEnd) descentTop = Math.max(1, descentEnd.getBoundingClientRect().top + y);
    opaqueTop = opaque ? opaque.getBoundingClientRect().top + y : Number.POSITIVE_INFINITY;
    maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
    for (const p of parallax) {
      if (p.fixed) continue;
      const r = p.el.getBoundingClientRect();
      p.top = r.top + y;
      p.bottom = p.top + r.height;
    }
    geomDirty = false;
  }

  // ---- rail de progreso: por scroll, no por frame ----------------------------
  // Sólo depende de la posición de scroll (no del tiempo), así que no tiene por
  // qué vivir dentro del rAF: actualizarlo en el listener lo mantiene exacto
  // aunque el motor esté apagado allá abajo, y ahorra una lectura de
  // `scrollHeight` (que fuerza layout) por frame.
  function paintRail(): void {
    if (!railFill) return;
    if (geomDirty) measure();
    put(railFill, 'transform', `scaleY(${clamp(window.scrollY / maxScroll, 0, 1).toFixed(4)})`);
  }

  function collect(): void {
    parallax = Array.from(document.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
      el,
      depth: parseFloat(el.dataset.depth || '0'),
      scroll: parseFloat(el.dataset.scroll || '0'),
      drift: parseFloat(el.dataset.drift || '0'),
      rotate: parseFloat(el.dataset.rotate || '0'),
      phase: Math.random() * Math.PI * 2,
      fixed: !!bgEl?.contains(el),
      top: 0,
      bottom: 0,
    }));
    geomDirty = true;
  }

  function onMouse(e: MouseEvent): void {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = (e.clientY / window.innerHeight) * 2 - 1;
    kick();
  }

  // el loop se apaga solo cuando no queda nada que animar; esto lo despierta
  function kick(): void {
    if (!enabled || running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  let idle = 0;
  let heroWas = false;
  let bgWas = false;

  function frame(now: number): void {
    if (!running) return;
    if (!document.hidden) {
      if (geomDirty) measure();
      // reloj relativo + rampa de arranque (smoothstep 0→1 en RAMP_MS): la
      // deriva del fondo y el cabeceo parten de 0 (= estado pintado por CSS)
      // y toman su amplitud de a poco — sin "pantallazo" en el primer frame.
      if (t0 < 0) t0 = now;
      const t = now - t0;
      const r = clamp(t / RAMP_MS, 0, 1);
      const ramp = r * r * (3 - 2 * r);
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // el paralaje de mouse persigue al cursor; cuando alcanza el objetivo se
      // fija (si no, nunca converge del todo y el loop no se podría apagar)
      const chasing = Math.abs(mx - tmx) > 0.0005 || Math.abs(my - tmy) > 0.0005;
      if (chasing) {
        mx = lerp(mx, tmx, 0.06);
        my = lerp(my, tmy, 0.06);
      } else {
        mx = tmx;
        my = tmy;
      }

      // ---- zonas: qué hay que animar en esta posición ----
      // El hero (el "21", su sombra y el wireframe) sólo mientras su tramo está
      // en cuadro; el fondo vivo —position:fixed— hasta que la primera sección
      // opaca lo tapa. `*Was` deja pasar un frame más al salir de cada zona para
      // escribir el estado final (y no dejarlo a mitad de camino).
      const heroLive = scrollY < introTop + introH;
      const bgLive = scrollY < opaqueTop;
      let wrote = false;

      // progreso del tramo del hero (0 al empezar → 1 al terminar el giro)
      const range = introH - vh;
      const introProgress = range > 0 ? clamp((scrollY - introTop) / range, 0, 1) : 0;
      // mismo desvanecido que el título (0.65→1 del tramo del hero): el corredor
      // de marcos lo comparte para no quedar creciendo de fondo, molestando la
      // lectura, una vez que "Estudio 21" ya se integró al espacio.
      const heroFadeOut = clamp(1 - (introProgress - 0.65) / 0.35, 0, 1);
      // progreso del "descenso" completo hero → cards (helicoidal)
      const descent = clamp(scrollY / descentTop, 0, 1);

      // "Estudio 21": gira horizontalmente de forma constante e infinita
      // (giro continuo por tiempo, desde 0° — reloj relativo a t0) + un giro
      // extra atado al scroll del hero; además retrocede en Z y se desvanece
      // integrándose al fondo. Es el bloque MÁS CARO del motor (transform sobre
      // un contexto preserve-3d de 25 capas), así que fuera del hero no se toca.
      const spin = (t / SPIN_PERIOD) * 360;
      angle = spin + introProgress * TOTAL_ROTATION;
      if (title && (heroLive || heroWas)) {
        const recede = introProgress * TITLE_RECEDE;
        // vaivén leve autónomo + inclinación sutil hacia el mouse, para que en
        // reposo el "21" no quede estático y se perciba su profundidad. Se apaga
        // a medida que arranca el giro del scroll (idle → 0) para no competir.
        const rest = clamp(1 - introProgress * 2.5, 0, 1);
        // el giro horizontal ya es continuo (angle); acá sólo un cabeceo vertical
        // leve + la inclinación hacia el mouse para reforzar la profundidad.
        const swayX = Math.sin(now * 0.0008 + 1.3) * 2.4 * rest * ramp;
        const tiltY = mx * 5 * rest;
        const tiltX = -my * 4 * rest;
        wrote =
          put(
            title,
            'transform',
            `translateZ(${(-recede).toFixed(1)}px) ` +
              `rotateX(${(swayX + tiltX).toFixed(2)}deg) ` +
              `rotateY(${(angle + tiltY).toFixed(2)}deg)`,
          ) || wrote;
        // sombra: respira con el ángulo — de frente el bloque proyecta su
        // huella completa, de canto (90°/270°) proyecta menos → más tenue.
        const rad = (angle * Math.PI) / 180;
        wrote =
          put(shadow, '--shadow-pulse', (0.72 + 0.28 * Math.abs(Math.cos(rad))).toFixed(3)) ||
          wrote;
        // el fade va en el padre (no en el nodo preserve-3d) — ver `titleFade`.
        // se mantiene bien visible girando y recién se desvanece al final del
        // tramo (introProgress 0.65 → 1), cuando se integra al fondo/espacio.
        wrote = put(titleFade, 'opacity', heroFadeOut.toFixed(3)) || wrote;
      }
      heroWas = heroLive;

      // corredor de marcos: avanza hacia la cámara (crece por perspectiva)
      // durante todo el descenso, pero se desvanece junto con el título — sin
      // esto seguía viéndose (y agrandándose) sobre "Quiénes somos" y el resto,
      // compitiendo con la lectura. ×0.6: conserva la opacidad base tenue del
      // corredor (definida en immersive.css) en vez de pisarla a 1 mientras
      // heroFadeOut vale 1 al principio del hero.
      if (corridor && (bgLive || bgWas)) {
        const op = 0.6 * heroFadeOut;
        wrote = put(corridor, 'opacity', op.toFixed(3)) || wrote;
        // ya invisible → mover sus 7 marcos en Z no se ve; se ahorra el transform
        if (op > 0.001) {
          wrote =
            put(corridor, 'transform', `translateZ(${(descent * CORRIDOR_DEPTH).toFixed(1)}px)`) ||
            wrote;
        }
      }

      // las anotaciones mono del fondo se desvanecen al dejar el hero (para no
      // entorpecer la lectura) y reaparecen al volver — se multiplica su opacidad
      // por --hero-fade desde CSS (ver .lbg-note en immersive.css). Va en .hero y
      // .living-bg (no en :root): ver el comentario de `heroEl`.
      const heroFade = clamp(1 - scrollY / (vh * 0.7), 0, 1).toFixed(3);
      wrote = put(heroEl, '--hero-fade', heroFade) || wrote;
      wrote = put(bgEl, '--hero-fade', heroFade) || wrote;

      // wireframe del hero: aparece SOLO (sin el mouse). Arranca a revelarse
      // WF_DELAY después de que el hero queda a la vista (fin del preloader, o
      // load directo en reload) y sube de a poco (smoothstep) en WF_REVEAL_MS.
      // Una vez revelado, queda. El anclaje es max(heroReadyAt, t0): si la
      // pestaña cargó en background, t0 (primer frame VISIBLE) manda → el
      // revelado gradual empieza recién al hacerse visible, no ya consumido.
      if (wireframe && heroReadyAt >= 0 && wfApplied < 1 && (heroLive || heroWas)) {
        const wfAnchor = Math.max(heroReadyAt, t0);
        const wp = clamp((now - wfAnchor - WF_DELAY) / WF_REVEAL_MS, 0, 1);
        const target = wp * wp * (3 - 2 * wp);
        const v = +target.toFixed(3);
        if (v !== wfApplied) {
          wfApplied = v;
          wireframe.style.setProperty('--wf-reveal', String(v));
          wrote = true;
        }
      }

      // capas del fondo: mouse (todas) + scroll + deriva + rotateY (data-rotate)
      // (la deriva entra con la rampa: en el primer frame es 0 = posición CSS).
      // Las 12 capas están repartidas por TODA la página (del hero a Contacto):
      // se mueve sólo la que está en cuadro, no las diez que no se ven.
      for (const p of parallax) {
        const live = p.fixed
          ? bgLive
          : p.bottom > scrollY - MARGIN && p.top < scrollY + vh + MARGIN;
        if (!live) continue;
        const drift = p.drift ? Math.sin(now * DRIFT_SPEED + p.phase) * p.drift * ramp : 0;
        const tx = mx * p.depth * MOUSE_RANGE + drift * 0.6;
        const ty = my * p.depth * MOUSE_RANGE + scrollY * p.scroll + drift;
        let tr = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
        if (p.rotate) tr += ` rotateY(${(descent * p.rotate).toFixed(2)}deg)`;
        wrote = put(p.el, 'transform', tr) || wrote;
      }
      bgWas = bgLive;

      // ---- ¿queda algo que animar? ----
      // El giro del "21" y la deriva del fondo vivo son continuos POR TIEMPO:
      // mientras se vean hay que seguir pidiendo frames. Pasadas las secciones
      // opacas sólo queda el paralaje de mouse, así que en cuanto se asienta el
      // loop se apaga solo y deja la CPU/GPU libres para el resto del sitio.
      if (bgLive || heroLive || chasing || wrote) idle = 0;
      else if (++idle > IDLE_FRAMES) {
        running = false;
        return;
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
    idle = 0;
    heroWas = bgWas = false;
    // el wireframe arranca oculto y lo revela el reloj (heroReadyAt). Sólo se
    // fuerza a 0 si el hero todavía no está a la vista: en un re-enable posterior
    // (resize) heroReadyAt ya pasó → el próximo frame calcula el valor sin flash.
    wfApplied = -1;
    if (heroReadyAt < 0) wireframe?.style.setProperty('--wf-reveal', '0');
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    running = true;
    raf = requestAnimationFrame(frame);
    paintRail();
  }

  function disable(): void {
    if (!enabled) return;
    enabled = false;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMouse);
    window.removeEventListener('scroll', onScroll);
    root.classList.remove('is-immersive');
    // limpiar todos los transforms/opacidades inline → fallback estático
    if (title) {
      title.style.transform = '';
      forget(title);
    }
    if (shadow) {
      shadow.style.removeProperty('--shadow-pulse');
      forget(shadow);
    }
    if (titleFade) {
      titleFade.style.opacity = '';
      forget(titleFade);
    }
    // no se limpia --wf-reveal: si el motor se re-habilita (resize) el wireframe
    // debe seguir revelado, no volver a 0.
    if (corridor) {
      corridor.style.transform = '';
      corridor.style.opacity = '';
      forget(corridor);
    }
    for (const p of parallax) {
      p.el.style.transform = '';
      forget(p.el);
    }
    if (railFill) {
      railFill.style.transform = '';
      forget(railFill);
    }
    for (const el of [heroEl, bgEl]) {
      el?.style.removeProperty('--hero-fade');
      forget(el);
    }
    mx = my = tmx = tmy = angle = 0;
  }

  function onScroll(): void {
    paintRail();
    kick();
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
      if (enabled) {
        collect();
        kick();
      }
    },
    { passive: true },
  );

  // El alto del documento cambia sin que haya resize: fuentes que terminan de
  // cargar, imágenes, o el helicoidal al filtrar (la sección se acorta). Ahí hay
  // que volver a medir, o el rail y las zonas quedarían calculados con la
  // geometría vieja.
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      geomDirty = true;
      kick();
    });
    ro.observe(document.body);
  }

  // al volver a la pestaña, retomar (el rAF estuvo pausado por el navegador)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) kick();
  });
}
