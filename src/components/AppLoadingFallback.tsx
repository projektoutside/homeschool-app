import React from 'react';
import backgroundImage from '../../MainLoadingScreen.png';
import './AppLoadingFallback.css';

const xioLoadingImageSrc = `${import.meta.env.BASE_URL}HomePageAPP/XiOLoadingscreen.png`;

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
      style={{ '--app-loading-background': `url("${backgroundImage}")` } as React.CSSProperties}
      role="status"
      aria-live="polite"
      data-no-click-sound="true"
      data-cinematic-feedback="off"
    >
      <div className="app-loading-fallback__backdrop" aria-hidden="true" />
      <div className="app-loading-fallback__content">
        <div className="app-loading-fallback__orb" aria-hidden="true" />
        <img
          className="app-loading-fallback__xio"
          src={xioLoadingImageSrc}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <div className="app-loading-fallback__copy">
          <span className="app-loading-fallback__eyebrow">La&apos;s Homeschool</span>
          <strong className="app-loading-fallback__title">Preparing your learning world</strong>
          <span className="app-loading-fallback__body">
            Getting everything ready for a smooth start.
          </span>
        </div>
        <div className="app-loading-fallback__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="app-loading-fallback__sr-only">
        Preparing La&apos;s Homeschool.
      </span>
    </div>
  );
};

export default AppLoadingFallback;
