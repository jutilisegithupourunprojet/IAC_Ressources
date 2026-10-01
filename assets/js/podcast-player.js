/*
 * Liste et lit les épisodes audio (MP3) ajoutés depuis /admin (Sveltia
 * CMS), stockés en Markdown dans content/podcasts-audio/*.md. La liste
 * vient de content/podcasts-audio/index.json (régénéré à chaque
 * déploiement, voir scripts/build-content-index.js). Lecteur sur-mesure :
 * bouton lecture/pause, barre de progression cliquable, durée affichée —
 * un seul épisode joue à la fois.
 */
(() => {
  const grid = document.getElementById('podcast-audio-grid');
  const empty = document.getElementById('podcast-audio-empty');
  if (!grid) return;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  const playIcon = '<path d="M6 4.5v15l13-7.5-13-7.5Z" />';
  const pauseIcon = '<path d="M6 4.5h4v15H6v-15Zm8 0h4v15h-4v-15Z" />';

  fetch('content/podcasts-audio/index.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .then((episodes) => {
      if (!Array.isArray(episodes) || episodes.length === 0) return;

      if (empty) empty.hidden = true;
      grid.hidden = false;

      grid.innerHTML = episodes
        .map((ep, i) => {
          const cover = ep.image
            ? `<img src="${escapeHtml(ep.image)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0" loading="lazy" />`
            : `<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-terracotta/20 flex items-center justify-center shrink-0" aria-hidden="true">
                 <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4AA8B7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
               </div>`;

          return `
            <li class="clay-soft bg-white/80 border border-sable shadow-md p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-player="${i}">
              ${cover}
              <div class="flex-1 min-w-0 w-full">
                <p class="font-script text-xl text-olive-dark truncate">${escapeHtml(ep.title)}</p>
                ${ep.description ? `<p class="mt-0.5 text-sm text-black/70 line-clamp-2">${escapeHtml(ep.description)}</p>` : ''}
                <div class="mt-3 flex items-center gap-3">
                  <button type="button" data-action="toggle" aria-label="Lecture" class="shrink-0 w-10 h-10 rounded-full bg-terracotta text-creme flex items-center justify-center hover:bg-terracotta-dark transition-colors">
                    <svg data-icon width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${playIcon}</svg>
                  </button>
                  <div data-track class="relative flex-1 h-2 rounded-full bg-sable/50 cursor-pointer">
                    <div data-fill class="absolute inset-y-0 left-0 w-0 rounded-full bg-terracotta"></div>
                  </div>
                  <span data-time class="shrink-0 text-xs tabular-nums text-black/60 w-20 text-right">0:00 / 0:00</span>
                </div>
              </div>
              <audio data-audio src="${escapeHtml(ep.audio)}" preload="none"></audio>
            </li>
          `;
        })
        .join('');

      let current = null;

      grid.querySelectorAll('[data-player]').forEach((card) => {
        const audio = card.querySelector('[data-audio]');
        const btn = card.querySelector('[data-action="toggle"]');
        const icon = btn.querySelector('[data-icon]');
        const track = card.querySelector('[data-track]');
        const fill = card.querySelector('[data-fill]');
        const time = card.querySelector('[data-time]');

        const setIcon = (playing) => {
          icon.innerHTML = playing ? pauseIcon : playIcon;
          btn.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
        };

        const updateProgress = () => {
          const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
          fill.style.width = `${pct}%`;
          time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        };

        btn.addEventListener('click', () => {
          if (current && current !== audio) {
            current.pause();
          }
          if (audio.paused) {
            audio.play();
            current = audio;
          } else {
            audio.pause();
          }
        });

        audio.addEventListener('play', () => setIcon(true));
        audio.addEventListener('pause', () => setIcon(false));
        audio.addEventListener('ended', () => setIcon(false));
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateProgress);

        track.addEventListener('click', (e) => {
          if (!audio.duration) return;
          const rect = track.getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          audio.currentTime = ratio * audio.duration;
          updateProgress();
        });
      });
    })
    .catch(() => {
      /* Pas d'épisode audio pour l'instant : l'état vide déjà présent dans la page reste affiché. */
    });
})();
