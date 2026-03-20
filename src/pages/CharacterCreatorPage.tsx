import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomepageCatalog } from '../hooks/useHomepageCatalog';
import {
  HOMEPAGE_CREATOR_READY,
  HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY,
  HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY,
  HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY,
  HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY,
  HOMEPAGE_PROP_SAVE_REQUEST,
  HOMEPAGE_PROP_SAVE_RESULT,
  HOMEPAGE_PROP_UPLOAD_REQUEST,
  HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST,
  buildHomepageMysteryTestLaunchToken,
  buildHomepageMysteryTestSession,
  buildHomepageMysteryTestOverride,
  clearHomepageMysteryTestSession,
  clearHomepageLegacyPinnedMysteryRewardKey,
  clearHomepageMysteryTestOverride,
  createCreatorCatalogSyncPayload,
  mysteryTestOverrideMatchesPropKey,
  normalizeHomepageCategory,
  normalizeHomepagePropKey,
  normalizeHomepageProp,
  persistHomepageLegacyPinnedMysteryRewardKey,
  persistHomepageCatalogSnapshot,
  persistHomepageMysteryTestLaunchToken,
  persistHomepageMysteryTestSession,
  persistHomepageMysteryTestOverride,
  readHomepageLegacyPinnedMysteryRewardKey,
  readHomepageMysteryTestSession,
  readHomepageMysteryTestOverride,
} from '../utils/homepageCatalogBridge';
import { isManagerUser } from '../utils/managerAccess';
import { buildAssetPath } from '../utils/pathUtils';
import { HOMEPAGE_CREATOR_APP_VERSION } from '../constants/homepageAppVersion';
import type { HomepageCatalogSnapshot, HomepageCategoryRecord, HomepagePropRecord } from '../types/homepageCatalog';
import { postIframeLifecyclePhase, teardownIframeElementWhenDisconnected } from '../utils/iframeLifecycle';
import './CharacterCreatorPage.css';

const CHARACTER_CREATOR_APP_VERSION = HOMEPAGE_CREATOR_APP_VERSION;

type CreatorMessage = {
  type?: unknown;
  requestId?: unknown;
  payload?: unknown;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
};

const matchesPinnedPropKey = (currentPinnedKey: string | null | undefined, candidateKey: string | null | undefined): boolean => {
  const currentRaw = typeof currentPinnedKey === 'string' ? currentPinnedKey.trim() : '';
  const candidateRaw = typeof candidateKey === 'string' ? candidateKey.trim() : '';
  if (!currentRaw || !candidateRaw) {
    return false;
  }
  if (currentRaw === candidateRaw) {
    return true;
  }
  return normalizeHomepagePropKey(currentRaw) === normalizeHomepagePropKey(candidateRaw);
};

const findPersistedPropKey = (
  latestSnapshot: HomepageCatalogSnapshot | null,
  nextPropRecord: HomepagePropRecord,
): string | null => {
  if (!latestSnapshot?.props?.length) {
    return null;
  }
  const exactMatch = latestSnapshot.props.find((entry) => entry.key === nextPropRecord.key);
  if (exactMatch?.key) {
    return exactMatch.key;
  }
  const normalizedKey = normalizeHomepagePropKey(nextPropRecord.key);
  const normalizedKeyMatch = latestSnapshot.props.find((entry) => normalizeHomepagePropKey(entry.key) === normalizedKey);
  if (normalizedKeyMatch?.key) {
    return normalizedKeyMatch.key;
  }
  const storagePathMatch = nextPropRecord.storagePath
    ? latestSnapshot.props.find((entry) => entry.storagePath === nextPropRecord.storagePath)
    : null;
  if (storagePathMatch?.key) {
    return storagePathMatch.key;
  }
  const assetUrlMatch = nextPropRecord.assetUrl
    ? latestSnapshot.props.find((entry) => entry.assetUrl === nextPropRecord.assetUrl)
    : null;
  if (assetUrlMatch?.key) {
    return assetUrlMatch.key;
  }
  const labelCategoryMatch = latestSnapshot.props.find((entry) => (
    entry.categoryKey === nextPropRecord.categoryKey
    && entry.label === nextPropRecord.label
  ));
  return labelCategoryMatch?.key || null;
};

const CharacterCreatorPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting creator workspace...');
  const hasManagerAccess = useMemo(() => isManagerUser(user), [user]);
  const { snapshot, canManage, uploadPropAsset, saveCategory, deleteCategory, deleteProp, saveProp, error, isLoading } = useHomepageCatalog({
    includeInactive: true,
  });
  const launchPath = useMemo(
    () => buildAssetPath(`HomePageAPP/character-creator.html?v=${CHARACTER_CREATOR_APP_VERSION}`),
    [],
  );

  const postMessageToCreator = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const syncCatalogToCreator = useCallback((reason: string | null = null, snapshotOverride: HomepageCatalogSnapshot | null = null) => {
    const nextSnapshot = snapshotOverride ?? snapshot;
    persistHomepageCatalogSnapshot(nextSnapshot);
    postMessageToCreator(createCreatorCatalogSyncPayload({
      snapshot: nextSnapshot,
      publishEnabled: canManage,
      reason,
    }));
  }, [canManage, postMessageToCreator, snapshot]);

  const persistNextMysteryTestReward = useCallback((propKey: string | null, snapshotUpdatedAt: string | null) => {
    const nextSession = buildHomepageMysteryTestSession({
      propKey,
      snapshotUpdatedAt,
      requiredCatalogRevision: snapshotUpdatedAt,
    });
    persistHomepageMysteryTestSession(nextSession);
    const nextOverride = buildHomepageMysteryTestOverride({
      propKey,
      snapshotUpdatedAt,
      createdAt: nextSession?.createdAt,
    });
    persistHomepageMysteryTestOverride(nextOverride);
    persistHomepageLegacyPinnedMysteryRewardKey(propKey);
    return {
      override: nextOverride,
      session: nextSession,
    };
  }, []);

  const clearPinnedMysteryRewardKeyIfMatch = useCallback((keys: Array<string | null | undefined>) => {
    try {
      const currentPinnedKey = readHomepageLegacyPinnedMysteryRewardKey();
      const currentOverride = readHomepageMysteryTestOverride();
      const currentSession = readHomepageMysteryTestSession();
      const shouldClear = keys.some((key) => (
        mysteryTestOverrideMatchesPropKey(currentSession, key)
        || (
          typeof currentSession?.propKey === 'string'
          && normalizeHomepagePropKey(currentSession.propKey) === normalizeHomepagePropKey(key)
        )
        || (
          typeof currentSession?.normalizedPropKey === 'string'
          && currentSession.normalizedPropKey === normalizeHomepagePropKey(key)
        )
        || (
          mysteryTestOverrideMatchesPropKey(currentOverride, key)
        )
        || matchesPinnedPropKey(currentPinnedKey, key)
      ));
      if (shouldClear) {
        clearHomepageMysteryTestSession();
        clearHomepageMysteryTestOverride();
        clearHomepageLegacyPinnedMysteryRewardKey();
      }
    } catch {
      // Ignore storage failures so creator publishing still succeeds.
    }
  }, []);

  useEffect(() => {
    if (!hasManagerAccess) {
      navigate('/manager', { replace: true });
    }
  }, [hasManagerAccess, navigate]);

  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      teardownIframeElementWhenDisconnected(iframe, { reason: 'character-creator-unmount' });
      if (iframeRef.current === iframe) {
        iframeRef.current = null;
      }
    };
  }, [launchPath]);

  useEffect(() => {
    if (!isLoaded) return;
    syncCatalogToCreator(error ?? null);
  }, [error, isLoaded, syncCatalogToCreator, snapshot]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;

      const message = event.data as CreatorMessage;
      const messageType = typeof message.type === 'string' ? message.type : '';
      const requestId = typeof message.requestId === 'string' ? message.requestId : `creator-${Date.now()}`;
      const payload = message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)
        ? message.payload as Record<string, unknown>
        : {};
      const previousKey = typeof payload.previousKey === 'string' ? payload.previousKey.trim() : '';

      if (messageType === HOMEPAGE_CREATOR_READY) {
        setStatusMessage(canManage ? 'Creator connected.' : 'Creator is running in local draft mode.');
        syncCatalogToCreator(error ?? null);
        return;
      }

      if (messageType === HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST) {
        const existingSession = readHomepageMysteryTestSession();
        const existingOverride = readHomepageMysteryTestOverride();
        const launchToken = buildHomepageMysteryTestLaunchToken({
          propKey: existingSession?.propKey ?? existingOverride?.propKey ?? readHomepageLegacyPinnedMysteryRewardKey(),
          snapshotUpdatedAt: existingSession?.snapshotUpdatedAt ?? existingOverride?.snapshotUpdatedAt ?? snapshot?.updatedAt ?? null,
        });
        persistHomepageMysteryTestLaunchToken(launchToken);
        console.info('[HomepageCreator] Launching mystery-box test session.', {
          session: existingSession,
          launchToken,
          sessionStorageKey: HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY,
          overrideStorageKey: HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY,
          legacyStorageKey: HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY,
          launchStorageKey: HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY,
        });
        navigate('/home-profile');
        return;
      }

      if (!canManage) {
        if (messageType === HOMEPAGE_PROP_UPLOAD_REQUEST || messageType === HOMEPAGE_PROP_SAVE_REQUEST) {
          postMessageToCreator({
            type: HOMEPAGE_PROP_SAVE_RESULT,
            requestId,
            ok: false,
            operation: messageType === HOMEPAGE_PROP_UPLOAD_REQUEST ? 'upload' : 'save',
            error: 'Manager access is required to publish HomepageAPP props.',
          });
        }
        return;
      }

      if (messageType === HOMEPAGE_PROP_UPLOAD_REQUEST) {
        try {
          const uploadFile = payload.file;
          if (!(uploadFile instanceof File)) {
            throw new Error('Creator upload request did not include a valid file.');
          }
          const uploadResult = await uploadPropAsset(uploadFile);
          postMessageToCreator({
            type: HOMEPAGE_PROP_SAVE_RESULT,
            requestId,
            ok: true,
            operation: 'upload',
            data: uploadResult,
          });
        } catch (uploadError) {
          console.error('[CharacterCreatorPage] Upload failed:', uploadError);
          postMessageToCreator({
            type: HOMEPAGE_PROP_SAVE_RESULT,
            requestId,
            ok: false,
            operation: 'upload',
            error: getErrorMessage(uploadError, 'Upload failed.'),
          });
        }
        return;
      }

      if (messageType === HOMEPAGE_PROP_SAVE_REQUEST) {
        try {
          const entity = payload.entity === 'category' ? 'category' : 'prop';
          const action = payload.action === 'delete' ? 'delete' : 'save';
          let latestSnapshot: HomepageCatalogSnapshot | null = snapshot;
          let persistedPropKeyForResponse: string | null = null;
          let mysteryTestOverrideForResponse = null;
          let mysteryTestSessionForResponse = null;
          if (entity === 'category') {
            const normalizedCategory = normalizeHomepageCategory(payload.record);
            if (!normalizedCategory) {
              throw new Error('Creator category payload was invalid.');
            }
            if (action === 'delete') {
              const deletedPropKeys = snapshot?.props
                .filter((entry) => entry.categoryKey === normalizedCategory.key)
                .map((entry) => entry.key) ?? [];
              latestSnapshot = await deleteCategory(normalizedCategory.key);
              clearPinnedMysteryRewardKeyIfMatch(deletedPropKeys);
            } else {
              latestSnapshot = await saveCategory(normalizedCategory as HomepageCategoryRecord);
              if (previousKey && previousKey !== normalizedCategory.key) {
                const propsToMigrate = snapshot?.props.filter((entry) => entry.categoryKey === previousKey) ?? [];
                for (const propRecord of propsToMigrate) {
                  latestSnapshot = await saveProp({
                    ...propRecord,
                    categoryKey: normalizedCategory.key,
                  });
                }
                latestSnapshot = await deleteCategory(previousKey);
              }
            }
          } else {
            const normalizedProp = normalizeHomepageProp(payload.record);
            if (!normalizedProp) {
              throw new Error('Creator prop payload was invalid.');
            }
            if (action === 'delete') {
              const deleteMode = payload.deleteMode === 'hard' ? 'hard' : 'tombstone';
              if (deleteMode === 'hard') {
                latestSnapshot = await deleteProp(normalizedProp.key, {
                  storagePath: normalizedProp.storagePath,
                });
              } else {
                latestSnapshot = await saveProp({
                  ...(normalizedProp as HomepagePropRecord),
                  active: false,
                  archived: true,
                  mysteryBoxEnabled: false,
                });
              }
              clearPinnedMysteryRewardKeyIfMatch([normalizedProp.key, previousKey]);
            } else {
              const isArchiveSave = normalizedProp.archived === true;
              const nextPropRecord: HomepagePropRecord = {
                ...(normalizedProp as HomepagePropRecord),
                active: isArchiveSave ? false : normalizedProp.active !== false,
                archived: isArchiveSave,
                mysteryBoxEnabled: isArchiveSave ? false : normalizedProp.mysteryBoxEnabled === true,
              };
              latestSnapshot = await saveProp(nextPropRecord);
              persistedPropKeyForResponse = findPersistedPropKey(latestSnapshot, nextPropRecord) || nextPropRecord.key;
              if (isArchiveSave) {
                clearPinnedMysteryRewardKeyIfMatch([nextPropRecord.key, previousKey]);
              }
              if (previousKey && previousKey !== nextPropRecord.key) {
                const previousProp = snapshot?.props.find((entry) => entry.key === previousKey);
                if (previousProp) {
                  latestSnapshot = await saveProp({
                    ...previousProp,
                    active: false,
                    archived: true,
                    mysteryBoxEnabled: false,
                  });
                }
              }
              if (!isArchiveSave) {
                const mysteryTestState = persistNextMysteryTestReward(
                  persistedPropKeyForResponse,
                  latestSnapshot?.updatedAt ?? null,
                );
                mysteryTestOverrideForResponse = mysteryTestState.override;
                mysteryTestSessionForResponse = mysteryTestState.session;
                console.info('[HomepageCreator] Stored next mystery-box test reward.', {
                  draftPropKey: nextPropRecord.key,
                  persistedPropKey: persistedPropKeyForResponse,
                  override: mysteryTestOverrideForResponse,
                  session: mysteryTestSessionForResponse,
                  snapshotUpdatedAt: latestSnapshot?.updatedAt ?? null,
                });
              }
            }
          }

          syncCatalogToCreator(null, latestSnapshot);
          postMessageToCreator({
            type: HOMEPAGE_PROP_SAVE_RESULT,
            requestId,
            ok: true,
            operation: action,
            data: {
              snapshot: latestSnapshot,
              ...(entity === 'prop' && action !== 'delete'
                ? {
                  persistedPropKey: persistedPropKeyForResponse,
                  mysteryTestOverride: mysteryTestOverrideForResponse ?? readHomepageMysteryTestOverride(),
                  mysteryTestSession: mysteryTestSessionForResponse ?? readHomepageMysteryTestSession(),
                }
                : {}),
            },
          });
        } catch (saveError) {
          console.error('[CharacterCreatorPage] Save failed:', saveError);
          postMessageToCreator({
            type: HOMEPAGE_PROP_SAVE_RESULT,
            requestId,
            ok: false,
            operation: 'save',
            error: getErrorMessage(saveError, 'Save failed.'),
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [canManage, clearPinnedMysteryRewardKeyIfMatch, deleteCategory, deleteProp, error, navigate, persistNextMysteryTestReward, postMessageToCreator, saveCategory, saveProp, snapshot, snapshot?.props, syncCatalogToCreator, uploadPropAsset]);

  if (!hasManagerAccess) {
    return null;
  }

  return (
    <section className="character-creator-host">
      <header className="character-creator-host__header">
        <div>
          <p className="character-creator-host__eyebrow">Studio Workspace</p>
          <h1>XiO Character Creator</h1>
          <p className="character-creator-host__status">
            {isLoading ? 'Loading live HomepageAPP catalog...' : statusMessage}
          </p>
          {error ? <p className="character-creator-host__error">{error}</p> : null}
        </div>
        <div className="character-creator-host__actions">
          <Link className="character-creator-host__link" to="/">Back to Homepage</Link>
          <Link className="character-creator-host__link" to="/manager">Back to Manager</Link>
          <a className="character-creator-host__link" href={launchPath} target="_blank" rel="noreferrer">
            Open Standalone
          </a>
        </div>
      </header>

      <div className="character-creator-host__frame-shell">
        {!isLoaded ? <div className="character-creator-host__loading">Launching creator...</div> : null}
        <iframe
          ref={iframeRef}
          src={launchPath}
          title="XiO Character Creator"
          className={`character-creator-host__frame ${isLoaded ? 'is-loaded' : ''}`}
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
          onLoad={() => {
            setIsLoaded(true);
            postIframeLifecyclePhase(iframeRef.current, 'resume', { reason: 'character-creator-load' });
            syncCatalogToCreator(error ?? null);
          }}
        />
      </div>
    </section>
  );
};

export default CharacterCreatorPage;
