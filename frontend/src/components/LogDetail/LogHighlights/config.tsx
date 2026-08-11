import { ReactNode } from 'react';
import { Badge, BadgeColor } from '@signozhq/ui/badge';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';
import { getLogIndicatorType } from 'components/Logs/LogStateIndicator/utils';
import { ILog } from 'types/api/logs/log';

import styles from './LogHighlights.module.scss';
import TraceIdField from './TraceIdField';

// Severity badge color mirrors the LogStateIndicator bar
const SEVERITY_COLOR: Record<string, BadgeColor> = {
	[LogType.TRACE]: 'forest',
	[LogType.DEBUG]: 'aqua',
	[LogType.INFO]: 'robin',
	[LogType.WARN]: 'amber',
	[LogType.ERROR]: 'cherry',
	[LogType.FATAL]: 'sakura',
};

export interface LogHighlightConfig {
	key: string;
	label: string;
	render: (log: ILog) => ReactNode | null;
}

// Resource/attribute lookup (keys like `service.name` live in resources_string,
// occasionally attributes_string). Typed loosely as these are string maps.
const getAttr = (log: ILog, key: string): string =>
	(log.resources_string as unknown as Record<string, string>)?.[key] ||
	(log.attributes_string as unknown as Record<string, string>)?.[key] ||
	'';

const valueBadge = (
	value: string,
	options?: { prefix?: ReactNode; color?: BadgeColor },
): ReactNode => (
	<Badge color={options?.color ?? 'vanilla'} className={styles.valueBadge}>
		{options?.prefix}
		<span className={styles.badgeText} title={value}>
			{value}
		</span>
	</Badge>
);

export const LOG_HIGHLIGHTS: LogHighlightConfig[] = [
	{
		key: 'service',
		label: 'SERVICE',
		render: (log): ReactNode | null => {
			const value = getAttr(log, 'service.name');
			return value
				? valueBadge(value, {
						prefix: <span className={styles.serviceDot} />,
					})
				: null;
		},
	},
	{
		key: 'severity',
		label: 'SEVERITY',
		render: (log): ReactNode | null => {
			if (!log.severity_text) {
				return null;
			}
			return valueBadge(log.severity_text, {
				color: SEVERITY_COLOR[getLogIndicatorType(log)] ?? 'vanilla',
			});
		},
	},
	{
		key: 'namespace',
		label: 'NAMESPACE',
		render: (log): ReactNode | null => {
			const value = getAttr(log, 'service.namespace');
			return value ? valueBadge(value) : null;
		},
	},
	{
		key: 'environment',
		label: 'ENVIRONMENT',
		render: (log): ReactNode | null => {
			const value = getAttr(log, 'deployment.environment');
			return value ? valueBadge(value) : null;
		},
	},
	{
		key: 'traceId',
		label: 'TRACE ID',
		render: (log): ReactNode | null => {
			const traceId = log.trace_id || log.traceId;
			return traceId ? <TraceIdField traceId={traceId} /> : null;
		},
	},
	{
		key: 'spanId',
		label: 'SPAN ID',
		render: (log): ReactNode | null => {
			const spanId = log.span_id || log.spanID;
			return spanId ? valueBadge(spanId) : null;
		},
	},
];
