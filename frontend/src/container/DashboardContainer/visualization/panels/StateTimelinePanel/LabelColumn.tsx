import { CSSProperties, memo, useEffect, useRef, useMemo } from 'react';

export interface LabelColumnProps {
	labels: string[];
	rowHeight: number;
	scrollTop: number;
	maxWidth: number; // 200px cap
	visible: boolean; // from legendPosition
}

const PADDING = 8; // 8px on each side

/**
 * Measures the maximum text width of the given labels using an offscreen canvas.
 * Returns the pixel width of the longest label.
 */
function measureMaxLabelWidth(labels: string[], font: string): number {
	if (labels.length === 0) return 0;

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return 0;

	ctx.font = font;

	let maxWidth = 0;
	for (const label of labels) {
		const metrics = ctx.measureText(label);
		if (metrics.width > maxWidth) {
			maxWidth = metrics.width;
		}
	}

	return maxWidth;
}

/**
 * Computes the column width based on measured label widths.
 * Formula: min(maxLabelWidth + padding, maxWidth)
 */
export function computeColumnWidth(
	labels: string[],
	maxWidth: number,
	font: string,
): number {
	const measuredWidth = measureMaxLabelWidth(labels, font);
	return Math.min(measuredWidth + PADDING * 2, maxWidth);
}

/**
 * LabelColumn renders a vertical list of labels aligned with swim-lane rows.
 * - Measures text width to determine column width: min(maxLabelWidth + padding, 200)px
 * - Truncates labels exceeding column width with CSS text-overflow: ellipsis
 * - Synchronizes scroll position with the swim-lane container via scrollTop prop
 * - When visible is false, renders nothing
 */
function LabelColumn({
	labels,
	rowHeight,
	scrollTop,
	maxWidth,
	visible,
}: LabelColumnProps): JSX.Element | null {
	const containerRef = useRef<HTMLDivElement>(null);

	// Default font matching typical SigNoz UI
	const font = '12px Inter, sans-serif';

	const columnWidth = useMemo(
		() => computeColumnWidth(labels, maxWidth, font),
		[labels, maxWidth, font],
	);

	// Synchronize scroll position with the swim-lane container
	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = scrollTop;
		}
	}, [scrollTop]);

	if (!visible) {
		return null;
	}

	const containerStyle: CSSProperties = {
		width: `${columnWidth}px`,
		overflow: 'hidden',
		flexShrink: 0,
		backgroundColor: '#181b1f',
	};

	const labelStyle: CSSProperties = {
		height: `${rowHeight}px`,
		lineHeight: `${rowHeight}px`,
		paddingLeft: `${PADDING}px`,
		paddingRight: `${PADDING + 4}px`,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: '13px',
		fontFamily: 'Inter, sans-serif',
		textAlign: 'right',
		borderBottom: '2px solid #181b1f',
		color: '#c8ccd4',
	};

	return (
		<div ref={containerRef} style={containerStyle}>
			{labels.map((label, index) => (
				<div
					// eslint-disable-next-line react/no-array-index-key
					key={index}
					style={labelStyle}
					title={label}
				>
					{label}
				</div>
			))}
		</div>
	);
}

export default memo(LabelColumn);
