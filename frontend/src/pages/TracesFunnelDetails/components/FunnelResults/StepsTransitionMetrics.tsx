import FunnelMetricsTable from './FunnelMetricsTable';

interface StepTransition {
	value: string;
	label: string;
}

interface StepsTransitionMetricsProps {
	selectedTransition: string;
	transitions: StepTransition[];
}

function StepsTransitionMetrics({
	selectedTransition,
	transitions,
}: StepsTransitionMetricsProps): JSX.Element {
	const currentTransition = transitions.find(
		(transition) => transition.value === selectedTransition,
	);

	const currentTransitionMetricsData = [
		{
			title: 'Avg. Rate',
			value: '486.76 req/s',
		},
		{
			title: 'Errors',
			value: '43',
		},
		{
			title: 'Avg. Duration',
			value: '34.77 ms',
		},
	];

	if (!currentTransition) {
		return <div>No transition selected</div>;
	}

	return (
		<FunnelMetricsTable
			title={currentTransition.label}
			subtitle={{
				label: 'Conversion rate',
				value: '46%',
			}}
			data={currentTransitionMetricsData}
		/>
	);
}

export default StepsTransitionMetrics;
