import { ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { SpanV3 } from 'types/api/trace/getTraceV3';

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
				<Badge color="vanilla">
					<span className="span-details-panel__service-dot" />
					{span['service.name']}
				</Badge>
			) : null,
	},
	{
		key: 'statusCodeString',
		label: 'STATUS CODE STRING',
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
				<Badge color="vanilla">{span.status_message}</Badge>
			) : null,
	},
];
