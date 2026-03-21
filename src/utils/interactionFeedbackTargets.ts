const CLICK_TARGET_SELECTOR_PARTS = [
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
  '[role="link"]',
  '[data-play-standard-click="true"]',
];

const TABINDEX_SELECTOR = '[tabindex]:not([tabindex="-1"])';

const TEXT_ENTRY_SELECTOR_PARTS = [
  'textarea',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])',
];

const FOCUSABLE_SELECTOR_PARTS = [
  ...CLICK_TARGET_SELECTOR_PARTS.filter((selector) => selector !== 'label[for]'),
  ...TEXT_ENTRY_SELECTOR_PARTS,
  TABINDEX_SELECTOR,
  'audio[controls]',
  'video[controls]',
];

const FEEDBACK_SURFACE_SELECTOR_PARTS = Array.from(
  new Set([
    ...CLICK_TARGET_SELECTOR_PARTS,
    ...FOCUSABLE_SELECTOR_PARTS,
  ]),
);

export const INTERACTIVE_CLICK_SELECTOR = CLICK_TARGET_SELECTOR_PARTS.join(',');
export const TEXT_ENTRY_SELECTOR = TEXT_ENTRY_SELECTOR_PARTS.join(',');
export const CINEMATIC_PRESSABLE_SELECTOR = Array.from(
  new Set([
    ...CLICK_TARGET_SELECTOR_PARTS,
    TABINDEX_SELECTOR,
  ]),
).join(',');
export const CINEMATIC_FOCUSABLE_SELECTOR = Array.from(new Set(FOCUSABLE_SELECTOR_PARTS)).join(',');
export const CINEMATIC_FEEDBACK_SURFACE_SELECTOR = FEEDBACK_SURFACE_SELECTOR_PARTS.join(',');

const OPT_OUT_SELECTOR = '[data-cinematic-feedback="off"]';
const DISABLED_SELECTOR = ':disabled, [aria-disabled="true"]';

const isElement = (value: unknown): value is Element => {
  return Boolean(
    value
    && typeof value === 'object'
    && 'nodeType' in value
    && (value as Node).nodeType === 1,
  );
};

const asHTMLElement = (value: unknown): HTMLElement | null => {
  if (!isElement(value)) {
    return null;
  }

  if (!('style' in value) || !('dataset' in value)) {
    return null;
  }

  return value as HTMLElement;
};

export const hasCinematicFeedbackOptOut = (element: Element | null | undefined): boolean => {
  return Boolean(element?.closest(OPT_OUT_SELECTOR));
};

export const isTextEntryElement = (element: Element | null | undefined): boolean => {
  return Boolean(element?.matches(TEXT_ENTRY_SELECTOR));
};

export const isDisabledInteractiveElement = (element: Element | null | undefined): boolean => {
  return Boolean(element?.matches(DISABLED_SELECTOR));
};

const findClosestValidElement = (
  target: EventTarget | null,
  selector: string,
): HTMLElement | null => {
  if (!isElement(target)) {
    return null;
  }

  const match = target.closest(selector);
  const htmlMatch = asHTMLElement(match);
  if (!htmlMatch) {
    return null;
  }

  if (hasCinematicFeedbackOptOut(htmlMatch) || isDisabledInteractiveElement(htmlMatch)) {
    return null;
  }

  return htmlMatch;
};

export const findInteractiveClickTarget = (target: EventTarget | null): HTMLElement | null => {
  if (!isElement(target) || hasCinematicFeedbackOptOut(target)) {
    return null;
  }

  if (target.closest(TEXT_ENTRY_SELECTOR)) {
    return null;
  }

  const interactiveElement = findClosestValidElement(target, INTERACTIVE_CLICK_SELECTOR);
  if (interactiveElement) {
    return interactiveElement;
  }

  const focusableElement = findClosestValidElement(target, TABINDEX_SELECTOR);
  if (focusableElement) {
    return focusableElement;
  }

  let current: Element | null = target;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const currentElement = asHTMLElement(current);
    const ownerWindow = current.ownerDocument?.defaultView;
    if (
      currentElement
      && !hasCinematicFeedbackOptOut(currentElement)
      && !isDisabledInteractiveElement(currentElement)
      && ownerWindow?.getComputedStyle(currentElement).cursor === 'pointer'
    ) {
      return currentElement;
    }
    current = current.parentElement;
  }

  return null;
};

export const findCinematicFocusableTarget = (target: EventTarget | null): HTMLElement | null => {
  return findClosestValidElement(target, CINEMATIC_FOCUSABLE_SELECTOR);
};

export const findCinematicPressableTarget = (target: EventTarget | null): HTMLElement | null => {
  return findInteractiveClickTarget(target);
};
