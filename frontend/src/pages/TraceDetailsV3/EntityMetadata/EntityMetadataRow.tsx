import { CalendarClock, Server, Timer } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';

import EntityMetadataItem from './EntityMetadataItem';

import styles from './EntityMetadataRow.module.scss';

interface EntityMetadataRowProps {
	entity: 'trace' | 'span';
	className?: string;
	service?: { name: string; entryPoint?: string };
	durationMs?: number;
	execTimePercent?: number;
	timestamp?: string;
	statusCode?: string | number;
}

const ICON_SIZE = 14;

// Shared metadata row for the trace-details header and the span summary. Each
// node renders only when its data is provided; hovering shows a tooltip naming
// the value and keeps the default cursor. Interactive bits (e.g. linked spans)
// are intentionally kept out of here and rendered by the caller.
function EntityMetadataRow({
	entity,
	className,
	service,
	durationMs,
	execTimePercent,
	timestamp,
	statusCode,
}: EntityMetadataRowProps): JSX.Element {
	const entityLabel = entity === 'trace' ? 'Trace' : 'Span';
	const durationTooltip =
		entity === 'trace' ? 'Trace Duration' : 'Span Duration';
	// Single source of duration formatting so both rows label units identically.
	const duration =
		durationMs != null
			? getYAxisFormattedValue(`${durationMs}`, 'ms')
			: undefined;

	return (
		<div className={cx(styles.row, className)}>
			{service && (
				<EntityMetadataItem
					tooltip="Root service and entry-point span"
					icon={<Server size={ICON_SIZE} />}
				>
					{service.name}
					{service.entryPoint && (
						<>
							{' — '}
							<Badge color="secondary" variant="outline">
								{service.entryPoint}
							</Badge>
						</>
					)}
				</EntityMetadataItem>
			)}

			{duration && (
				<EntityMetadataItem
					tooltip={durationTooltip}
					icon={<Timer size={ICON_SIZE} />}
				>
					{duration}
					{execTimePercent != null && (
						<>
							{' — '}
							<strong>{execTimePercent.toFixed(2)}%</strong>
							{' of total exec time'}
						</>
					)}
				</EntityMetadataItem>
			)}

			{timestamp && (
				<EntityMetadataItem
					tooltip={`${entityLabel} start time`}
					icon={<CalendarClock size={ICON_SIZE} />}
				>
					{timestamp}
				</EntityMetadataItem>
			)}

			{statusCode && (
				<EntityMetadataItem tooltip="Root span status code">
					<HttpStatusBadge statusCode={statusCode} />
				</EntityMetadataItem>
			)}
		</div>
	);
}

EntityMetadataRow.defaultProps = {
	className: undefined,
	service: undefined,
	durationMs: undefined,
	execTimePercent: undefined,
	timestamp: undefined,
	statusCode: undefined,
};

export default EntityMetadataRow;
