import type { MouseEvent as ReactMouseEvent } from 'react';
import type { PrecisionOption } from 'components/Graph/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

import { PieSlice } from '../types';

import { getArcGeometry } from './utils';

// Slices below this share of the total don't get a leader label (too cramped).
const MIN_LABEL_SHARE = 0.03;
const MAX_LABEL_LENGTH = 15;

interface PieArcProps {
	slice: PieSlice;
	/** SVG path `d` for the arc, from the visx pie generator. */
	arcPath: string;
	/** Arc centroid `[x, y]`, used to anchor the leader line and tooltip. */
	centroid: [number, number];
	startAngle: number;
	endAngle: number;
	radius: number;
	/** Sum of visible slice values — drives the show-label threshold. */
	totalValue: number;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	labelColor: string;
	/** Resolved fill (already dimmed if another slice is active). */
	fill: string;
	onEnter: (slice: PieSlice, centroidX: number, centroidY: number) => void;
	onLeave: () => void;
	onClick?: (slice: PieSlice, event: ReactMouseEvent) => void;
}

/**
 * A single donut slice: the arc path plus, for non-tiny slices, a leader line
 * out to an external label + value. Pure presentation — interaction is
 * delegated to the `onEnter`/`onLeave`/`onClick` callbacks.
 */
export default function PieArc({
	slice,
	arcPath,
	centroid,
	startAngle,
	endAngle,
	radius,
	totalValue,
	yAxisUnit,
	decimalPrecision,
	labelColor,
	fill,
	onEnter,
	onLeave,
	onClick,
}: PieArcProps): JSX.Element {
	const { label, value } = slice;
	const [centroidX, centroidY] = centroid;
	const { labelX, labelY, lineEndX, lineEndY, textAnchor } = getArcGeometry(
		startAngle,
		endAngle,
		radius,
	);

	const displayValue = getYAxisFormattedValue(
		value.toString(),
		yAxisUnit || 'none',
		decimalPrecision,
	);
	const shortenedLabel =
		label.length > MAX_LABEL_LENGTH ? `${label.substring(0, 12)}...` : label;
	const shouldShowLabel = value / totalValue > MIN_LABEL_SHARE;

	return (
		<g
			onMouseEnter={(): void => onEnter(slice, centroidX, centroidY)}
			onMouseLeave={onLeave}
			onClick={(event): void => onClick?.(slice, event)}
		>
			<path d={arcPath} fill={fill} />
			{shouldShowLabel && (
				<>
					<line
						x1={centroidX}
						y1={centroidY}
						x2={lineEndX}
						y2={lineEndY}
						stroke={labelColor}
						strokeWidth={1}
					/>
					<line
						x1={lineEndX}
						y1={lineEndY}
						x2={labelX}
						y2={labelY}
						stroke={labelColor}
						strokeWidth={1}
					/>
					<text
						x={labelX}
						y={labelY - 8}
						dy=".33em"
						fill={labelColor}
						fontSize={10}
						textAnchor={textAnchor}
						pointerEvents="none"
					>
						{shortenedLabel}
					</text>
					<text
						x={labelX}
						y={labelY + 8}
						dy=".33em"
						fill={labelColor}
						fontSize={10}
						fontWeight="bold"
						textAnchor={textAnchor}
						pointerEvents="none"
					>
						{displayValue}
					</text>
				</>
			)}
		</g>
	);
}
