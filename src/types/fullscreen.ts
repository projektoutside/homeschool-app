/**
 * Type definitions for fullscreen API with vendor prefixes
 * Provides type safety for cross-browser fullscreen support
 */

interface FullscreenDocument extends Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
}

interface FullscreenHTMLElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
}

export type FullscreenDocumentType = FullscreenDocument;
export type FullscreenHTMLElementType = FullscreenHTMLElement;
