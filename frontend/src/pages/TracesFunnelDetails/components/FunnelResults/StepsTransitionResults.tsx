import './StepsTransitionResults.styles.scss';

import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { useMemo, useState } from 'react';

import StepsTransitionMetrics from './StepsTransitionMetrics';
import TopSlowestTraces from './TopSlowestTraces';
import TopTracesWithErrors from './TopTracesWithErrors';

export interface StepTransition {
	value: string;
	label: string;
}

interface StepsTransitionResultsProps {
	funnelId: string;
	stepsCount: number;
}

function generateStepTransitions(stepsCount: number): StepTransition[] {
	return Array.from({ length: stepsCount - 1 }, (_, index) => ({
		value: `${index + 1}_to_${index + 2}`,
		label: `Step ${index + 1} -> Step ${index + 2}`,
	}));
}

function StepsTransitionResults({
	funnelId,
	stepsCount,
}: StepsTransitionResultsProps): JSX.Element {
	const stepTransitions = generateStepTransitions(stepsCount);
	const [selectedTransition, setSelectedTransition] = useState<string>(
		stepTransitions[0]?.value || '',
	);

	const [stepAOrder, stepBOrder] = useMemo(() => {
		const [a, b] = selectedTransition.split('_to_');
		return [parseInt(a, 10), parseInt(b, 10)];
	}, [selectedTransition]);

	return (
		<div className="steps-transition-results">
			<div className="steps-transition-results__steps-selector">
				<SignozRadioGroup
					value={selectedTransition}
					options={stepTransitions}
					onChange={(e): void => setSelectedTransition(e.target.value)}
				/>
			</div>
			<div className="steps-transition-results__results">
				<StepsTransitionMetrics
					selectedTransition={selectedTransition}
					transitions={stepTransitions}
					startStep={stepAOrder}
					endStep={stepBOrder}
				/>
				<TopSlowestTraces
					funnelId={funnelId}
					stepAOrder={stepAOrder}
					stepBOrder={stepBOrder}
				/>
				<TopTracesWithErrors
					funnelId={funnelId}
					stepAOrder={stepAOrder}
					stepBOrder={stepBOrder}
				/>
			</div>
		</div>
	);
}

export default StepsTransitionResults;
