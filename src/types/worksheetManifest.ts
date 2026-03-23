export type WorksheetSourceKind = 'file' | 'directory';

export interface WorksheetManifestEntry {
  subjectSlug: string;
  subjectLabel: string;
  slug: string;
  title: string;
  description: string;
  launchPath: string;
  downloadPath: string;
  sourceKind: WorksheetSourceKind;
}

export interface WorksheetManifestSubject {
  slug: string;
  label: string;
  entries: WorksheetManifestEntry[];
}

export interface WorksheetManifest {
  generatedAt: string;
  subjects: WorksheetManifestSubject[];
}
