import { CalendarClock, Coins, Landmark, Server, Timer } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';

import { formatCost, formatTokens } from '../utils/genAi';
import { TokenUsage } from '../SpanHoverCard/aiUsage';
import EntityMetadataItem from './EntityMetadataItem';
import TokenUsageTooltip from './TokenUsageTooltip';

import styles from './EntityMetadataRow.module.scss';

interface EntityMetadataRowProps {
	entity: 'trace' | 'span';
	className?: string;
	service?: { name: string; entryPoint?: string };
	durationMs?: number;
	execTimePercent?: number;
	timestamp?: string;
	statusCode?: string | number;
	tokens?: TokenUsage;
	cost?: number;
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
	tokens,
	cost,
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

			{tokens && (tokens.input > 0 || tokens.output > 0) && (
				<EntityMetadataItem
					tooltip={<TokenUsageTooltip tokens={tokens} />}
					tooltipClassName={styles.tokenTooltipContent}
					icon={<Coins size={ICON_SIZE} />}
				>
					Tokens: {formatTokens(tokens.input)} → {formatTokens(tokens.output)}
				</EntityMetadataItem>
			)}

			{cost !== undefined && (
				<EntityMetadataItem
					tooltip="Total cost"
					icon={<Landmark size={ICON_SIZE} />}
				>
					Cost — {formatCost(cost)}
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
	tokens: undefined,
	cost: undefined,
};

export default EntityMetadataRow;
