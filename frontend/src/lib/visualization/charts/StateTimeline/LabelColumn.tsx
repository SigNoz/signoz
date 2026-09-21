import { CSSProperties, memo, useEffect, useMemo, useRef } from 'react';

export interface LabelColumnProps {
	labels: string[];
	rowHeight: number;
	scrollTop: number;
	/** Column width cap in pixels. */
	maxWidth: number;
	/** Derived from legend position. */
	visible: boolean;
}

/** Horizontal padding on each side of a label. */
const PADDING = 8;

/** Measures the widest label using an offscreen canvas. */
function measureMaxLabelWidth(labels: string[], font: string): number {
	if (labels.length === 0) {
		return 0;
	}
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return 0;
	}
	ctx.font = font;

	let maxWidth = 0;
	for (const label of labels) {
		const { width } = ctx.measureText(label);
		if (width > maxWidth) {
			maxWidth = width;
		}
	}
	return maxWidth;
}

/** Column width: `min(maxLabelWidth + padding, maxWidth)`. */
export function computeColumnWidth(
	labels: string[],
	maxWidth: number,
	font: string,
): number {
	return Math.min(measureMaxLabelWidth(labels, font) + PADDING * 2, maxWidth);
}

/**
 * Vertical list of labels aligned with swim-lane rows. Measures text to size the
 * column, truncates overflow with ellipsis, mirrors the swim-lane scroll
 * position, and renders nothing when hidden.
 */
function LabelColumn({
	labels,
	rowHeight,
	scrollTop,
	maxWidth,
	visible,
}: LabelColumnProps): JSX.Element | null {
	const containerRef = useRef<HTMLDivElement>(null);
	const font = '12px Inter, sans-serif';

	const columnWidth = useMemo(
		() => computeColumnWidth(labels, maxWidth, font),
		[labels, maxWidth, font],
	);

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
		<div
			ref={containerRef}
			style={containerStyle}
			data-testid="state-timeline-labels"
		>
			{labels.map((label) => (
				<div key={label} style={labelStyle} title={label}>
					{label}
				</div>
			))}
		</div>
	);
}

export default memo(LabelColumn);
