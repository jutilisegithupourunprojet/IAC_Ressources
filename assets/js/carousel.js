/*
 * Diaporama simple : fondu enchaîné entre slides, avance automatique,
 * pause au survol/focus, navigation par puces, respecte prefers-reduced-motion.
 */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    if (slides.length < 2) return;

    const dotsWrap = carousel.querySelector('[data-carousel-dots]');
    const dots = [];
    let index = slides.findIndex((s) => s.classList.contains('opacity-100'));
    if (index < 0) index = 0;
    let timer = null;

    function setActive(i) {
      slides[index].classList.remove('opacity-100');
      slides[index].classList.add('opacity-0');
      dots[index]?.setAttribute('aria-current', 'false');
      dots[index]?.classList.remove('bg-creme');
      dots[index]?.classList.add('bg-creme/50');

      index = i;

      slides[index].classList.add('opacity-100');
      slides[index].classList.remove('opacity-0');
      dots[index]?.setAttribute('aria-current', 'true');
      dots[index]?.classList.add('bg-creme');
      dots[index]?.classList.remove('bg-creme/50');
    }

    function next() {
      setActive((index + 1) % slides.length);
    }

    function start() {
      if (reduceMotion) return;
      stop();
      timer = setInterval(next, 5000);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Image ${i + 1} sur ${slides.length}`);
        dot.setAttribute('aria-current', i === index ? 'true' : 'false');
        dot.className = `w-2.5 h-2.5 rounded-full transition-colors ${i === index ? 'bg-creme' : 'bg-creme/50'} hover:bg-creme`;
        dot.addEventListener('click', () => {
          setActive(i);
          start();
        });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);

    start();
  });
})();
