import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { useTraceContext } from 'pages/TraceDetailsV3/contexts/TraceContext';
import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';
import { useMemo } from 'react';
import { SpanV3 } from 'types/api/trace/getTraceV3';
import { toFixed } from 'utils/toFixed';

import './SpanHoverCard.styles.scss';

/**
 * Span-level fields that the tooltip always shows (as the colored title or
 * one of the status/start/duration rows). Preview rows for these keys are
 * filtered out to avoid duplication.
 */
export const RESERVED_PREVIEW_KEYS: ReadonlySet<string> = new Set([
	'name',
	'has_error',
	'timestamp',
	'duration_nano',
]);

export interface SpanPreviewRow {
	key: string;
	value: string;
}

export interface SpanTooltipContentProps {
	spanName: string;
	color: string;
	hasError: boolean;
	relativeStartMs: number;
	durationMs: number;
	previewRows?: SpanPreviewRow[];
}

export function SpanTooltipContent({
	spanName,
	color,
	hasError,
	relativeStartMs,
	durationMs,
	previewRows,
}: SpanTooltipContentProps): JSX.Element {
	const { time: formattedDuration, timeUnitName } =
		convertTimeToRelevantUnit(durationMs);

	return (
		<div className="span-hover-card-content">
			<div className="span-hover-card-content__name" style={{ color }}>
				{spanName}
			</div>
			<div className="span-hover-card-content__row">
				status: {hasError ? 'error' : 'ok'}
			</div>
			<div className="span-hover-card-content__row">
				start: {toFixed(relativeStartMs, 2)} ms
			</div>
			<div className="span-hover-card-content__row">
				duration: {toFixed(formattedDuration, 2)} {timeUnitName}
			</div>
			{previewRows && previewRows.length > 0 && (
				<div className="span-hover-card-content__preview">
					{previewRows.map((row) => (
						<div key={row.key} className="span-hover-card-content__row">
							<span className="span-hover-card-content__preview-key">{row.key}:</span>{' '}
							<span className="span-hover-card-content__preview-value">
								{row.value}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Single hover card anchored at a fixed X (sidebar/timeline boundary). The
 * Y of the anchor is derived from the hovered span's index in the list,
 * so the card slides vertically in place rather than jumping with the cursor.
 *
 * Mount this inside the scrollable waterfall body so `anchorTop` is in
 * content coordinates — Radix portals the content layer out automatically.
 */
export interface SpanHoverCardProps {
	hoveredSpanId: string | null;
	onOpenChange: (open: boolean) => void;
	anchorLeft: number;
	rowHeight: number;
	spans: SpanV3[];
	traceStartTime: number;
}

export function SpanHoverCard({
	hoveredSpanId,
	onOpenChange,
	anchorLeft,
	rowHeight,
	spans,
	traceStartTime,
}: SpanHoverCardProps): JSX.Element {
	const { previewFields, resolveSpanColor } = useTraceContext();

	const hoverCardData = useMemo(() => {
		if (!hoveredSpanId) {
			return null;
		}
		const idx = spans.findIndex((s) => s.span_id === hoveredSpanId);
		if (idx === -1) {
			return null;
		}
		const span = spans[idx];
		const previewRows: SpanPreviewRow[] = previewFields
			.filter((f) => !RESERVED_PREVIEW_KEYS.has(f.key))
			.map((f) => {
				const value = getSpanAttribute(span, f.key);
				return value !== undefined && value !== ''
					? { key: f.key, value: String(value) }
					: null;
			})
			.filter((r): r is SpanPreviewRow => r !== null);

		return {
			anchorTop: idx * rowHeight,
			tooltip: {
				spanName: span.name,
				color: resolveSpanColor(span),
				hasError: span.has_error,
				relativeStartMs: span.timestamp - traceStartTime,
				durationMs: span.duration_nano / 1e6,
				previewRows,
			},
		};
	}, [
		hoveredSpanId,
		spans,
		previewFields,
		resolveSpanColor,
		rowHeight,
		traceStartTime,
	]);

	return (
		<TooltipProvider>
			<Tooltip open={hoverCardData !== null} onOpenChange={onOpenChange}>
				<TooltipTrigger asChild>
					<div
						className="span-hover-card-anchor"
						style={{
							top: hoverCardData?.anchorTop ?? 0,
							left: anchorLeft,
							height: rowHeight,
						}}
					/>
				</TooltipTrigger>
				<TooltipContent
					side="right"
					align="start"
					sideOffset={8}
					className="span-hover-card-popover"
				>
					{hoverCardData && <SpanTooltipContent {...hoverCardData.tooltip} />}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
