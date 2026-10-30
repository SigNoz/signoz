import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { toast } from '@signozhq/ui/sonner';
import { SpanV3 } from 'types/api/trace/getTraceV3';

interface TraceIdFieldProps {
	span: SpanV3;
}

/** Renders a span's trace id; clicking it copies the id. */
export function TraceIdField({ span }: TraceIdFieldProps): JSX.Element {
	const [, setCopy] = useCopyToClipboard();

	const handleCopy = (): void => {
		setCopy(span.trace_id);
		toast.success('Trace ID copied to clipboard', {
			position: 'top-right',
		});
	};

	return (
		<Tooltip title="Click to copy trace ID">
			<Button
				size="md"
				variant="link"
				color="secondary"
				maxWidth="100%"
				onClick={handleCopy}
				testId="span-details-trace-id"
			>
				{span.trace_id}
			</Button>
		</Tooltip>
	);
}
