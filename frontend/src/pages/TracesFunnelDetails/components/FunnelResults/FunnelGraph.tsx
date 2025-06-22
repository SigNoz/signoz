import './FunnelGraph.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Empty, Spin } from 'antd';
import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Legend,
	LinearScale,
	Title,
} from 'chart.js';
import cx from 'classnames';
import Spinner from 'components/Spinner';
import useFunnelGraph from 'hooks/TracesFunnels/useFunnelGraph';
import { useFunnelStepsGraphData } from 'hooks/TracesFunnels/useFunnels';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useCallback, useMemo, useState } from 'react';

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
	const { funnelId, startTime, endTime, steps } = useFunnelContext();

	const payload = {
		start_time: startTime,
		end_time: endTime,
		steps,
	};

	const {
		data: stepsData,
		isLoading,
		isFetching,
		isError,
	} = useFunnelStepsGraphData(funnelId, payload);

	const data = useMemo(() => stepsData?.payload?.data?.[0]?.data, [
		stepsData?.payload?.data,
	]);

	const [hoveredBar, setHoveredBar] = useState<{
		index: number;
		type: 'total' | 'error';
	} | null>(null);

	const {
		successSteps,
		errorSteps,
		totalSteps,
		canvasRef,
		renderLegendItem,
	} = useFunnelGraph({
		data,
		hoveredBar,
	});

	const handleLegendHover = useCallback(
		(index: number, type: 'total' | 'error') => {
			const hover = { index, type };
			setHoveredBar(hover);
		},
		[setHoveredBar],
	);

	const handleLegendLeave = useCallback(() => {
		setHoveredBar(null);
	}, [setHoveredBar]);

	if (isLoading) {
		return (
			<div className="funnel-graph">
				<Spinner size="default" />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="funnel-graph">
				<Empty description="No data" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="funnel-graph">
				<Empty description="Error fetching data. If the problem persists, please contact support." />
			</div>
		);
	}

	return (
		<Spin spinning={isFetching} indicator={<LoadingOutlined spin />}>
			<div className={cx('funnel-graph', `funnel-graph--${totalSteps}-columns`)}>
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
							{
								onTotalHover: () => handleLegendHover(index, 'total'),
								onErrorHover: () => handleLegendHover(index, 'error'),
								onLegendLeave: handleLegendLeave,
							},
						);
					})}
				</div>
			</div>
		</Spin>
	);
}

export default FunnelGraph;
