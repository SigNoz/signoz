import type { ReactNode } from 'react';
import type { TableProps } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import type {
	FormatTimezoneAdjustedTimestamp,
	TimestampInput,
} from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { coerceToString } from 'utils/stringUtils';

import type { RawTableRow } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareRawTable';

type ListColumns = NonNullable<TableProps<RawTableRow>['columns']>;

const TIMESTAMP_COLUMN = 'timestamp';
const BODY_COLUMN = 'body';
// Seed widths mirror V1; the resize hook treats these as the per-column default.
const TIMESTAMP_WIDTH = 180;
const TRACE_COLUMN_WIDTH = 145;
const TRACE_CLAMP_LINES = 3;

// V1 trace columns that render as a coloured tag / formatted duration.
const HTTP_FIELDS = new Set([
	'httpMethod',
	'http_method',
	'responseStatusCode',
	'response_status_code',
]);
const DURATION_FIELDS = new Set(['durationNano', 'duration_nano']);

function renderCell(value: unknown): ReactNode {
	return <Typography.Text>{coerceToString(value)}</Typography.Text>;
}

/**
 * Scale an epoch integer to milliseconds (what dayjs expects) by its magnitude:
 * logs/traces carry nanoseconds, but be tolerant of µs/ms/s too.
 */
function epochToMillis(n: number): number {
	if (n >= 1e18) {
		return Math.floor(n / 1e6); // nanoseconds
	}
	if (n >= 1e15) {
		return Math.floor(n / 1e3); // microseconds
	}
	if (n >= 1e12) {
		return n; // milliseconds
	}
	if (n >= 1e9) {
		return n * 1e3; // seconds
	}
	return n;
}

/**
 * The timestamp can arrive as an ISO string or a bare epoch (ns/µs/ms/s) — return
 * something `dayjs` parses correctly, or null when there's nothing to show.
 */
function normalizeTimestamp(value: unknown): TimestampInput | null {
	if (value == null) {
		return null;
	}
	if (value instanceof Date || typeof value === 'number') {
		return typeof value === 'number' ? epochToMillis(value) : value;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') {
			return null;
		}
		// All-digits → numeric epoch (string form, e.g. nanoseconds); else ISO.
		return /^\d+$/.test(trimmed) ? epochToMillis(Number(trimmed)) : trimmed;
	}
	return null;
}

/** Timestamp cell: normalize the epoch/ISO value then format in the user's timezone (V1 parity). */
function makeTimestampRenderer(
	formatTimestamp: FormatTimezoneAdjustedTimestamp,
) {
	return (value: unknown): ReactNode => {
		const normalized = normalizeTimestamp(value);
		return (
			<Typography.Text>
				{normalized == null
					? ''
					: formatTimestamp(normalized, DATE_TIME_FORMATS.ISO_DATETIME_MS)}
			</Typography.Text>
		);
	};
}

/**
 * Trace attribute cell: empty → N/A, http verb/status → tag, duration → ms,
 * everything else → a 3-line-clamped value (V1 `getListColumns`).
 */
function makeTraceRenderer(name: string) {
	return (value: unknown): ReactNode => {
		if (value == null || value === '') {
			return <Typography.Text data-testid={name}>N/A</Typography.Text>;
		}
		if (HTTP_FIELDS.has(name)) {
			return (
				<Badge color="sakura" variant="outline" data-testid={name}>
					{coerceToString(value)}
				</Badge>
			);
		}
		if (DURATION_FIELDS.has(name)) {
			return (
				<Typography.Text data-testid={name}>
					{getMs(coerceToString(value))}ms
				</Typography.Text>
			);
		}
		return (
			<LineClampedText text={coerceToString(value)} lines={TRACE_CLAMP_LINES} />
		);
	};
}

export interface BuildListColumnsArgs {
	/** Prepared column ids in render order (timestamp first when present). */
	columns: string[];
	/** Panel telemetry signal — picks log vs trace cell rendering. */
	signal: TelemetrytypesSignalDTO | undefined;
	/** Timezone-aware timestamp formatter from `useTimezone`. */
	formatTimestamp: FormatTimezoneAdjustedTimestamp;
}

/**
 * Builds antd columns for the List panel, rendering cells per the panel's signal
 * (V1 parity): the `timestamp` column is timezone-formatted for every signal;
 * traces add tag/duration/clamp rendering; logs widen + ellipsis-truncate `body`.
 * Each id is both the title and the `dataIndex` into the flattened row.
 */
export function buildListColumns({
	columns,
	signal,
	formatTimestamp,
}: BuildListColumnsArgs): ListColumns {
	const isTraces = signal === TelemetrytypesSignalDTO.traces;
	const renderTimestamp = makeTimestampRenderer(formatTimestamp);

	return columns.map((name) => {
		if (name === TIMESTAMP_COLUMN) {
			return {
				title: 'Timestamp',
				dataIndex: name,
				key: name,
				width: TIMESTAMP_WIDTH,
				render: renderTimestamp,
			};
		}
		if (isTraces) {
			return {
				title: name,
				dataIndex: name,
				key: name,
				width: TRACE_COLUMN_WIDTH,
				render: makeTraceRenderer(name),
			};
		}
		if (name === BODY_COLUMN) {
			// No fixed width: `body` is the flex column (see the renderer's
			// `flexColumns`), absorbing the remaining table width and truncating.
			return {
				title: name,
				dataIndex: name,
				key: name,
				ellipsis: true,
				render: renderCell,
			};
		}
		return {
			title: name,
			dataIndex: name,
			key: name,
			ellipsis: true,
			render: renderCell,
		};
	});
}
