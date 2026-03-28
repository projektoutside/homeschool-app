import React from 'react';
import './AppLoadingFallback.css';

type AppLoadingFallbackProps = {
  className?: string;
};

const AppLoadingFallback: React.FC<AppLoadingFallbackProps> = ({ className }) => {
  const rootClassName = [
    'app-loading-fallback',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClassName}
      role="status"
      aria-live="polite"
      data-no-click-sound="true"
      data-cinematic-feedback="off"
    >
      <div className="app-loading-fallback__backdrop" aria-hidden="true" />
      <div className="app-loading-fallback__content">
        <div className="app-loading-fallback__panel">
          <span className="app-loading-fallback__eyebrow">La&apos;s Homeschool</span>
          <strong className="app-loading-fallback__title">Loading</strong>
          <span className="app-loading-fallback__body">Preparing your next screen.</span>
          <div className="app-loading-fallback__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <span className="app-loading-fallback__sr-only">
        Preparing La&apos;s Homeschool.
      </span>
    </div>
  );
};

export default AppLoadingFallback;
