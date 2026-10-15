import { Popover, type PopoverHandleType } from '@signozhq/ui/popover';
import { convertTimeToRelevantUnit } from 'utils/traceUtils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTraceStore } from 'pages/TraceDetailsV3/stores/traceStore';
import { getSpanAttribute, resolveSpanColor } from 'pages/TraceDetailsV3/utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';
import { toFixed } from 'utils/toFixed';

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
		<div className={styles.content}>
			<div className={styles.name} style={{ color }}>
				{spanName}
			</div>
			<div className={styles.row}>status: {hasError ? 'error' : 'ok'}</div>
			<div className={styles.row}>start: {toFixed(relativeStartMs, 2)} ms</div>
			<div className={styles.row}>
				duration: {toFixed(formattedDuration, 2)} {timeUnitName}
			</div>
			{previewRows && previewRows.length > 0 && (
				<div className={styles.preview}>
					{previewRows.map((row) => (
						<div
							key={row.key}
							className={styles.row}
							data-testid={`span-hover-card-preview-${row.key}`}
						>
							<span className={styles.previewKey}>{row.key}:</span>{' '}
							<span className={styles.previewValue}>{row.value}</span>
						</div>
					))}
				</div>
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
			nativeButton
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
					/>
				);
			}}
		</Popover>
	);
}
