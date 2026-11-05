import { Popover, type PopoverHandleType } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';
import { convertTimeToRelevantUnit } from 'utils/traceUtils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTraceStore } from 'pages/TraceDetailsV3/stores/traceStore';
import { getSpanAttribute, resolveSpanColor } from 'pages/TraceDetailsV3/utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';
import { toFixed } from 'utils/toFixed';

import { getAIUsageDetails, SpanAiDetails } from '../utils/aiTraceUtils';
import SpanUsageBreakdown from './SpanUsageBreakdown';
import TraceTooltipRow from '../TraceTooltip/TraceTooltipRow';
import TraceTooltipSection from '../TraceTooltip/TraceTooltipSection';

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
				<Typography.Text
					className={styles.title}
					size="small"
					weight="normal"
					style={{ color }}
				>
					{spanName}
				</Typography.Text>
				{ai?.usage && (
					<Typography.Text size="small" weight="normal">
						Usage Breakdown
					</Typography.Text>
				)}
			</div>
			{ai?.usage && <SpanUsageBreakdown usage={ai.usage} />}
			<TraceTooltipSection>
				{ai?.model && <TraceTooltipRow label="model" value={ai.model} />}
				{ai?.toolName && <TraceTooltipRow label="tool" value={ai.toolName} />}
				{ai?.agentName && <TraceTooltipRow label="agent" value={ai.agentName} />}
				<TraceTooltipRow
					label="status"
					value={hasError ? 'error' : 'ok'}
					testId="span-hover-card-status"
				/>
				<TraceTooltipRow
					label="start"
					value={`${toFixed(relativeStartMs, 2)} ms`}
					testId="span-hover-card-start"
				/>
				<TraceTooltipRow
					label="duration"
					value={`${toFixed(formattedDuration, 2)} ${timeUnitName}`}
					testId="span-hover-card-duration"
				/>
			</TraceTooltipSection>
			{previewRows && previewRows.length > 0 && (
				<TraceTooltipSection>
					{previewRows.map((row) => (
						<TraceTooltipRow
							key={row.key}
							label={row.key}
							value={row.value}
							testId={`span-hover-card-preview-${row.key}`}
						/>
					))}
				</TraceTooltipSection>
			)}
		</div>
	);
}

export interface SpanHoverCardProps {
	handle: PopoverHandleType<SpanV3>;
	traceStartTime: number;
}

/**
 * The hover card for the waterfall: one popover serving every row.
 *
 * Driven by a handle rather than a trigger — the rows are virtualised and carry their own
 * tooltips and buttons, so making each one a trigger would both multiply the popup and swallow
 * those nested tooltips into it. A row calls `showAt(rowElement, span)` on pointer enter instead,
 * and the card moves to it and renders that span.
 *
 * A popover, not a tooltip: the card runs past the six lines a tooltip clamps to as soon as a
 * couple of preview fields are on.
 */
export function SpanHoverCard({
	handle,
	traceStartTime,
}: SpanHoverCardProps): JSX.Element {
	const previewFields = useTraceStore((s) => s.previewFields);
	const colorByFieldName = useTraceStore((s) => s.colorByField.name);
	const isDarkMode = useIsDarkMode();

	return (
		<Popover
			side="right"
			align="start"
			handle={handle}
			// The card is a preview; the pointer and the keyboard stay where they were.
			initialFocus={false}
			finalFocus={false}
			aria-label="Span preview"
		>
			{(span: SpanV3 | undefined): JSX.Element | null => {
				if (!span) {
					return null;
				}

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

				return (
					<SpanTooltipContent
						spanName={span.name}
						color={isDarkMode ? pair.color : pair.colorDark}
						hasError={span.has_error}
						relativeStartMs={span.timestamp - traceStartTime}
						durationMs={span.duration_nano / 1e6}
						previewRows={previewRows}
						ai={getAIUsageDetails(span)}
					/>
				);
			}}
		</Popover>
	);
}
