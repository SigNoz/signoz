import { Color } from '@signozhq/design-tokens';
import { CircleX, TriangleAlert } from '@signozhq/icons';
import { Popover } from 'antd';

import PanelStatusContent from './PanelStatusContent';
import type { PanelStatusDetail, PanelStatusVariant } from './types';
import styles from './PanelStatusPopover.module.scss';

const VARIANT_CONFIG: Record<
	PanelStatusVariant,
	{ color: string; ariaLabel: string }
> = {
	error: { color: Color.BG_CHERRY_500, ariaLabel: 'Panel error' },
	warning: { color: Color.BG_AMBER_500, ariaLabel: 'Panel warning' },
};

interface PanelStatusPopoverProps {
	variant: PanelStatusVariant;
	detail: PanelStatusDetail;
}

/**
 * Header status indicator: a variant-coloured icon (error → CircleX,
 * warning → TriangleAlert) that opens a popover with the status detail. One
 * component drives both variants so error and warning surfacing stay in lockstep.
 */
function PanelStatusPopover({
	variant,
	detail,
}: PanelStatusPopoverProps): JSX.Element {
	const { color, ariaLabel } = VARIANT_CONFIG[variant];
	const Icon = variant === 'error' ? CircleX : TriangleAlert;

	return (
		<Popover
			content={<PanelStatusContent detail={detail} />}
			overlayInnerStyle={{ padding: 0 }}
			autoAdjustOverflow
		>
			{/* Wrapping span gives antd a ref-able, hoverable trigger (icon
			    components don't forward refs) and a stable testid anchor. */}
			<span
				className={styles.trigger}
				aria-label={ariaLabel}
				data-testid={`panel-status-${variant}`}
			>
				<Icon size={16} color={color} />
			</span>
		</Popover>
	);
}

export default PanelStatusPopover;
