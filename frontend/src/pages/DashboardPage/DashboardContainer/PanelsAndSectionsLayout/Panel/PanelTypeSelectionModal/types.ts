import type { IconSize } from '@signozhq/icons';
import type { ComponentType, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
	size?: number | IconSize;
	strokeWidth?: number;
};

export interface SectionOption {
	/** The section's `layoutIndex`, stringified for the Select value. */
	value: string;
	layoutIndex: number;
	/** Section title, or "Dashboard (root)" for the untitled top-level layout. */
	label: string;
	/** Caption under the label. */
	description: string;
	/** Untitled top-level layout (has no section header). */
	isRoot: boolean;
	Icon: ComponentType<IconProps>;
}
