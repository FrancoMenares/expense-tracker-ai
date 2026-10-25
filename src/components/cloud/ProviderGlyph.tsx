import type { ComponentType, SVGProps } from 'react';
import { DESTINATIONS, type DestinationId } from '@/lib/cloud/destinations';
import { BoxIcon, CloudIcon, DownloadIcon, GridIcon, HashIcon, LinkIcon, MailIcon } from '../icons';

const GLYPHS: Record<DestinationId, ComponentType<SVGProps<SVGSVGElement>>> = {
  download: DownloadIcon,
  link: LinkIcon,
  email: MailIcon,
  'google-sheets': GridIcon,
  dropbox: BoxIcon,
  onedrive: CloudIcon,
  notion: ({ className }) => (
    <span className={`flex items-center justify-center font-serif font-bold ${className}`} aria-hidden="true">
      N
    </span>
  ),
  slack: HashIcon,
};

const SIZES = {
  sm: { tile: 'h-7 w-7 rounded-lg', icon: 'h-4 w-4 text-sm' },
  md: { tile: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5 text-lg' },
  lg: { tile: 'h-12 w-12 rounded-2xl', icon: 'h-6 w-6 text-xl' },
};

export default function ProviderGlyph({ id, size = 'md' }: { id: DestinationId; size?: keyof typeof SIZES }) {
  const Glyph = GLYPHS[id];
  return (
    <span className={`inline-flex flex-shrink-0 items-center justify-center shadow-sm ${SIZES[size].tile} ${DESTINATIONS[id].tile}`}>
      <Glyph className={SIZES[size].icon} />
    </span>
  );
}
