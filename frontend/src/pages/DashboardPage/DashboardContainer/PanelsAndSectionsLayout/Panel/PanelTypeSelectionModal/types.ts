import type { IconSize } from '@signozhq/icons';
import type { ComponentType, SVGProps } from 'react';

import type { NewPanelTarget } from '../../../patchOps';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
	size?: number | IconSize;
	strokeWidth?: number;
};

export interface SectionOption {
	/** `layoutIndex` stringified, or "root" for a root yet to be created. */
	value: string;
	target: NewPanelTarget;
	/** Section title, or "Dashboard (root)" for the untitled top-level layout. */
	label: string;
	/** Caption under the label. */
	description: string;
	/** Untitled top-level layout (has no section header). */
	isRoot: boolean;
	Icon: ComponentType<IconProps>;
}
