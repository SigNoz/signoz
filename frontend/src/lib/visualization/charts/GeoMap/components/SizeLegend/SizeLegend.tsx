import { getSizeLegendSteps } from '../../utils/scales';

import styles from './SizeLegend.module.scss';

interface SizeLegendProps {
	label: string;
	maxSize: number;
	radiusFor: (size: number) => number;
	formatValue: (value: number) => string;
	/** Label above the circles instead of beside them, for a narrow column. */
	stacked?: boolean;
}

const LABEL_GAP = 6;
const LABEL_WIDTH = 56;
// Room above the outer circle for half its label's height.
const LABEL_HEADROOM = 6;

/**
 * Nested reference circles at the map's own scale, bottom-aligned, each
 * labelled at its top: the usual way to read proportional symbols.
 */
export default function SizeLegend({
	label,
	maxSize,
	radiusFor,
	formatValue,
	stacked = false,
}: SizeLegendProps): JSX.Element | null {
	const steps = getSizeLegendSteps(maxSize);
	if (steps.length === 0) {
		return null;
	}
	const outer = radiusFor(steps[0]);
	const height = outer * 2 + 2 + LABEL_HEADROOM;
	const centerX = outer + 1;

	return (
		<div
			className={styles.legend}
			data-stacked={stacked}
			data-testid="geo-map-size-legend"
		>
			<span className={styles.label}>{label}</span>
			<svg
				width={centerX * 2 + LABEL_GAP + LABEL_WIDTH}
				height={height}
				aria-hidden="true"
			>
				{steps.map((size) => {
					const radius = radiusFor(size);
					const top = height - 1 - radius * 2;
					return (
						<g key={size}>
							<circle
								className={styles.circle}
								cx={centerX}
								cy={height - 1 - radius}
								r={radius}
							/>
							<line
								className={styles.tick}
								x1={centerX}
								x2={centerX * 2 + LABEL_GAP - 2}
								y1={top}
								y2={top}
							/>
							<text
								className={styles.value}
								x={centerX * 2 + LABEL_GAP}
								y={top}
								dominantBaseline="middle"
							>
								{formatValue(size)}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
