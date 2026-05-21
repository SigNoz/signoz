import { Redirect, useParams } from 'react-router-dom';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import TraceDetailsV3 from '../TraceDetailsV3';

export default function TraceDetailV3Page(): JSX.Element {
	const { id } = useParams<TraceDetailV2URLProps>();
	const preferOld =
		getLocalStorageKey(LOCALSTORAGE.TRACE_DETAILS_PREFER_OLD_VIEW) === 'true';

	if (preferOld) {
		return (
			<Redirect
				to={{
					pathname: `/trace-old/${id}`,
					search: window.location.search,
				}}
			/>
		);
	}

	return <TraceDetailsV3 />;
}
