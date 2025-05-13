import './TracesFunnelDetails.styles.scss';

import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import { NotFoundContainer } from 'container/GridCardLayout/GridCard/FullView/styles';
import { useFunnelDetails } from 'hooks/TracesFunnels/useFunnels';
import { FunnelProvider } from 'pages/TracesFunnels/FunnelContext';
import { useParams } from 'react-router-dom';

import FunnelConfiguration from './components/FunnelConfiguration/FunnelConfiguration';
import FunnelResults from './components/FunnelResults/FunnelResults';

function TracesFunnelDetails(): JSX.Element {
	const { funnelId } = useParams<{ funnelId: string }>();
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
		<FunnelProvider funnelId={funnelId}>
			<div className="traces-funnel-details">
				<div className="traces-funnel-details__steps-config">
					<FunnelConfiguration funnel={data.payload} />
				</div>
				<div className="traces-funnel-details__steps-results">
					<FunnelResults />
				</div>
			</div>
		</FunnelProvider>
	);
}

export default TracesFunnelDetails;
