import './StepsTransitionResults.styles.scss';

import { Radio } from 'antd';
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
				<Radio.Group
					value={selectedTransition}
					buttonStyle="solid"
					className="views-tabs"
					onChange={(e): void => setSelectedTransition(e.target.value)}
				>
					{stepTransitions.map((transition) => (
						<Radio.Button
							key={transition.value}
							value={transition.value}
							className={
								selectedTransition === transition.value ? 'selected_view tab' : 'tab'
							}
						>
							{transition.label}
						</Radio.Button>
					))}
				</Radio.Group>
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
