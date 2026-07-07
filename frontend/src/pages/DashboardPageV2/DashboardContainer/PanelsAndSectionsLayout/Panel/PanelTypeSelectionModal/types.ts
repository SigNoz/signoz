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
