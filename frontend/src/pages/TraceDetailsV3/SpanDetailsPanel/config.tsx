import { ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';
import ExpandableValue from 'periscope/components/ExpandableValue';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import styles from './SpanSummary.module.scss';
import { TraceIdField } from './TraceIdField';

interface HighlightedOption {
	key: string;
	label: string;
	render: (span: SpanV3) => ReactNode | null;
}

export const HIGHLIGHTED_OPTIONS: HighlightedOption[] = [
	{
		key: 'service',
		label: 'SERVICE',
		render: (span): ReactNode | null =>
			span['service.name'] ? (
				<Badge color="vanilla" className={styles.serviceBadge}>
					<span className={styles.serviceDot} />
					<span className={styles.badgeEllipsisText} title={span['service.name']}>
						{span['service.name']}
					</span>
				</Badge>
			) : null,
	},
	{
		key: 'statusCode',
		label: 'STATUS CODE',
		render: (span): ReactNode | null =>
			span.status_code_string ? (
				<Badge color="vanilla">{span.status_code_string}</Badge>
			) : null,
	},
	{
		key: 'traceId',
		label: 'TRACE ID',
		render: (span): ReactNode | null =>
			span.trace_id ? <TraceIdField span={span} /> : null,
	},
	{
		key: 'spanKind',
		label: 'SPAN KIND',
		render: (span): ReactNode | null =>
			span.kind_string ? <Badge color="vanilla">{span.kind_string}</Badge> : null,
	},
	{
		key: 'statusMessage',
		label: 'STATUS MESSAGE',
		render: (span): ReactNode | null =>
			span.status_message ? (
				<ExpandableValue value={span.status_message} title="Status message">
					<Badge color="vanilla" className={styles.statusMessageBadge}>
						<span className={styles.badgeEllipsisText}>{span.status_message}</span>
					</Badge>
				</ExpandableValue>
			) : null,
	},
];
