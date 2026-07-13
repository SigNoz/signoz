import { useCallback, type ReactNode, type MouseEvent } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { toast } from '@signozhq/ui/sonner';
import { Copy, Minus, Plus } from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';

import { useInfraMonitoringCellActionsStore } from './useInfraMonitoringCellActionsStore';

import styles from './CellValueTooltip.module.scss';
import { Divider } from '@signozhq/ui/divider';

export interface CellValueTooltipProps {
	value: string;
	children: ReactNode;
}

export function CellValueTooltip({
	value,
	children,
}: CellValueTooltipProps): JSX.Element {
	const [, copyToClipboard] = useCopyToClipboard();
	const { lineClamp, increaseLineClamp, decreaseLineClamp } =
		useInfraMonitoringCellActionsStore();

	const handleCopy = useCallback(
		(e: MouseEvent): void => {
			e.stopPropagation();
			copyToClipboard(value);
			toast.success('Copied to clipboard');
		},
		[copyToClipboard, value],
	);

	const handleIncreaseLineClamp = useCallback(
		(e: MouseEvent): void => {
			e.stopPropagation();
			increaseLineClamp();
		},
		[increaseLineClamp],
	);

	const handleDecreaseLineClamp = useCallback(
		(e: MouseEvent): void => {
			e.stopPropagation();
			decreaseLineClamp();
		},
		[decreaseLineClamp],
	);

	const tooltipContent = (
		<div className={styles.tooltipContent}>
			<div className={styles.actions}>
				<button
					type="button"
					className={styles.actionButton}
					onClick={handleDecreaseLineClamp}
					disabled={lineClamp <= 1}
					data-testid="cell-value-decrease-line-height"
					title="Decrease line height"
				>
					<Minus size={14} />
				</button>
				<button
					type="button"
					className={styles.actionButton}
					onClick={handleIncreaseLineClamp}
					disabled={lineClamp >= 10}
					data-testid="cell-value-increase-line-height"
					title="Increase line height"
				>
					<Plus size={14} />
				</button>

				<Divider type="vertical" className={styles.divider} />

				<button
					type="button"
					className={styles.actionButton}
					onClick={handleCopy}
					data-testid="cell-value-copy"
					title="Copy value"
				>
					<Copy size={14} />
				</button>
			</div>
		</div>
	);

	return (
		<TooltipSimple
			title={tooltipContent}
			arrow
			tooltipContentProps={{
				className: styles.tooltipContentWrapper,
			}}
		>
			{children}
		</TooltipSimple>
	);
}
