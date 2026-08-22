import { CSSProperties, memo, useMemo } from 'react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { SegmentData } from './utils/transformData';

dayjs.extend(utc);
dayjs.extend(timezone);

// ===== Constants =====

/** Offset in pixels from the cursor to the tooltip edge */
const TOOLTIP_OFFSET = 10;

/** Estimated tooltip dimensions for boundary checks */
const TOOLTIP_WIDTH = 220;
const TOOLTIP_HEIGHT = 140;

// ===== Interfaces =====

export interface StateTimelineTooltipProps {
	visible: boolean;
	x: number;
	y: number;
	segment: SegmentData | null;
	rowLabel: string;
	panelWidth: number;
	panelHeight: number;
	timezone: string;
}

// ===== Helper Functions =====

/**
 * Formats a duration in seconds to a human-readable string.
 * Examples: "5m", "1h 30m", "2d", "45s", "3d 2h"
 */
export function formatDuration(durationSeconds: number): string {
	if (durationSeconds <= 0) return '0s';

	const days = Math.floor(durationSeconds / 86400);
	const hours = Math.floor((durationSeconds % 86400) / 3600);
	const minutes = Math.floor((durationSeconds % 3600) / 60);
	const seconds = Math.floor(durationSeconds % 60);

	const parts: string[] = [];

	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds}s`);

	return parts.join(' ') || '0s';
}

/**
 * Computes tooltip position, flipping direction if it would overflow
 * the panel boundaries.
 */
export function computeTooltipPosition(
	cursorX: number,
	cursorY: number,
	panelWidth: number,
	panelHeight: number,
): { left: number; top: number } {
	let left = cursorX + TOOLTIP_OFFSET;
	let top = cursorY + TOOLTIP_OFFSET;

	// Flip horizontally if tooltip would overflow right edge
	if (left + TOOLTIP_WIDTH > panelWidth) {
		left = cursorX - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
	}

	// Flip vertically if tooltip would overflow bottom edge
	if (top + TOOLTIP_HEIGHT > panelHeight) {
		top = cursorY - TOOLTIP_HEIGHT - TOOLTIP_OFFSET;
	}

	// Ensure tooltip doesn't go beyond left/top edges
	if (left < 0) left = 0;
	if (top < 0) top = 0;

	return { left, top };
}

// ===== Component =====

function StateTimelineTooltip({
	visible,
	x,
	y,
	segment,
	rowLabel,
	panelWidth,
	panelHeight,
	timezone: tz,
}: StateTimelineTooltipProps): JSX.Element | null {
	const position = useMemo(
		() => computeTooltipPosition(x, y, panelWidth, panelHeight),
		[x, y, panelWidth, panelHeight],
	);

	const formattedTimestamp = useMemo(() => {
		if (!segment) return '';
		return dayjs(segment.startTime * 1000)
			.tz(tz)
			.format('MMM DD, YYYY HH:mm:ss');
	}, [segment, tz]);

	const duration = useMemo(() => {
		if (!segment) return '';
		return formatDuration(segment.endTime - segment.startTime);
	}, [segment]);

	if (!segment) return null;

	const containerStyle: CSSProperties = {
		position: 'absolute',
		left: `${position.left}px`,
		top: `${position.top}px`,
		zIndex: 1000,
		pointerEvents: 'none',
		opacity: visible ? 1 : 0,
		transition: 'opacity 0.1s ease-in-out',
		minWidth: '180px',
		maxWidth: '280px',
	};

	const tooltipStyle: CSSProperties = {
		background: 'var(--l2-background)',
		border: '1px solid var(--l2-border)',
		borderRadius: '6px',
		padding: '8px 12px',
		fontSize: '12px',
		fontFamily: 'Inter, sans-serif',
		color: 'var(--l2-foreground)',
		boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
		lineHeight: '1.5',
	};

	const labelStyle: CSSProperties = {
		color: 'var(--l2-muted-foreground)',
		marginRight: '4px',
	};

	const valueStyle: CSSProperties = {
		fontWeight: 500,
	};

	const rowStyle: CSSProperties = {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '2px 0',
	};

	const dividerStyle: CSSProperties = {
		width: '100%',
		height: '1px',
		backgroundColor: 'var(--l2-border)',
		margin: '4px 0',
	};

	return (
		<div style={containerStyle} data-testid="state-timeline-tooltip">
			<div style={tooltipStyle}>
				{/* Timestamp */}
				<div style={rowStyle}>
					<span style={valueStyle}>{formattedTimestamp}</span>
				</div>

				<div style={dividerStyle} />

				{/* Series Label */}
				<div style={rowStyle}>
					<span style={labelStyle}>Series:</span>
					<span style={valueStyle}>{rowLabel}</span>
				</div>

				{/* Raw Value */}
				<div style={rowStyle}>
					<span style={labelStyle}>Value:</span>
					<span style={valueStyle}>
						{segment.value !== null ? segment.value : '—'}
					</span>
				</div>

				{/* Threshold Label (if present) */}
				{segment.thresholdLabel && (
					<div style={rowStyle}>
						<span style={labelStyle}>State:</span>
						<span style={valueStyle}>{segment.thresholdLabel}</span>
					</div>
				)}

				{/* Duration */}
				<div style={rowStyle}>
					<span style={labelStyle}>Duration:</span>
					<span style={valueStyle}>{duration}</span>
				</div>
			</div>
		</div>
	);
}

export default memo(StateTimelineTooltip);
