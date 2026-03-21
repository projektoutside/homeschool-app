import type { FullscreenDocumentType, FullscreenHTMLElementType } from '../types/fullscreen';

export const getFullscreenElement = (doc: Document = document): Element | null => {
  const fullscreenDocument = doc as FullscreenDocumentType;
  return (
    doc.fullscreenElement
    || fullscreenDocument.webkitFullscreenElement
    || fullscreenDocument.mozFullScreenElement
    || fullscreenDocument.msFullscreenElement
    || null
  );
};

export const requestElementFullscreen = async (
  element: FullscreenHTMLElementType | null | undefined,
): Promise<boolean> => {
  if (!element) {
    return false;
  }

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    }
    if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return true;
    }
    if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen();
      return true;
    }
    if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

export const exitDocumentFullscreen = async (doc: Document = document): Promise<boolean> => {
  const fullscreenDocument = doc as FullscreenDocumentType;

  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return true;
    }
    if (fullscreenDocument.webkitExitFullscreen) {
      await fullscreenDocument.webkitExitFullscreen();
      return true;
    }
    if (fullscreenDocument.mozCancelFullScreen) {
      await fullscreenDocument.mozCancelFullScreen();
      return true;
    }
    if (fullscreenDocument.msExitFullscreen) {
      await fullscreenDocument.msExitFullscreen();
      return true;
    }
  } catch {
    return false;
  }

  return false;
};
