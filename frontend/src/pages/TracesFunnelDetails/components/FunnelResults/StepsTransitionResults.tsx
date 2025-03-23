import './StepsTransitionResults.styles.scss';

import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { useState } from 'react';

import StepsTransitionMetrics from './StepsTransitionMetrics';
import TopSlowestTraces from './TopSlowestTraces';
import TopTracesWithErrors from './TopTracesWithErrors';

interface StepTransition {
	value: string;
	label: string;
}

interface StepsTransitionResultsProps {
	stepsCount: number;
}

function generateStepTransitions(stepsCount: number): StepTransition[] {
	return Array.from({ length: stepsCount - 1 }, (_, index) => ({
		value: `${index + 1}_to_${index + 2}`,
		label: `Step ${index + 1} -> Step ${index + 2}`,
	}));
}

function StepsTransitionResults({
	stepsCount,
}: StepsTransitionResultsProps): JSX.Element {
	const stepTransitions = generateStepTransitions(stepsCount);
	const [selectedTransition, setSelectedTransition] = useState<string>(
		stepTransitions[0]?.value || '',
	);

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
				/>
				<TopSlowestTraces />
				<TopTracesWithErrors />
			</div>
		</div>
	);
}

export default StepsTransitionResults;
