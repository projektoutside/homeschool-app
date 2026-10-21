(() => {
  'use strict';

  const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/></svg>';
  const lock = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>';

  function earnedStars(stats) {
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return 0;
    const stars = Number(stats.stars);
    if (Number.isFinite(stars) && stars >= 1) return Math.min(3, Math.floor(stars));
    // Earlier saves recorded points before they recorded stars. The bonuses match.
    const points = Number(stats.points);
    return Number.isFinite(points) && points >= 100 ? Math.min(3, 1 + Math.floor((points - 100) / 25)) : 0;
  }

  class WoodlandLevelMap {
    constructor({ dialog, levels, onSelect, onClose }) {
      this.dialog = dialog;
      this.levels = levels;
      this.scroll = dialog.querySelector('#mapScroll');
      this.returnFocus = null;
      this.onClose = onClose;
      dialog.querySelector('#closeLevelMap').addEventListener('click', () => this.close());
      dialog.querySelector('#resumeFromMap').addEventListener('click', () => this.close());
      dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
      dialog.addEventListener('close', () => this.finishClose());
      dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const targets = [...dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
        const first = targets[0], last = targets[targets.length - 1];
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      });
      this.scroll.addEventListener('click', event => {
        const button = event.target.closest('button[data-level]');
        if (!button || button.disabled || !dialog.open) return;
        const index = Number(button.dataset.level);
        if (index >= 0 && index < this.highestUnlocked) onSelect(index);
      });
    }

    open({ levelIndex, highestUnlocked, bestStats, returnFocus }) {
      this.highestUnlocked = highestUnlocked;
      this.returnFocus = returnFocus;
      this.scroll.replaceChildren();
      let totalStars = 0, cleared = 0;
      for (let start = 0; start < this.levels.length; start += 3) {
        const chapter = document.createElement('section');
        chapter.className = 'map-chapter';
        const heading = document.createElement('h3');
        heading.id = `mapChapter${start}`;
        heading.textContent = this.levels[start].chapter;
        chapter.setAttribute('aria-labelledby', heading.id);
        const stops = document.createElement('div');
        stops.className = 'map-stops';
        stops.innerHTML = '<svg class="map-trail" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true"><path d="M100 56 Q200 4 300 32 Q400 4 500 56"/></svg>';
        let chapterStars = 0;
        for (let index = start; index < Math.min(start + 3, this.levels.length); index++) {
          const level = this.levels[index], locked = index >= highestUnlocked;
          const stars = locked ? 0 : earnedStars(bestStats[String(index + 1)]);
          totalStars += stars;
          chapterStars += stars;
          if (stars) cleared++;
          const current = index === levelIndex;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `map-stop${current ? ' is-current' : ''}${stars ? ' is-cleared' : ''}`;
          button.dataset.level = String(index);
          button.disabled = locked;
          if (current) button.setAttribute('aria-current', 'step');
          const status = locked ? 'Locked' : current ? 'Playing' : stars ? 'Replay' : 'Play';
          button.setAttribute('aria-label', `Level ${index + 1}: ${level.title}. ${locked ? `Locked. Clear level ${index} to unlock.` : `${stars} of 3 stars. ${status}.`}`);
          button.innerHTML = `<span class="map-node"><span>${index + 1}</span>${locked ? lock : ''}</span><span class="map-stars" aria-hidden="true">${[0, 1, 2].map(i => `<span${i < stars ? ' class="is-earned"' : ''}>${star}</span>`).join('')}</span><span class="map-level-name"></span><span class="map-stop-status">${status}</span>`;
          button.querySelector('.map-level-name').textContent = level.title;
          stops.append(button);
        }
        const tally = document.createElement('span');
        tally.className = 'map-chapter-stars';
        tally.innerHTML = star;
        tally.append(` ${chapterStars} / 9`);
        tally.setAttribute('aria-label', `${chapterStars} of 9 chapter stars`);
        heading.append(tally);
        chapter.append(heading, stops);
        this.scroll.append(chapter);
      }
      this.dialog.querySelector('#mapProgress').textContent = `${cleared} / ${this.levels.length} cleared · ${totalStars} / ${this.levels.length * 3} stars`;
      this.dialog.querySelector('#resumeFromMap').textContent = `Back to Level ${levelIndex + 1}`;
      this.dialog.showModal();
      const current = this.scroll.querySelector('[aria-current="step"]');
      current.focus({ preventScroll: true });
      this.scroll.scrollTop = Math.max(0, current.closest('section').offsetTop - 12);
    }

    close() {
      if (!this.dialog.open) return;
      this.dialog.close();
      // Selection starts a fresh attempt immediately; do not wait for the close event.
      this.finishClose();
    }

    finishClose() {
      if (this.dialog.open || !this.returnFocus) return;
      const target = this.returnFocus;
      this.returnFocus = null;
      this.onClose();
      target.focus({ preventScroll: true });
    }
  }

  window.WoodlandLevelMap = WoodlandLevelMap;
})();
