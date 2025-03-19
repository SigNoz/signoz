import './StepsTransitionMetrics.styles.scss';

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

	return (
		<div className="steps-transition-metrics">{currentTransition?.label}</div>
	);
}

export default StepsTransitionMetrics;
