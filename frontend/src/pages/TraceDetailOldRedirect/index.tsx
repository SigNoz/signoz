import { Redirect, useParams } from 'react-router-dom';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

// Legacy /trace-old/:id now redirects to the current /trace/:id view,
// preserving the query string and hash.
export default function TraceDetailOldRedirect(): JSX.Element {
	const { id } = useParams<TraceDetailV3URLProps>();

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
