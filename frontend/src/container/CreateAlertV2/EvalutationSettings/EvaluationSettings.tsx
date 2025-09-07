import './styles.scss';

import Stepper from '../Stepper';
import AdvancedOptions from './AdvancedOptions';

function EvaluationSettings(): JSX.Element {
	return (
		<div className="evaluation-settings-container">
			<Stepper stepNumber={3} label="Evaluation settings" />
			<AdvancedOptions />
		</div>
	);
}

export default EvaluationSettings;
