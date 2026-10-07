import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { convertTimeToRelevantUnit } from 'utils/traceUtils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTraceStore } from 'pages/TraceDetailsV3/stores/traceStore';
import { getSpanAttribute, resolveSpanColor } from 'pages/TraceDetailsV3/utils';
import { useMemo } from 'react';
import { SpanV3 } from 'types/api/trace/getTraceV3';
import { toFixed } from 'utils/toFixed';

import { getSpanAiDetails, SpanAiDetails } from './aiUsage';
import SpanUsageBreakdown from './SpanUsageBreakdown';
import TooltipRow from '../TraceTooltip/TooltipRow';
import TooltipSection from '../TraceTooltip/TooltipSection';

import styles from './SpanHoverCard.module.scss';

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
	ai?: SpanAiDetails;
}

export function SpanTooltipContent({
	spanName,
	color,
	hasError,
	relativeStartMs,
	durationMs,
	previewRows,
	ai,
}: SpanTooltipContentProps): JSX.Element {
	const { time: formattedDuration, timeUnitName } =
		convertTimeToRelevantUnit(durationMs);

	return (
		<div className={styles.content}>
			<div className={styles.header}>
				<Typography.Text className={styles.title} style={{ color }}>
					{spanName}
				</Typography.Text>
				{ai?.usage && (
					<Typography.Text size="small" weight="medium">
						Usage Breakdown
					</Typography.Text>
				)}
			</div>
			{ai?.usage && <SpanUsageBreakdown usage={ai.usage} />}
			<TooltipSection>
				{ai?.model && <TooltipRow label="model" value={ai.model} />}
				{ai?.toolName && <TooltipRow label="tool" value={ai.toolName} />}
				{ai?.agentName && <TooltipRow label="agent" value={ai.agentName} />}
				<TooltipRow label="status" value={hasError ? 'error' : 'ok'} />
				<TooltipRow label="start" value={`${toFixed(relativeStartMs, 2)} ms`} />
				<TooltipRow
					label="duration"
					value={`${toFixed(formattedDuration, 2)} ${timeUnitName}`}
				/>
			</TooltipSection>
			{previewRows && previewRows.length > 0 && (
				<TooltipSection>
					{previewRows.map((row) => (
						<TooltipRow
							key={row.key}
							label={row.key}
							value={row.value}
							testId={`span-hover-card-preview-${row.key}`}
						/>
					))}
				</TooltipSection>
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
	const previewFields = useTraceStore((s) => s.previewFields);
	const colorByFieldName = useTraceStore((s) => s.colorByField.name);
	const isDarkMode = useIsDarkMode();

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
			.filter((f) => !RESERVED_PREVIEW_KEYS.has(f.name))
			.map((f) => {
				const value = getSpanAttribute(span, f.name);
				return value !== undefined && value !== ''
					? { key: f.name, value: String(value) }
					: null;
			})
			.filter((r): r is SpanPreviewRow => r !== null);

		const pair = resolveSpanColor(span, colorByFieldName);
		return {
			anchorTop: idx * rowHeight,
			tooltip: {
				spanName: span.name,
				color: isDarkMode ? pair.color : pair.colorDark,
				hasError: span.has_error,
				relativeStartMs: span.timestamp - traceStartTime,
				durationMs: span.duration_nano / 1e6,
				previewRows,
				ai: getSpanAiDetails(span),
			},
		};
	}, [
		hoveredSpanId,
		spans,
		previewFields,
		colorByFieldName,
		rowHeight,
		traceStartTime,
		isDarkMode,
	]);

	return (
		<TooltipProvider>
			<TooltipRoot open={hoverCardData !== null} onOpenChange={onOpenChange}>
				<TooltipTrigger asChild>
					<div
						className={styles.anchor}
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
					className={styles.popover}
				>
					{hoverCardData && <SpanTooltipContent {...hoverCardData.tooltip} />}
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}
