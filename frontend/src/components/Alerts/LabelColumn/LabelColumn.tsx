import { Copy } from '@signozhq/icons';
import { Badge, type BadgeColorType } from '@signozhq/ui/badge';
import { toast } from '@signozhq/ui/sonner';
import { Tooltip } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import { useLayoutEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import LabelTag from './LabelTag';

import styles from './LabelColumn.module.scss';
import { getVisibleCount } from './utils';

export interface LabelColumnProps {
	labels: string[];
	color?: BadgeColorType;
	value?: { [key: string]: string };
}

function LabelColumn({
	labels,
	value,
	color = 'primary',
}: LabelColumnProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(labels.length);
	const [, copyToClipboard] = useCopyToClipboard();

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const measure = (): void => {
			const available = container.clientWidth;
			if (available <= 0) {
				return;
			}

			const widths = Array.from(container.children)
				.slice(0, labels.length)
				.map((item) => item.getBoundingClientRect().width);
			const gap = parseFloat(getComputedStyle(container).columnGap) || 0;

			setVisibleCount(getVisibleCount(widths, available, gap));
		};

		const observer = new ResizeObserver(measure);
		observer.observe(container);
		measure();

		return (): void => observer.disconnect();
	}, [labels, value]);

	const remainingLabels = labels.slice(visibleCount);

	return (
		<div
			ref={containerRef}
			className={styles.labelColumn}
			data-testid="label-column"
		>
			{labels.map((label, index) => (
				<LabelTag
					key={label}
					label={label}
					color={color}
					value={value?.[label]}
					className={cx({
						[styles.overflowed]: index >= visibleCount,
						[styles.shrinkable]: index === 0 && visibleCount === 1,
					})}
				/>
			))}
			{remainingLabels.length > 0 && (
				<Tooltip
					side="bottom"
					align="end"
					title={
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
					}
				>
					<span>
						<Badge color={color} variant="outlined" testId="label-overflow-badge">
							+{remainingLabels.length}
						</Badge>
					</span>
				</Tooltip>
			)}
		</div>
	);
}

export default LabelColumn;
