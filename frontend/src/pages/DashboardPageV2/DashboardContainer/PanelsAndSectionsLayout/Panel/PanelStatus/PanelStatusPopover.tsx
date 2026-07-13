import { Color } from '@signozhq/design-tokens';
import { CircleX, TriangleAlert } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

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
 * Header status indicator: an icon that opens a tooltip with the status detail.
 * One component drives both variants so error and warning stay in lockstep.
 */
function PanelStatusPopover({
	variant,
	detail,
}: PanelStatusPopoverProps): JSX.Element {
	const { color, ariaLabel } = VARIANT_CONFIG[variant];
	const Icon = variant === 'error' ? CircleX : TriangleAlert;

	return (
		<TooltipSimple
			title={<PanelStatusContent variant={variant} detail={detail} />}
			side="top"
			align="end"
			arrow
			tooltipContentProps={{ className: styles.tooltipContent }}
		>
			<span
				className={styles.trigger}
				aria-label={ariaLabel}
				data-testid={`panel-status-${variant}`}
			>
				<Icon size={16} color={color} />
			</span>
		</TooltipSimple>
	);
}

export default PanelStatusPopover;
