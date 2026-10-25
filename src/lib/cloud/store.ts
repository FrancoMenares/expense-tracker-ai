import type { DestinationId, OAuthProviderId } from './destinations';
import type { ExportFile, FileFormat } from './files';
import type { Cadence } from './schedule';
import type { TemplateId } from './templates';

export type SyncStatus = 'synced' | 'syncing' | 'error';

export interface Connection {
  provider: OAuthProviderId;
  account: string;
  connectedAt: string;
  lastSyncAt: string | null;
  status: SyncStatus;
  /** Google Sheets only: push changes automatically when expenses change. */
  liveSync: boolean;
}

export interface ExportRequest {
  templateId: TemplateId;
  periodId: string;
  destination: DestinationId;
  /** Recipients, folder or sheet name, depending on destination. */
  target: string;
  format: FileFormat;
  message?: string;
  trigger: 'manual' | 'schedule';
  scheduleId?: string;
  share?: { expiresInDays: number | null; passcode?: string };
  /** Lets the caller track the job in the activity list before it finishes. */
  jobId?: string;
}

export interface HistoryEntry {
  id: string;
  templateId: TemplateId;
  periodId: string;
  periodLabel: string;
  destination: DestinationId;
  target: string;
  trigger: 'manual' | 'schedule';
  scheduleId?: string;
  format: FileFormat;
  status: 'succeeded' | 'failed';
  startedAt: string;
  finishedAt: string;
  recordCount: number;
  bytes: number;
  /** Exact file that was delivered, kept so it can be downloaded again. Omitted when too large. */
  file?: ExportFile;
  shareId?: string;
  error?: string;
}

export interface Schedule extends Cadence {
  id: string;
  name: string;
  templateId: TemplateId;
  destination: DestinationId;
  target: string;
  format: FileFormat;
  /** Index into the template's periods, so the window rolls forward (e.g. 1 = previous month). */
  periodIndex: number;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
}

export interface ShareRecord {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  protected: boolean;
  recordCount: number;
}

export interface CloudState {
  connections: Partial<Record<OAuthProviderId, Connection>>;
  history: HistoryEntry[];
  schedules: Schedule[];
  shares: ShareRecord[];
}

export const EMPTY_CLOUD_STATE: CloudState = { connections: {}, history: [], schedules: [], shares: [] };

const STORAGE_KEY = 'expense-tracker:cloud:v1';
export const HISTORY_LIMIT = 30;
/** Files larger than this are not retained in history to protect the localStorage quota. */
export const MAX_RETAINED_FILE_BYTES = 150 * 1024;

export function loadCloudState(): CloudState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CLOUD_STATE;
    const parsed = JSON.parse(raw) as Partial<CloudState>;
    return {
      connections: parsed.connections ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      shares: Array.isArray(parsed.shares) ? parsed.shares : [],
    };
  } catch {
    return EMPTY_CLOUD_STATE;
  }
}

export function saveCloudState(state: CloudState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded: retry without retained files rather than losing settings.
    try {
      const slim = { ...state, history: state.history.map(({ file: _file, ...rest }) => rest) };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      /* storage unavailable; state stays in memory for this session */
    }
  }
}

export { STORAGE_KEY as CLOUD_STORAGE_KEY };
