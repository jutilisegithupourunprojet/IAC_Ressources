document.addEventListener('DOMContentLoaded', () => {
  /* Année courante dans le footer */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* Menu mobile */
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  if (toggle && menu) {
    const iconOpen = toggle.querySelector('[data-icon-open]');
    const iconClose = toggle.querySelector('[data-icon-close]');
    toggle.addEventListener('click', () => {
      const willOpen = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !willOpen);
      menu.classList.toggle('flex', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
      iconOpen?.classList.toggle('hidden', willOpen);
      iconClose?.classList.toggle('hidden', !willOpen);
    });
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        toggle.setAttribute('aria-expanded', 'false');
        iconOpen?.classList.remove('hidden');
        iconClose?.classList.add('hidden');
      });
    });
  }

  /* Mise en avant du lien de navigation actif */
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    if (link.getAttribute('href') === current) {
      link.classList.add('text-terracotta-dark');
      link.setAttribute('aria-current', 'page');
    }
  });

  /* Apparition au scroll */
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* Écran d'intro (page d'accueil uniquement) : se fond au premier scroll */
  const intro = document.querySelector('[data-intro-overlay]');
  if (intro) {
    const fadeDistance = Math.max(140, window.innerHeight * 0.2);
    let dismissed = false;
    const update = () => {
      if (dismissed) return;
      const y = window.scrollY;
      const opacity = Math.max(0, 1 - y / fadeDistance);
      intro.style.opacity = String(opacity);
      intro.style.transform = `translateY(${-30 * (1 - opacity)}px)`;
      if (y > fadeDistance) {
        dismissed = true;
        intro.style.display = 'none';
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }
});
