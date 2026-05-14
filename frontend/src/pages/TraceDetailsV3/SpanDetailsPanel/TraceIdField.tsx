import { Link, useRouteMatch } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import ROUTES from 'constants/routes';
import { SpanV3 } from 'types/api/trace/getTraceV3';

interface TraceIdFieldProps {
	span: SpanV3;
}

/**
 * Renders a span's trace id. When the user is already on the trace detail
 * page for this trace, clicking the id copies it to the clipboard (the
 * "navigate" affordance would be a no-op). Otherwise, falls back to the
 * existing link to the trace detail page.
 */
export function TraceIdField({ span }: TraceIdFieldProps): JSX.Element {
	const match = useRouteMatch<{ id: string }>({
		path: ROUTES.TRACE_DETAIL,
		exact: true,
	});
	const [, setCopy] = useCopyToClipboard();

	const isCurrentTrace = match?.params.id === span.trace_id;

	if (isCurrentTrace) {
		const handleCopy = (): void => {
			setCopy(span.trace_id);
			toast.success('Trace ID copied to clipboard', {
				position: 'top-right',
			});
		};

		return (
			<Button
				variant="link"
				color="secondary"
				className="span-details-panel__trace-id-copy"
				onClick={handleCopy}
				title="Click to copy trace ID"
			>
				{span.trace_id}
			</Button>
		);
	}

	return (
		<Link
			to={{
				pathname: `/trace/${span.trace_id}`,
				search: window.location.search,
			}}
			className="span-details-panel__trace-id"
		>
			{span.trace_id}
		</Link>
	);
}
