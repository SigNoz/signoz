import type { IconSize } from '@signozhq/icons';
import type { ComponentType, SVGProps } from 'react';

import type { PanelKind } from '../../../Panels/types/panelKind';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
	size?: number | IconSize;
	strokeWidth?: number;
};

export interface PanelType {
	panelKind: PanelKind;
	label: string;
	/** Icon component — the consumer renders it and controls size/color/etc. */
	Icon: ComponentType<IconProps>;
}

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
