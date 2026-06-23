import { Redirect, useParams } from 'react-router-dom';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

// Legacy /trace-old/:id now redirects to the current /trace/:id view,
// preserving the query string and hash.
export default function TraceDetailOldRedirect(): JSX.Element {
	const { id } = useParams<TraceDetailV2URLProps>();

	return (
		<Redirect
			to={{
				pathname: `/trace/${id}`,
				search: window.location.search,
				hash: window.location.hash,
			}}
		/>
	);
}
