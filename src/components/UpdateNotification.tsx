import React from 'react';
import './InstallButton.css';
import type { usePWA } from '../hooks/usePWA';

type PWAState = ReturnType<typeof usePWA>;

interface UpdateNotificationProps {
  updateInfo: PWAState['updateInfo'];
  isCheckingForUpdates: PWAState['isCheckingForUpdates'];
  checkForUpdates: PWAState['checkForUpdates'];
  applyUpdate: PWAState['applyUpdate'];
}

/**
 * Update Notification Component
 * Shows a notification when updates are available from GitHub
 * Allows users to apply updates with one click
 * 
 * NOTE: Currently disabled during app setup
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  applyUpdate,
  checkForUpdates,
  isCheckingForUpdates,
}) => {

  if (!updateInfo?.hasUpdate) return null;

  return (
    <div className="update-notification" role="status" aria-live="polite">
      <div className="update-notification-content">
        <div className="update-notification-title">Update Ready 🚀</div>
        <div className="update-notification-message">
          A newer version of La&apos;s Homeschool is available.
        </div>
      </div>
      <div className="update-notification-actions">
        <button
          className="update-btn update-btn-secondary"
          onClick={checkForUpdates}
          disabled={isCheckingForUpdates}
          type="button"
        >
          {isCheckingForUpdates ? 'Checking…' : 'Recheck'}
        </button>
        <button className="update-btn update-btn-primary" onClick={applyUpdate} type="button">
          Update Now
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;