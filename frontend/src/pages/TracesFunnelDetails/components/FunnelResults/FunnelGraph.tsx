import './FunnelGraph.styles.scss';

import { Empty } from 'antd';
import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Legend,
	LinearScale,
	Title,
} from 'chart.js';
import Spinner from 'components/Spinner';
import { NotFoundContainer } from 'container/GridCardLayout/GridCard/FullView/styles';
import useFunnelGraph from 'hooks/TracesFunnels/useFunnelGraph';
import { useFunnelStepsGraphData } from 'hooks/TracesFunnels/useFunnels';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo } from 'react';

// Register required components
Chart.register(
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	Legend,
	Title,
);

function FunnelGraph(): JSX.Element {
	const { funnelId } = useFunnelContext();
	const { data: stepsData, isLoading, isError } = useFunnelStepsGraphData(
		funnelId,
	);

	const data = useMemo(() => stepsData?.payload?.data?.[0]?.data, [
		stepsData?.payload?.data,
	]);

	const {
		successSteps,
		errorSteps,
		totalSteps,
		canvasRef,
		renderLegendItem,
	} = useFunnelGraph({ data });

	if (isLoading)
		return (
			<div className="funnel-graph">
				<Spinner size="default" />
			</div>
		);

	if (!data) {
		return <NotFoundContainer>No data available</NotFoundContainer>;
	}

	if (isError) {
		return (
			<Empty description="Error fetching data. If the problem persists, please contact support." />
		);
	}

	return (
		<div className="funnel-graph">
			<div className="funnel-graph__chart-container">
				<canvas ref={canvasRef} />
			</div>
			<div className="funnel-graph__legends">
				{Array.from({ length: totalSteps }, (_, index) => {
					const prevTotalSpans =
						index > 0
							? successSteps[index - 1] + errorSteps[index - 1]
							: successSteps[0] + errorSteps[0];

					return renderLegendItem(
						index + 1,
						successSteps[index],
						errorSteps[index],
						prevTotalSpans,
					);
				})}
			</div>
		</div>
	);
}

export default FunnelGraph;
