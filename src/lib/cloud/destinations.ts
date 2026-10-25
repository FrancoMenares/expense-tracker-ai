export type DestinationId = 'download' | 'link' | 'email' | 'google-sheets' | 'dropbox' | 'onedrive' | 'notion' | 'slack';
export type OAuthProviderId = 'google-sheets' | 'dropbox' | 'onedrive';

export interface DestinationSpec {
  id: DestinationId;
  name: string;
  blurb: string;
  kind: 'local' | 'share' | 'email' | 'oauth' | 'soon';
  /** Brand-ish tile colors for the provider glyph. */
  tile: string;
  /** Permissions listed on the simulated consent screen. */
  scopes?: string[];
  /** Label for the target input (recipients, folder, sheet name). */
  targetLabel?: string;
  defaultTarget?: string;
  supportsLiveSync?: boolean;
  /** Whether unattended (scheduled) runs make sense for this destination. */
  schedulable: boolean;
}

export const DESTINATIONS: Record<DestinationId, DestinationSpec> = {
  download: {
    id: 'download',
    name: 'Download',
    blurb: 'Save a file to this device',
    kind: 'local',
    tile: 'bg-slate-900 text-white',
    schedulable: false,
  },
  link: {
    id: 'link',
    name: 'Snapshot link',
    blurb: 'Shareable link & QR code, no sign-up needed',
    kind: 'share',
    tile: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white',
    schedulable: false,
  },
  email: {
    id: 'email',
    name: 'Email',
    blurb: 'Send a summary with the file attached',
    kind: 'email',
    tile: 'bg-rose-500 text-white',
    targetLabel: 'Recipients',
    schedulable: true,
  },
  'google-sheets': {
    id: 'google-sheets',
    name: 'Google Sheets',
    blurb: 'Write to a spreadsheet, optionally kept in sync',
    kind: 'oauth',
    tile: 'bg-emerald-600 text-white',
    scopes: ['Create spreadsheets in your Google Drive', 'Edit spreadsheets created by Spendwise', 'See your email address'],
    targetLabel: 'Spreadsheet',
    defaultTarget: 'Spendwise Exports',
    supportsLiveSync: true,
    schedulable: true,
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    blurb: 'Upload files to an app folder',
    kind: 'oauth',
    tile: 'bg-blue-600 text-white',
    scopes: ['Create files in /Apps/Spendwise', 'View basic account info'],
    targetLabel: 'Folder',
    defaultTarget: '/Apps/Spendwise',
    schedulable: true,
  },
  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    blurb: 'Upload files to your OneDrive',
    kind: 'oauth',
    tile: 'bg-sky-500 text-white',
    scopes: ['Create files in the Spendwise app folder', 'Read your profile'],
    targetLabel: 'Folder',
    defaultTarget: '/Apps/Spendwise',
    schedulable: true,
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    blurb: 'Sync expenses into a database',
    kind: 'soon',
    tile: 'bg-white text-slate-900 ring-1 ring-inset ring-slate-300',
    schedulable: false,
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    blurb: 'Post summaries to a channel',
    kind: 'soon',
    tile: 'bg-purple-700 text-white',
    schedulable: false,
  },
};

export const DESTINATION_IDS = Object.keys(DESTINATIONS) as DestinationId[];
export const OAUTH_PROVIDERS = DESTINATION_IDS.filter((id) => DESTINATIONS[id].kind === 'oauth') as OAuthProviderId[];

export function isOAuth(id: DestinationId): id is OAuthProviderId {
  return DESTINATIONS[id].kind === 'oauth';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function parseRecipients(target: string): string[] {
  return target
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Human-readable pipeline for the background job, shown in the activity tray. */
export function jobStages(destination: DestinationId, target: string, opts: { rows: number; encrypted?: boolean }): string[] {
  const common = ['Collecting expenses', 'Building report'];
  switch (destination) {
    case 'download':
      return [...common, 'Preparing file'];
    case 'link':
      return [...common, 'Compressing snapshot', ...(opts.encrypted ? ['Encrypting with passcode'] : []), 'Generating link'];
    case 'email': {
      const n = parseRecipients(target).length;
      return [...common, 'Attaching file', `Sending to ${n} ${n === 1 ? 'recipient' : 'recipients'}`];
    }
    case 'google-sheets':
      return [...common, `Writing ${opts.rows} rows to “${target}”`, 'Applying formatting'];
    default:
      return [...common, 'Encrypting in transit', `Uploading to ${DESTINATIONS[destination].name} ${target}`];
  }
}
