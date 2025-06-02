import { useFunnelStepsMetrics } from 'hooks/TracesFunnels/useFunnelMetrics';
import { useParams } from 'react-router-dom';

import FunnelMetricsTable from './FunnelMetricsTable';
import { StepTransition } from './StepsTransitionResults';

interface StepsTransitionMetricsProps {
	selectedTransition: string;
	transitions: StepTransition[];
	startStep?: number;
	endStep?: number;
}

function StepsTransitionMetrics({
	selectedTransition,
	transitions,
	startStep,
	endStep,
}: StepsTransitionMetricsProps): JSX.Element {
	const { funnelId } = useParams<{ funnelId: string }>();
	const currentTransition = transitions.find(
		(transition) => transition.value === selectedTransition,
	);

	const { isLoading, metricsData, conversionRate } = useFunnelStepsMetrics({
		funnelId: funnelId || '',
		stepStart: startStep,
		stepEnd: endStep,
	});

	if (!currentTransition) {
		return <div>No transition selected</div>;
	}

	return (
		<FunnelMetricsTable
			title={currentTransition.label}
			subtitle={{
				label: 'Conversion rate',
				value: `${conversionRate.toFixed(2)}%`,
			}}
			isLoading={isLoading}
			data={metricsData}
		/>
	);
}

StepsTransitionMetrics.defaultProps = {
	startStep: undefined,
	endStep: undefined,
};

export default StepsTransitionMetrics;
