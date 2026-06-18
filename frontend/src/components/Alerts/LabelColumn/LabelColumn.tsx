import { Copy } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { toast } from '@signozhq/ui/sonner';
import {
	TooltipContent,
	TooltipRoot,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import LabelTag from './LabelTag';

import styles from './LabelColumn.module.scss';
import { BADGE_GAP, estimateBadgeWidth, OVERFLOW_BADGE_WIDTH } from './utils';

export interface LabelColumnProps {
	labels: string[];
	color?:
		| 'primary'
		| 'secondary'
		| 'success'
		| 'error'
		| 'warning'
		| 'robin'
		| 'forest'
		| 'amber'
		| 'sienna'
		| 'cherry'
		| 'sakura'
		| 'aqua'
		| 'vanilla';
	value?: { [key: string]: string };
}

function LabelColumn({
	labels,
	value,
	color = 'primary',
}: LabelColumnProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const [maxVisibleCount, setMaxVisibleCount] = useState(labels.length);
	const [, copyToClipboard] = useCopyToClipboard();

	const calculateMaxVisible = useCallback(
		(width: number): number => {
			if (width <= 0) {
				return 1;
			}

			const availableWidth = width - OVERFLOW_BADGE_WIDTH - BADGE_GAP;
			let usedWidth = 0;
			let count = 0;

			for (const label of labels) {
				const badgeWidth = estimateBadgeWidth(label, value?.[label]) + BADGE_GAP;
				if (usedWidth + badgeWidth > availableWidth && count > 0) {
					break;
				}
				usedWidth += badgeWidth;
				count++;
			}

			return Math.max(1, count);
		},
		[labels, value],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry && entry.contentRect.width > 0) {
				setMaxVisibleCount(calculateMaxVisible(entry.contentRect.width));
			}
		});

		observer.observe(container);

		if (container.clientWidth > 0) {
			setMaxVisibleCount(calculateMaxVisible(container.clientWidth));
		}

		return (): void => observer.disconnect();
	}, [calculateMaxVisible]);

	const needsOverflow = labels.length > maxVisibleCount;
	const visibleLabels = needsOverflow
		? labels.slice(0, maxVisibleCount)
		: labels;
	const remainingLabels = needsOverflow ? labels.slice(maxVisibleCount) : [];

	return (
		<div
			ref={containerRef}
			className={styles.labelColumn}
			data-testid="label-column"
		>
			{visibleLabels.map((label) => (
				<LabelTag key={label} label={label} color={color} value={value?.[label]} />
			))}
			{remainingLabels.length > 0 && (
				<TooltipRoot>
					<TooltipTrigger asChild>
						<span>
							<Badge
								color={color}
								className={styles.overflowBadge}
								variant="outline"
								data-testid="label-overflow-badge"
							>
								+{remainingLabels.length}
							</Badge>
						</span>
					</TooltipTrigger>
					<TooltipContent side="bottom" align="end">
						<div className={styles.tooltipContent}>
							<span>
								{remainingLabels
									.map((label) => (value?.[label] ? `${label}: ${value[label]}` : label))
									.join(', ')}
							</span>
							<button
								type="button"
								className={styles.copyButton}
								onClick={(e): void => {
									e.stopPropagation();
									const searchFormat = remainingLabels
										.map((label) => (value?.[label] ? `${label} ${value[label]}` : label))
										.join(' ');
									copyToClipboard(searchFormat);
									toast.success('Copied! Use in search to filter alerts.');
								}}
								aria-label="Copy to clipboard"
							>
								<Copy size={12} />
							</button>
						</div>
					</TooltipContent>
				</TooltipRoot>
			)}
		</div>
	);
}

export default LabelColumn;
