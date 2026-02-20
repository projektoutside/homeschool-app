import { useEffect, useMemo, useRef } from 'react';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { buildAssetPath } from '../utils/pathUtils';

const STANDARD_CLICK_SOUND_PATH = buildAssetPath(
    'HomePageAPP/HomePageMusic/MysterySoundEffects/standardclick.mp3',
);
const AUDIO_POOL_SIZE = 4;
const INTERACTIVE_CLICK_SELECTOR = [
    'button',
    'a[href]',
    'summary',
    'select',
    'label[for]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[data-play-standard-click="true"]',
].join(',');
const TEXT_ENTRY_SELECTOR = [
    'textarea',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])',
].join(',');

const toUnitVolume = (percent: number): number => {
    if (!Number.isFinite(percent)) {
        return 0;
    }
    return Math.max(0, Math.min(1, percent / 100));
};

const isInteractiveClickTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) {
        return false;
    }
    if (target.closest('[data-no-click-sound="true"]')) {
        return false;
    }

    if (target.closest(TEXT_ENTRY_SELECTOR)) {
        return false;
    }

    const interactiveElement = target.closest(INTERACTIVE_CLICK_SELECTOR);
    if (interactiveElement) {
        if (interactiveElement.matches(':disabled') || interactiveElement.getAttribute('aria-disabled') === 'true') {
            return false;
        }
        return true;
    }

    const focusableElement = target.closest('[tabindex]:not([tabindex="-1"])');
    if (focusableElement && focusableElement.getAttribute('aria-disabled') !== 'true') {
        return true;
    }
    if (target.closest('[aria-disabled="true"]')) {
        return false;
    }

    let current: Element | null = target;
    for (let depth = 0; depth < 4 && current; depth += 1) {
        if (current instanceof HTMLElement) {
            const cursor = window.getComputedStyle(current).cursor;
            if (cursor === 'pointer') {
                return true;
            }
        }
        current = current.parentElement;
    }

    return false;
};

export const useGlobalUiClickSound = (): void => {
    const {
        settings: { muted, sfxVolume },
    } = useSoundSettings();
    const audioPoolRef = useRef<HTMLAudioElement[]>([]);
    const nextAudioIndexRef = useRef(0);
    const currentVolumeRef = useRef(0);

    const effectiveSfxVolume = useMemo(() => (
        muted ? 0 : toUnitVolume(sfxVolume)
    ), [muted, sfxVolume]);

    useEffect(() => {
        currentVolumeRef.current = effectiveSfxVolume;
        audioPoolRef.current.forEach(audio => {
            audio.volume = effectiveSfxVolume;
            audio.muted = effectiveSfxVolume <= 0;
        });
    }, [effectiveSfxVolume]);

    useEffect(() => {
        const pool = Array.from({ length: AUDIO_POOL_SIZE }, () => {
            const audio = new Audio(STANDARD_CLICK_SOUND_PATH);
            audio.preload = 'auto';
            audio.volume = currentVolumeRef.current;
            audio.muted = currentVolumeRef.current <= 0;
            try {
                audio.load();
            } catch {
                // ignore preload failures
            }
            return audio;
        });

        audioPoolRef.current = pool;
        nextAudioIndexRef.current = 0;

        return () => {
            pool.forEach(audio => {
                audio.pause();
                audio.src = '';
            });
            audioPoolRef.current = [];
        };
    }, []);

    useEffect(() => {
        const onDocumentClick = (event: MouseEvent) => {
            if (!event.isTrusted || event.button !== 0 || event.defaultPrevented) {
                return;
            }
            if (!isInteractiveClickTarget(event.target)) {
                return;
            }

            const volume = currentVolumeRef.current;
            if (volume <= 0) {
                return;
            }

            const pool = audioPoolRef.current;
            if (pool.length === 0) {
                return;
            }

            const audio = pool[nextAudioIndexRef.current];
            nextAudioIndexRef.current = (nextAudioIndexRef.current + 1) % pool.length;
            audio.currentTime = 0;
            audio.volume = volume;
            audio.muted = false;
            void audio.play().catch(() => {
                // ignore autoplay and decode failures
            });
        };

        document.addEventListener('click', onDocumentClick, true);
        return () => {
            document.removeEventListener('click', onDocumentClick, true);
        };
    }, []);
};
