import { Typography } from '@signozhq/ui/typography';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import styles from './TraceIdField.module.scss';

interface TraceIdFieldProps {
	span: SpanV3;
}

export function TraceIdField({ span }: TraceIdFieldProps): JSX.Element {
	return (
		<div className={styles.traceId}>
			<span className={styles.value} title={span.trace_id}>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="visible"
					testId="span-details-trace-id"
				>
					{span.trace_id}
				</Typography>
			</span>
			<CopyButton
				value={span.trace_id}
				size={12}
				ariaLabel="Copy trace ID"
				testId="span-details-copy-trace-id"
			/>
		</div>
	);
}
