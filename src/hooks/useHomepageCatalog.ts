import { useCallback, useEffect, useMemo, useState } from 'react';
import * as tus from 'tus-js-client';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabase';
import {
  buildHomepageCatalogSnapshot,
  normalizeHomepageAttachment,
  normalizeHomepageCategory,
  normalizeHomepageProp,
  normalizeHomepageRarity,
} from '../utils/homepageCatalogBridge';
import { getUsername, hasManagerMetadataClaims } from '../utils/managerAccess';
import type {
  HomepageCatalogSnapshot,
  HomepageCategoryRecord,
  HomepagePropAttachment,
  HomepagePropRecord,
} from '../types/homepageCatalog';

const CATEGORY_TABLE = 'homepage_prop_categories';
const PROP_TABLE = 'homepage_props';
const STORAGE_BUCKET = 'homepage-props';
const PUBLIC_PROP_ASSET_CACHE_SECONDS = '31536000';
const STANDARD_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
const HOMEPAGE_CATALOG_SCHEMA_MESSAGE = 'HomepageAPP live catalog tables are missing in Supabase. Run /supabase/schema.sql in the Supabase SQL editor, then refresh.';
const CATEGORY_KEY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  wingset: 'wingSet',
  headwear: 'headWear',
  faceaccessory: 'faceAccessory',
  eyestyle: 'eyeStyle',
  bodyaccessory: 'bodyAccessory',
  heldprop: 'heldProp',
});

const DEFAULT_CATEGORY_DEFINITIONS: ReadonlyArray<HomepageCategoryRecord> = Object.freeze([
  Object.freeze({ key: 'wingSet', label: 'Wing Set', slotKey: 'wingSet', equipLimit: 1, sortOrder: 0, enabled: true, updatedAt: null }),
  Object.freeze({ key: 'headWear', label: 'Headwear', slotKey: 'headWear', equipLimit: 1, sortOrder: 1, enabled: true, updatedAt: null }),
  Object.freeze({ key: 'faceAccessory', label: 'Face Accessory', slotKey: 'faceAccessory', equipLimit: 1, sortOrder: 2, enabled: true, updatedAt: null }),
  Object.freeze({ key: 'eyeStyle', label: 'Eye Style', slotKey: 'eyeStyle', equipLimit: 1, sortOrder: 3, enabled: true, updatedAt: null }),
  Object.freeze({ key: 'bodyAccessory', label: 'Body Accessory', slotKey: 'bodyAccessory', equipLimit: 1, sortOrder: 4, enabled: true, updatedAt: null }),
  Object.freeze({ key: 'heldProp', label: 'Held Prop', slotKey: 'heldProp', equipLimit: 1, sortOrder: 5, enabled: true, updatedAt: null }),
]);

type HomepageCategoryRow = Record<string, unknown>;
type HomepagePropRow = Record<string, unknown>;

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

const slugify = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const normalizeCategoryKey = (value: string): string => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';
  return CATEGORY_KEY_ALIASES[slugify(trimmedValue)] ?? trimmedValue;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry, index, array) => entry.length > 0 && array.indexOf(entry) === index);
};

const serializeAttachment = (attachment: HomepagePropAttachment) => ({
  position: attachment.position,
  rotation: attachment.rotation,
  scale: attachment.scale,
  mirrorMode: attachment.mirrorMode ?? 'single',
  fit: attachment.fit ?? null,
});

const serializeCategory = (category: HomepageCategoryRecord) => ({
  key: normalizeCategoryKey(category.key),
  label: category.label.trim(),
  slot_key: category.slotKey.trim(),
  equip_limit: Math.max(1, Math.round(category.equipLimit || 1)),
  sort_order: Number.isFinite(category.sortOrder) ? category.sortOrder : 0,
  enabled: category.enabled !== false,
  updated_at: new Date().toISOString(),
});

const serializeProp = (prop: HomepagePropRecord, username: string, userId: string | null) => ({
  key: slugify(prop.key),
  label: prop.label.trim(),
  category_key: normalizeCategoryKey(prop.categoryKey),
  rarity: normalizeHomepageRarity(prop.rarity),
  asset_url: typeof prop.assetUrl === 'string' && prop.assetUrl.trim().length > 0 ? prop.assetUrl.trim() : null,
  storage_path: typeof prop.storagePath === 'string' && prop.storagePath.trim().length > 0 ? prop.storagePath.trim() : null,
  attachment: serializeAttachment(normalizeHomepageAttachment(prop.attachment)),
  eye_preset: typeof prop.eyePreset === 'string' && prop.eyePreset.trim().length > 0 ? prop.eyePreset.trim() : null,
  material_preset: typeof prop.materialPreset === 'string' && prop.materialPreset.trim().length > 0 ? prop.materialPreset.trim() : null,
  mystery_box_enabled: prop.mysteryBoxEnabled !== false,
  active: prop.active !== false,
  archived: prop.archived === true,
  tags: toStringArray(prop.tags),
  description: typeof prop.description === 'string' ? prop.description : '',
  preview: prop.preview ?? {},
  updated_at: new Date().toISOString(),
  updated_by_user_id: userId,
  updated_by_username: username,
});

const mapCategoryRow = (row: HomepageCategoryRow): HomepageCategoryRecord | null => normalizeHomepageCategory({
  key: typeof row.key === 'string' ? normalizeCategoryKey(row.key) : row.key,
  label: row.label,
  slotKey: row.slot_key,
  equipLimit: row.equip_limit,
  sortOrder: row.sort_order,
  enabled: row.enabled,
  updatedAt: row.updated_at,
});

const mapPropRow = (row: HomepagePropRow): HomepagePropRecord | null => normalizeHomepageProp({
  key: row.key,
  label: row.label,
  categoryKey: typeof row.category_key === 'string' ? normalizeCategoryKey(row.category_key) : row.category_key,
  rarity: row.rarity,
  assetUrl: row.asset_url,
  storagePath: row.storage_path,
  attachment: row.attachment,
  eyePreset: row.eye_preset,
  materialPreset: row.material_preset,
  mysteryBoxEnabled: row.mystery_box_enabled,
  active: row.active,
  archived: row.archived,
  tags: row.tags,
  description: row.description,
  preview: row.preview,
  updatedAt: row.updated_at,
});

const isHomepageCatalogSchemaMissingError = (error: { message?: string | null; code?: string | null } | null | undefined): boolean => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const code = typeof error?.code === 'string' ? error.code.toUpperCase() : '';
  return (
    code === 'PGRST205' ||
    message.includes("could not find the table 'public.homepage_prop_categories' in the schema cache") ||
    message.includes("could not find the table 'public.homepage_props' in the schema cache") ||
    (message.includes('schema cache') && message.includes('homepage_prop_categories')) ||
    (message.includes('schema cache') && message.includes('homepage_props')) ||
    message.includes('relation "public.homepage_prop_categories" does not exist') ||
    message.includes('relation "public.homepage_props" does not exist') ||
    message.includes('relation "homepage_prop_categories" does not exist') ||
    message.includes('relation "homepage_props" does not exist')
  );
};

const createEmptyHomepageCatalogSnapshot = (): HomepageCatalogSnapshot => buildHomepageCatalogSnapshot({
  categories: [],
  props: [],
});

const getDefaultCategoryDefinition = (categoryKey: string): HomepageCategoryRecord | null => {
  const normalizedKey = normalizeCategoryKey(categoryKey);
  if (!normalizedKey) return null;
  return DEFAULT_CATEGORY_DEFINITIONS.find((entry) => entry.key === normalizedKey) ?? null;
};

const getStorageResumableEndpoint = (projectUrl: string): string => {
  const parsedUrl = new URL(projectUrl);
  if (parsedUrl.hostname.endsWith('.supabase.co') && !parsedUrl.hostname.includes('.storage.')) {
    return `https://${parsedUrl.hostname.replace(/\.supabase\.co$/i, '.storage.supabase.co')}/storage/v1/upload/resumable`;
  }
  return new URL('/storage/v1/upload/resumable', parsedUrl.origin).toString();
};

const uploadPropAssetResumable = async ({
  file,
  filePath,
  accessToken,
}: {
  file: File;
  filePath: string;
  accessToken: string;
}) => {
  if (!supabaseUrl) {
    throw new Error('Supabase is not configured for asset uploads.');
  }

  const endpoint = getStorageResumableEndpoint(supabaseUrl);

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: STANDARD_UPLOAD_MAX_BYTES,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-upsert': 'true',
      },
      metadata: {
        bucketName: STORAGE_BUCKET,
        objectName: filePath,
        contentType: file.type || 'model/gltf-binary',
        cacheControl: PUBLIC_PROP_ASSET_CACHE_SECONDS,
      },
      onError: (error) => {
        reject(error);
      },
      onSuccess: () => {
        resolve();
      },
    });
    upload.start();
  });
};

export const useHomepageCatalog = ({ includeInactive = false }: { includeInactive?: boolean } = {}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<HomepageCategoryRecord[]>([]);
  const [props, setProps] = useState<HomepagePropRecord[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase && isSupabaseConfigured));
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(() => hasManagerMetadataClaims(user), [user]);
  const username = useMemo(() => getUsername(user), [user]);

  const ensureWritableManagerSession = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured for catalog publishing.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    if (!sessionData.session) {
      throw new Error('Sign in again to publish live HomepageAPP props.');
    }

    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[HomepageCatalog] Session refresh failed before publish:', refreshError.message);
    }

    const nextSession = refreshedData.session ?? sessionData.session;
    if (!nextSession?.user) {
      throw new Error('Sign in again to publish live HomepageAPP props.');
    }

    if (!hasManagerMetadataClaims(nextSession.user)) {
      throw new Error('Your current Supabase session does not have manager publish permissions yet. Sign out and sign back in, then try again.');
    }

    return nextSession;
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setCategories([]);
      setProps([]);
      setError(null);
      return createEmptyHomepageCatalogSnapshot();
    }

    setIsLoading(true);
    setError(null);

    const [categoryResult, propResult] = await Promise.all([
      supabase.from(CATEGORY_TABLE).select('*').order('sort_order', { ascending: true }),
      supabase.from(PROP_TABLE).select('*').order('label', { ascending: true }),
    ]);

    if (categoryResult.error || propResult.error) {
      if (isHomepageCatalogSchemaMissingError(categoryResult.error) || isHomepageCatalogSchemaMissingError(propResult.error)) {
        setCategories([]);
        setProps([]);
        setError(HOMEPAGE_CATALOG_SCHEMA_MESSAGE);
        setIsLoading(false);
        return createEmptyHomepageCatalogSnapshot();
      }
      const message = categoryResult.error?.message ?? propResult.error?.message ?? 'Unable to load homepage catalog.';
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }

    const nextCategories = (categoryResult.data ?? [])
      .map((entry) => mapCategoryRow(entry as HomepageCategoryRow))
      .filter((entry): entry is HomepageCategoryRecord => Boolean(entry))
      .filter((entry) => includeInactive || entry.enabled);

    const nextProps = (propResult.data ?? [])
      .map((entry) => mapPropRow(entry as HomepagePropRow))
      .filter((entry): entry is HomepagePropRecord => Boolean(entry))
      .filter((entry) => includeInactive || (entry.active && !entry.archived));

    setCategories(nextCategories);
    setProps(nextProps);
    setIsLoading(false);
    return buildHomepageCatalogSnapshot({ categories: nextCategories, props: nextProps });
  }, [includeInactive]);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        await refresh();
      } catch (loadError) {
        if (!active) return;
        console.error('[HomepageCatalog] Failed to refresh:', loadError);
      }
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const client = supabase;
    if (!client || !isSupabaseConfigured) {
      return;
    }

    const channel = client
      .channel(`homepage-live-catalog-${includeInactive ? 'admin' : 'live'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: CATEGORY_TABLE }, () => {
        void refresh().catch((loadError) => console.error('[HomepageCatalog] Category sync failed:', loadError));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: PROP_TABLE }, () => {
        void refresh().catch((loadError) => console.error('[HomepageCatalog] Prop sync failed:', loadError));
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [includeInactive, refresh]);

  const uploadPropAsset = useCallback(async (file: File) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured for asset uploads.');
    }
    if (!canManage) {
      throw new Error('Manager access is required to upload prop assets.');
    }

    const writableSession = await ensureWritableManagerSession();
    const publishUsername = getUsername(writableSession.user) || username;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? 'glb' : 'glb';
    const fileName = `${Date.now()}-${slugify(baseName || 'prop')}.${extension}`;
    const filePath = `${publishUsername || 'manager'}/${fileName}`;

    const uploadError = file.size > STANDARD_UPLOAD_MAX_BYTES
      ? await uploadPropAssetResumable({
        file,
        filePath,
        accessToken: writableSession.access_token,
      }).then(() => null).catch((error) => error)
      : await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: PUBLIC_PROP_ASSET_CACHE_SECONDS,
          upsert: true,
          contentType: file.type || 'model/gltf-binary',
        })
        .then((result) => result.error);

    if (uploadError) {
      throw new Error(getErrorMessage(uploadError, 'Unable to upload the prop asset to Supabase Storage.'));
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return {
      assetUrl: data.publicUrl,
      storagePath: filePath,
    };
  }, [canManage, ensureWritableManagerSession, username]);

  const saveCategory = useCallback(async (category: HomepageCategoryRecord) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured for catalog publishing.');
    }
    if (!canManage) {
      throw new Error('Manager access is required to publish categories.');
    }

    const writableSession = await ensureWritableManagerSession();
    const publishUsername = getUsername(writableSession.user) || username;

    const payload = {
      ...serializeCategory(category),
      updated_by_user_id: writableSession.user.id ?? user?.id ?? null,
      updated_by_username: publishUsername,
    };

    const { error: saveError } = await supabase.from(CATEGORY_TABLE).upsert(payload, { onConflict: 'key' });
    if (saveError) {
      if (isHomepageCatalogSchemaMissingError(saveError)) {
        throw new Error(HOMEPAGE_CATALOG_SCHEMA_MESSAGE);
      }
      throw new Error(getErrorMessage(saveError, 'Unable to save the live prop category.'));
    }
    return refresh();
  }, [canManage, ensureWritableManagerSession, refresh, user?.id, username]);

  const deleteCategory = useCallback(async (categoryKey: string) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured for catalog publishing.');
    }
    if (!canManage) {
      throw new Error('Manager access is required to remove categories.');
    }

    await ensureWritableManagerSession();

    const normalizedKey = normalizeCategoryKey(categoryKey);
    if (!normalizedKey) {
      throw new Error('Category key is required to remove a category.');
    }

    const { error: deleteError } = await supabase.from(CATEGORY_TABLE).delete().eq('key', normalizedKey);
    if (deleteError) {
      if (isHomepageCatalogSchemaMissingError(deleteError)) {
        throw new Error(HOMEPAGE_CATALOG_SCHEMA_MESSAGE);
      }
      throw new Error(getErrorMessage(deleteError, 'Unable to remove the live prop category.'));
    }
    return refresh();
  }, [canManage, ensureWritableManagerSession, refresh]);

  const saveProp = useCallback(async (prop: HomepagePropRecord) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured for catalog publishing.');
    }
    if (!canManage) {
      throw new Error('Manager access is required to publish props.');
    }

    const writableSession = await ensureWritableManagerSession();
    const publishUsername = getUsername(writableSession.user) || username;
    const normalizedCategoryKey = normalizeCategoryKey(prop.categoryKey);
    if (!normalizedCategoryKey) {
      throw new Error('A valid category is required before publishing this prop.');
    }

    const existingCategory = categories.find((entry) => normalizeCategoryKey(entry.key) === normalizedCategoryKey);
    const defaultCategory = getDefaultCategoryDefinition(normalizedCategoryKey);
    const categoryToPersist = existingCategory ?? defaultCategory;
    if (!categoryToPersist) {
      throw new Error(`The category "${prop.categoryKey}" does not exist in the live catalog yet. Create or save that category first, then try again.`);
    }

    const categoryPayload = {
      ...serializeCategory(categoryToPersist),
      updated_by_user_id: writableSession.user.id ?? user?.id ?? null,
      updated_by_username: publishUsername,
    };
    const { error: categorySaveError } = await supabase.from(CATEGORY_TABLE).upsert(categoryPayload, { onConflict: 'key' });
    if (categorySaveError) {
      if (isHomepageCatalogSchemaMissingError(categorySaveError)) {
        throw new Error(HOMEPAGE_CATALOG_SCHEMA_MESSAGE);
      }
      throw new Error(getErrorMessage(categorySaveError, 'Unable to prepare the live prop category.'));
    }

    const payload = serializeProp(prop, publishUsername, writableSession.user.id ?? user?.id ?? null);
    const { error: saveError } = await supabase.from(PROP_TABLE).upsert(payload, { onConflict: 'key' });
    if (saveError) {
      if (isHomepageCatalogSchemaMissingError(saveError)) {
        throw new Error(HOMEPAGE_CATALOG_SCHEMA_MESSAGE);
      }
      throw new Error(getErrorMessage(saveError, 'Unable to publish the prop to the live catalog.'));
    }
    return refresh();
  }, [canManage, categories, ensureWritableManagerSession, refresh, user?.id, username]);

  const deleteProp = useCallback(async (propKey: string, options: { storagePath?: string | null } = {}) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured for catalog publishing.');
    }
    if (!canManage) {
      throw new Error('Manager access is required to delete props.');
    }

    await ensureWritableManagerSession();

    const normalizedKey = slugify(propKey);
    if (!normalizedKey) {
      throw new Error('A valid prop key is required to delete this prop.');
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from(PROP_TABLE)
      .delete()
      .eq('key', normalizedKey)
      .select('storage_path');
    if (deleteError) {
      if (isHomepageCatalogSchemaMissingError(deleteError)) {
        throw new Error(HOMEPAGE_CATALOG_SCHEMA_MESSAGE);
      }
      throw new Error(getErrorMessage(deleteError, 'Unable to permanently delete the live prop.'));
    }

    const deletedStoragePath = Array.isArray(deletedRows) && deletedRows.length > 0 && typeof deletedRows[0]?.storage_path === 'string'
      ? deletedRows[0].storage_path.trim()
      : '';
    const storagePath = typeof options.storagePath === 'string' && options.storagePath.trim().length > 0
      ? options.storagePath.trim()
      : deletedStoragePath;
    if (storagePath) {
      const { error: storageDeleteError } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      if (storageDeleteError) {
        console.warn('[HomepageCatalog] Removed prop row but could not delete stored asset:', storageDeleteError.message);
      }
    }

    return refresh();
  }, [canManage, ensureWritableManagerSession, refresh]);

  const snapshot = useMemo<HomepageCatalogSnapshot>(() => buildHomepageCatalogSnapshot({ categories, props }), [categories, props]);

  return {
    categories,
    props,
    snapshot,
    canManage,
    isLoading,
    error,
    refresh,
    uploadPropAsset,
    deleteCategory,
    deleteProp,
    saveCategory,
    saveProp,
  };
};
