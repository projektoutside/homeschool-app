import {
  consumeHomepageMysteryTestLaunchToken,
  normalizeHomepagePropKey,
  readHomepageCatalogSnapshot,
  readHomepageMysteryTestSession,
} from '../../utils/homepageCatalogBridge';
import type { HomepageCatalogSnapshot } from '../../types/homepageCatalog';

export type PendingMysteryLaunchState = {
  propKey: string | null;
  snapshotUpdatedAt: string | null;
  requiredCatalogRevision: string | null;
  createdAt: string;
  launchId: string | null;
};

type MysterySession = ReturnType<typeof readHomepageMysteryTestSession>;
type MysteryLaunchToken = ReturnType<typeof consumeHomepageMysteryTestLaunchToken>;

export const snapshotContainsPropKey = (
  catalogSnapshot: HomepageCatalogSnapshot | null | undefined,
  propKey: string | null | undefined,
): boolean => {
  const normalizedKey = normalizeHomepagePropKey(propKey);
  if (!normalizedKey || !Array.isArray(catalogSnapshot?.props)) {
    return false;
  }

  return catalogSnapshot.props.some(
    (entry) => normalizeHomepagePropKey(entry.key) === normalizedKey,
  );
};

export const buildPendingMysteryLaunchState = ({
  session,
  launchToken,
}: {
  session: MysterySession | null;
  launchToken: MysteryLaunchToken | null;
}): PendingMysteryLaunchState | null => {
  if (session?.propKey) {
    return {
      propKey: session.propKey,
      snapshotUpdatedAt: session.snapshotUpdatedAt ?? null,
      requiredCatalogRevision: session.requiredCatalogRevision ?? null,
      createdAt: session.createdAt,
      launchId: session.launchId ?? null,
    };
  }

  if (launchToken?.propKey) {
    return {
      propKey: launchToken.propKey,
      snapshotUpdatedAt: launchToken.snapshotUpdatedAt ?? null,
      requiredCatalogRevision: launchToken.snapshotUpdatedAt ?? null,
      createdAt: launchToken.createdAt,
      launchId: null,
    };
  }

  return null;
};

export const createInitialHomepageLaunchState = () => {
  const session = readHomepageMysteryTestSession();
  const launchToken = session ? null : consumeHomepageMysteryTestLaunchToken();
  const pendingMysteryLaunch = buildPendingMysteryLaunchState({
    session,
    launchToken,
  });

  return {
    pendingMysteryLaunch,
    storedSnapshot: readHomepageCatalogSnapshot(),
  };
};
