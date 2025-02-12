import './TraceDetail.styles.scss';

import { Button, Typography } from 'antd';
import getTraceItem from 'api/trace/getTraceItem';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import TraceDetailContainer from 'container/TraceDetail';
import useUrlQuery from 'hooks/useUrlQuery';
import { Undo } from 'lucide-react';
import TraceDetailsPage from 'pages/TraceDetailV2';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { Props as TraceDetailProps } from 'types/api/trace/getTraceItem';

import { noEventMessage } from './constants';

function TraceDetail(): JSX.Element {
	const { id } = useParams<TraceDetailProps>();
	const [showNewTraceDetails, setShowNewTraceDetails] = useState<boolean>(false);
	const urlQuery = useUrlQuery();
	const { spanId, levelUp, levelDown } = useMemo(
		() => ({
			spanId: urlQuery.get('spanId'),
			levelUp: urlQuery.get('levelUp'),
			levelDown: urlQuery.get('levelDown'),
		}),
		[urlQuery],
	);

	const { data: traceDetailResponse, error, isLoading, isError } = useQuery(
		`getTraceItem/${id}`,
		() => getTraceItem({ id, spanId, levelUp, levelDown }),
		{
			cacheTime: 3000,
		},
	);

	if (showNewTraceDetails) {
		return <TraceDetailsPage />;
	}

	if (traceDetailResponse?.error || error || isError) {
		return (
			<Typography>
				{traceDetailResponse?.error || 'Something went wrong'}
			</Typography>
		);
	}

	if (isLoading || !(traceDetailResponse && traceDetailResponse.payload)) {
		return <Spinner tip="Loading.." />;
	}

	if (traceDetailResponse.payload[0].events.length === 0) {
		return <NotFound text={noEventMessage} />;
	}

	return (
		<div className="old-trace-container">
			<div className="top-header">
				<Button
					onClick={(): void => setShowNewTraceDetails(true)}
					icon={<Undo size={14} />}
					type="text"
					className="new-cta-btn"
				>
					New Trace Detail
				</Button>
			</div>
			<TraceDetailContainer response={traceDetailResponse.payload} />;
		</div>
	);
}

export default TraceDetail;
