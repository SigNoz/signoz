import './styles.scss';

interface StepperProps {
	stepNumber: number;
	label: string;
}

function Stepper({ stepNumber, label }: StepperProps): JSX.Element {
	return (
		<div className="stepper-container">
			<div className="step-number">{stepNumber}</div>
			<div className="step-label">{label}</div>
			<div className="dotted-line" />
		</div>
	);
}

export default Stepper;
