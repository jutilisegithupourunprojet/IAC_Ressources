/*
 * Consentement cookies : bannière accepter/refuser + activation différée des
 * contenus tiers qui déposent des cookies (YouTube, Google Agenda). Ces
 * contenus restent bloqués (placeholder) tant que le choix n'est pas
 * "accepted", conformément au principe de consentement préalable.
 */
(() => {
  const STORAGE_KEY = 'iac_cookie_consent';
  const CONSENT_EVENT = 'iac-consent-change';

  function getConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* stockage indisponible (navigation privée...) : le choix ne sera pas mémorisé */
    }
    document.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  }

  function buildBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Gestion des cookies');
    banner.className = 'fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6';
    banner.innerHTML = `
      <div class="max-w-3xl mx-auto clay-soft bg-creme border-2 border-sable shadow-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <p class="text-sm text-olive-dark/85 leading-relaxed flex-1">
          Ce site utilise des cookies tiers (vidéos YouTube, agenda Google) uniquement pour afficher
          certains contenus intégrés. Vous pouvez les accepter ou les refuser — ce choix reste
          modifiable à tout moment depuis le pied de page.
        </p>
        <div class="flex gap-3 shrink-0">
          <button type="button" data-cookie-reject class="clay-btn border-2 border-olive text-olive-dark px-5 py-2.5 text-sm font-medium hover:bg-olive hover:text-creme transition-all duration-300">Refuser</button>
          <button type="button" data-cookie-accept class="clay-btn bg-terracotta text-creme px-5 py-2.5 text-sm font-medium hover:bg-terracotta-dark transition-all duration-300 shadow-md shadow-terracotta/20">Accepter</button>
        </div>
      </div>
    `;
    banner.querySelector('[data-cookie-accept]').addEventListener('click', () => {
      setConsent('accepted');
      banner.remove();
    });
    banner.querySelector('[data-cookie-reject]').addEventListener('click', () => {
      setConsent('rejected');
      banner.remove();
    });
    return banner;
  }

  function showBanner() {
    if (document.getElementById('cookie-banner')) return;
    document.body.appendChild(buildBanner());
  }

  function activateEmbed(container) {
    const src = container.dataset.embedSrc;
    if (!src || container.querySelector('iframe')) return;
    const iframe = document.createElement('iframe');
    iframe.className = 'w-full h-full border-0';
    iframe.src = src;
    iframe.title = container.dataset.embedTitle || '';
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    if (container.dataset.embedAllow) iframe.setAttribute('allow', container.dataset.embedAllow);
    container.innerHTML = '';
    container.appendChild(iframe);
  }

  function bindPlaceholder(container) {
    const btn = container.querySelector('[data-consent-embed-allow]');
    if (btn) btn.addEventListener('click', () => setConsent('accepted'));
  }

  function restorePlaceholder(container) {
    if (container.dataset.placeholderHtml) {
      container.innerHTML = container.dataset.placeholderHtml;
    }
    bindPlaceholder(container);
  }

  function refreshEmbeds() {
    const consent = getConsent();
    document.querySelectorAll('[data-consent-embed]').forEach((container) => {
      if (consent === 'accepted') {
        activateEmbed(container);
      } else {
        bindPlaceholder(container);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-consent-embed]').forEach((container) => {
      container.dataset.placeholderHtml = container.innerHTML;
    });

    refreshEmbeds();
    if (!getConsent()) showBanner();

    document.addEventListener(CONSENT_EVENT, (e) => {
      document.getElementById('cookie-banner')?.remove();
      document.querySelectorAll('[data-consent-embed]').forEach((container) => {
        if (e.detail === 'accepted') {
          activateEmbed(container);
        } else {
          restorePlaceholder(container);
        }
      });
    });

    document.querySelectorAll('[data-cookie-settings]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showBanner();
      });
    });
  });
})();
