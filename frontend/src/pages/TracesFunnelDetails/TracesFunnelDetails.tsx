import './TracesFunnelDetails.styles.scss';

import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import { NotFoundContainer } from 'container/GridCardLayout/GridCard/FullView/styles';
import { useFunnelDetails } from 'hooks/TracesFunnels/useFunnels';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import FunnelConfiguration from './components/FunnelConfiguration/FunnelConfiguration';
import FunnelResults from './components/FunnelResults/FunnelResults';

function TracesFunnelDetails(): JSX.Element {
	const [validTracesCount, setValidTracesCount] = useState(0);
	const { funnelId } = useParams<{ funnelId: string }>();
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { start: startTime, end: endTime } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: selectedTime,
	});
	const { data, isLoading, isError } = useFunnelDetails({ funnelId });

	if (isLoading || !data?.payload) {
		return <Spinner size="large" tip="Loading..." />;
	}

	if (isError) {
		return (
			<NotFoundContainer>
				<Typography>Error loading funnel details</Typography>
			</NotFoundContainer>
		);
	}

	return (
		<div className="traces-funnel-details">
			<div className="traces-funnel-details__steps-config">
				<FunnelConfiguration
					funnel={data.payload}
					validTracesCount={validTracesCount}
					setValidTracesCount={setValidTracesCount}
				/>
			</div>
			<div className="traces-funnel-details__steps-results">
				<FunnelResults
					funnel={data.payload}
					startTime={startTime}
					endTime={endTime}
				/>
			</div>
		</div>
	);
}

export default TracesFunnelDetails;
