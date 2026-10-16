/* La obra se construye según la etapa S (0 a 7), que sale de en qué sección del contenido estás. */
(() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t * t * (3 - 2 * t);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document.documentElement;
  const ETAPAS = [
    [0, 'Idea y boceto'], [1.0, 'Planta y alzado'], [1.8, 'Maqueta'], [2.6, 'Estructura y obra gris'],
    [3.8, 'Acabados y paisaje'], [5.0, 'Interiorismo'], [6.2, 'Render final']
  ];
  const stage = document.querySelector('.stage');
  const nombre = document.getElementById('etapa');
  const barras = [...document.querySelectorAll('.stagebar li i')];
  const cinta = document.querySelector('.cinta i');
  const sol = document.getElementById('sol');
  const gancho = document.getElementById('gancho');
  const grua = document.getElementById('grua');
  const obraSvg = document.getElementById('obra');
  const capas = [...document.querySelectorAll('.stage .foto')].map(el => ({ el, a: +el.dataset.a, b: +el.dataset.b, z: +el.dataset.z }));

  /* elementos animados y su longitud de trazo */
  const els = [...document.querySelectorAll('#obra [data-k]')].map(el => ({
    el, k: el.dataset.k, a: +el.dataset.a, b: +el.dataset.b,
    len: el.dataset.k === 'draw' && el.getTotalLength ? el.getTotalLength() : 0
  }));

  /* puntos (posición en la página -> etapa) a partir de las secciones */
  const secs = [...document.querySelectorAll('[data-s0]')];
  let claves = [];
  function medir() {
    claves = [];
    secs.forEach(s => {
      const r = s.getBoundingClientRect();
      const top = r.top + scrollY;
      claves.push([top, +s.dataset.s0], [top + r.height, +s.dataset.s1]);
    });
  }
  function etapaObjetivo() {
    if (quieto || !claves.length) return 7;
    const y = scrollY + innerHeight * 0.55;
    if (y <= claves[0][0]) return claves[0][1];
    for (let i = 1; i < claves.length; i++) {
      if (y <= claves[i][0]) {
        const [y0, s0] = claves[i - 1], [y1, s1] = claves[i];
        return y1 === y0 ? s1 : s0 + (s1 - s0) * (y - y0) / (y1 - y0);
      }
    }
    return claves[claves.length - 1][1];
  }

  function pintar(S) {
    for (const o of els) {
      const t = ease(clamp((S - o.a) / (o.b - o.a)));
      const s = o.el.style;
      switch (o.k) {
        case 'draw': s.strokeDasharray = o.len; s.strokeDashoffset = o.len * (1 - t); break;
        case 'up': case 'water': s.transform = `scaleY(${t})`; break;
        case 'down': s.transform = `scaleY(${t})`; s.opacity = t ? 1 : 0; break;
        case 'right': s.transform = `scaleX(${t})`; break;
        case 'pop': s.transform = `scale(${t})`; break;
        case 'fade': s.opacity = o.el.classList.contains('luz') ? t * 0.8 : t; break;
        case 'out': s.opacity = 1 - t; break;
      }
    }
    /* fotos: cada una se funde sobre la anterior con un acercamiento leve */
    for (const f of capas) {
      const u = ease(clamp((S - f.a) / (f.b - f.a)));
      f.el.style.opacity = u;
      f.el.style.transform = `scale(${1 + f.z * (1 - u)})`;
    }
    /* el dibujo se apaga entero (rejilla, planta, arboles) cuando la maqueta ya tapa el panel */
    obraSvg.style.opacity = 1 - ease(clamp((S - 1.7) / 0.5));
    /* sol: cruza de izquierda a derecha y se apaga al caer la noche */
    const f = clamp(S / 7);
    sol.setAttribute('cx', 90 + 560 * f);
    sol.setAttribute('cy', 190 - 110 * Math.sin(Math.PI * f));
    sol.style.opacity = 1 - clamp((S - 6.2) / 0.6);
    /* la grúa se retira al final y el gancho se balancea con la etapa */
    grua.style.opacity = 1 - clamp((S - 6.2) / 0.6);
    if (gancho) gancho.style.transform = `translate(${Math.sin(S * 2.4) * 10}px, ${(Math.sin(S * 1.7) + 1) * 22}px)`;
    /* noche */
    stage.style.setProperty('--night', clamp((S - 6.2) / 0.8).toFixed(3));
    /* nombre de la etapa y barras */
    let idx = 0;
    ETAPAS.forEach((e, i) => { if (S >= e[0]) idx = i; });
    if (nombre.textContent !== ETAPAS[idx][1]) nombre.textContent = ETAPAS[idx][1];
    barras.forEach((b, i) => {
      const fin = i + 1 < ETAPAS.length ? ETAPAS[i + 1][0] : 7;
      b.style.transform = `scaleX(${clamp((S - ETAPAS[i][0]) / (fin - ETAPAS[i][0]))})`;
    });
  }

  let actual = 0, intro = 0, t0 = performance.now(), primera = true;
  function bucle(ahora) {
    /* al cargar, la obra arranca sola unos segundos para que se vea movimiento */
    intro = quieto ? 7 : clamp((ahora - t0) / 3200) * 0.55;
    const meta = Math.max(etapaObjetivo(), intro);
    actual += (meta - actual) * (quieto ? 1 : 0.09);
    if (primera || Math.abs(meta - actual) > 0.0004) { pintar(actual); primera = false; }
    /* cinta métrica */
    const h = doc.scrollHeight - innerHeight;
    if (cinta) cinta.style.transform = `scaleY(${h > 0 ? clamp(scrollY / h) : 0})`;
    requestAnimationFrame(bucle);
  }

  /* revelados al entrar en pantalla */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv, .fade, .paso, .rev, .hl').forEach(n => io.observe(n));

  /* enlace activo en el menú y cabecera */
  const top = document.querySelector('.top');
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const nav = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) nav.observe(s); });
  addEventListener('scroll', () => top.classList.toggle('is-scrolled', scrollY > 24), { passive: true });

  /* menú móvil */
  const burger = document.querySelector('.burger');
  burger.addEventListener('click', () => {
    const abierto = document.body.classList.toggle('abierto');
    burger.setAttribute('aria-expanded', abierto);
  });
  links.forEach(a => a.addEventListener('click', () => { document.body.classList.remove('abierto'); burger.setAttribute('aria-expanded', 'false'); }));

  /* parallax suave de las fotos */
  const fotos = [...document.querySelectorAll('.galeria figure')];
  if (!quieto) addEventListener('scroll', () => {
    for (const f of fotos) {
      const r = f.getBoundingClientRect();
      const d = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      f.firstElementChild.style.objectPosition = `50% ${50 + clamp(d, -1, 1) * 12}%`;
    }
  }, { passive: true });

  /* formulario de demostración: valida y simula el envío */
  const f = document.getElementById('form');
  const enviar = document.getElementById('enviar');
  const estado = document.querySelector('.estado');
  const validar = () => { const ok = f.checkValidity(); enviar.hidden = !ok; };
  f.addEventListener('input', validar);
  validar();
  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!f.reportValidity()) return;
    enviar.disabled = true; estado.textContent = 'Enviando tu consulta…';
    await new Promise(r => setTimeout(r, 700));
    f.reset(); validar(); enviar.disabled = false;
    estado.textContent = 'Tu consulta ha sido enviada. Gracias por escribirnos. (Demostración: no se envió nada.)';
  });
  document.getElementById('anio').textContent = new Date().getFullYear();

  addEventListener('resize', medir);
  addEventListener('load', medir);
  medir();
  requestAnimationFrame(bucle);
})();
