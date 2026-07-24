/*
 * Le Fil Rouge — ruban ondulé qui se déroule avec le scroll.
 * Portage vanilla JS de l'animation Framer Motion d'origine : même génération
 * de tracé (courbe Catmull-Rom + boucles), mais lissage par interpolation
 * simple (lerp) au lieu d'un spring, et reconstruction sur resize via
 * ResizeObserver au lieu d'un state React.
 */
(() => {
  const mount = document.querySelector('[data-ribbon]');
  const content = document.querySelector('[data-ribbon-content]');
  if (!mount || !content) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mount.remove();
    return;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'absolute top-0 left-0');

  const pathBack = document.createElementNS(svgNS, 'path');
  pathBack.setAttribute('fill', 'none');
  pathBack.setAttribute('stroke', '#216777');
  pathBack.setAttribute('stroke-width', '9');
  pathBack.setAttribute('stroke-linecap', 'round');
  pathBack.setAttribute('stroke-linejoin', 'round');

  const pathCore = document.createElementNS(svgNS, 'path');
  pathCore.setAttribute('fill', 'none');
  pathCore.setAttribute('stroke', '#24A2BC');
  pathCore.setAttribute('stroke-width', '6');
  pathCore.setAttribute('stroke-linecap', 'round');
  pathCore.setAttribute('stroke-linejoin', 'round');

  /*
   * Masque de lisibilité : le ruban s'estompe (au lieu de passer devant)
   * derrière les titres et paragraphes. Un rectangle flouté par bloc de
   * texte réduit localement l'opacité du tracé via un masque SVG.
   */
  const defs = document.createElementNS(svgNS, 'defs');

  const blurFilter = document.createElementNS(svgNS, 'filter');
  blurFilter.setAttribute('id', 'ribbon-text-fade-blur');
  blurFilter.setAttribute('x', '-20%');
  blurFilter.setAttribute('y', '-50%');
  blurFilter.setAttribute('width', '140%');
  blurFilter.setAttribute('height', '200%');
  const feBlur = document.createElementNS(svgNS, 'feGaussianBlur');
  feBlur.setAttribute('stdDeviation', '14');
  blurFilter.appendChild(feBlur);

  const mask = document.createElementNS(svgNS, 'mask');
  mask.setAttribute('id', 'ribbon-text-fade-mask');
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  const maskBase = document.createElementNS(svgNS, 'rect');
  maskBase.setAttribute('x', '0');
  maskBase.setAttribute('y', '0');
  maskBase.setAttribute('fill', 'white');
  const maskCutouts = document.createElementNS(svgNS, 'g');
  maskCutouts.setAttribute('filter', 'url(#ribbon-text-fade-blur)');
  mask.append(maskBase, maskCutouts);
  defs.append(blurFilter, mask);

  const strokes = document.createElementNS(svgNS, 'g');
  strokes.setAttribute('mask', 'url(#ribbon-text-fade-mask)');
  strokes.append(pathBack, pathCore);

  svg.append(defs, strokes);
  mount.appendChild(svg);

  function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  function loopAt(rx, ry, sweep) {
    return ` a ${rx} ${ry} 0 1 ${sweep} ${2 * rx} 0 a ${rx} ${ry} 0 1 ${sweep} ${-2 * rx} 0.001`;
  }

  let totalLength = 1;
  let targetOffset = 0;
  let currentOffset = 0;
  let initialized = false;
  let ticking = false;
  let resizeTimer;

  function build() {
    const rect = content.getBoundingClientRect();
    const height = Math.max(rect.height, 800);
    const width = Math.max(rect.width, 320);

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    mount.style.height = `${height}px`;

    maskBase.setAttribute('width', String(width));
    maskBase.setAttribute('height', String(height));
    updateTextMask(rect);

    const count = Math.max(16, Math.round(height / 140));
    const center = width * 0.66;
    const amp = Math.min(150, Math.max(50, width * 0.2));
    const anchors = [];
    for (let i = 0; i <= count; i++) {
      const y = (height / count) * i;
      const drift = Math.sin(i * 0.045 + 0.6) * amp * 0.7;
      const wave =
        Math.sin(i * 0.5) * amp +
        Math.sin(i * 0.21 + 1.7) * amp * 0.45 +
        Math.sin(i * 0.9 + 0.3) * amp * 0.18;
      const x = Math.min(width * 0.94, Math.max(width * 0.28, center + drift + wave));
      anchors.push({ x, y });
    }

    const loopFractions = [0.14, 0.34, 0.52, 0.7, 0.88];
    const loopRadii = [24, 17, 29, 20, 26];

    let path = '';
    let cursor = 0;
    loopFractions.forEach((frac, idx) => {
      const targetY = height * frac;
      let closestIdx = 0;
      let closestDist = Infinity;
      anchors.forEach((a, ai) => {
        const dist = Math.abs(a.y - targetY);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = ai;
        }
      });
      const slice = anchors.slice(cursor, closestIdx + 1);
      if (slice.length >= 2) {
        const segment = smoothPath(slice);
        path += cursor === 0 ? segment : segment.replace(/^M[^C]*/, ' ');
        const r = loopRadii[idx % loopRadii.length];
        path += loopAt(r, r, idx % 2 === 0 ? 1 : 0);
      }
      cursor = closestIdx;
    });
    const finalSlice = anchors.slice(cursor);
    if (finalSlice.length >= 2) {
      const segment = smoothPath(finalSlice);
      path += cursor === 0 ? segment : segment.replace(/^M[^C]*/, ' ');
    }

    pathBack.setAttribute('d', path);
    pathCore.setAttribute('d', path);
    totalLength = pathCore.getTotalLength() || 1;
    pathBack.style.strokeDasharray = String(totalLength);
    pathCore.style.strokeDasharray = String(totalLength);

    if (!initialized) {
      currentOffset = totalLength;
      initialized = true;
    }
    updateTarget();
  }

  function updateTextMask(contentRect) {
    while (maskCutouts.firstChild) maskCutouts.removeChild(maskCutouts.firstChild);
    const pad = 10;
    content.querySelectorAll('h1:not(.sr-only), h2:not(.sr-only), h3:not(.sr-only), p:not(.sr-only), blockquote:not(.sr-only)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cutout = document.createElementNS(svgNS, 'rect');
      cutout.setAttribute('x', String(r.left - contentRect.left - pad));
      cutout.setAttribute('y', String(r.top - contentRect.top - pad));
      cutout.setAttribute('width', String(r.width + pad * 2));
      cutout.setAttribute('height', String(r.height + pad * 2));
      cutout.setAttribute('rx', '10');
      cutout.setAttribute('fill', 'black');
      cutout.setAttribute('fill-opacity', '0.82');
      maskCutouts.appendChild(cutout);
    });
  }

  function updateTarget() {
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    targetOffset = totalLength * (1 - progress);

    const fade = Math.min(progress / 0.5, 1);
    svg.style.opacity = String(0.08 + fade * 0.92);

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    currentOffset += (targetOffset - currentOffset) * 0.12;
    pathBack.style.strokeDashoffset = String(currentOffset);
    pathCore.style.strokeDashoffset = String(currentOffset);
    if (Math.abs(targetOffset - currentOffset) > 0.5) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
    }
  }

  build();
  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  // Les blocs `.reveal` se translatent en apparaissant : une fois l'animation
  // terminée, le texte n'est plus à la position mesurée par le dernier
  // build(). On recale alors le masque (pas tout le tracé) sur sa position finale.
  let maskRefreshTimer;
  document.addEventListener('transitionend', (e) => {
    if (e.target.closest && e.target.closest('.reveal, .reveal-stagger')) {
      clearTimeout(maskRefreshTimer);
      maskRefreshTimer = setTimeout(() => updateTextMask(content.getBoundingClientRect()), 80);
    }
  });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    }).observe(content);
  }
})();
