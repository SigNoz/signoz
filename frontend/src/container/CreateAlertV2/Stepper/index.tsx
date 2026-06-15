import styles from './Stepper.module.scss';

interface StepperProps {
	stepNumber: number;
	label: string;
}

function Stepper({ stepNumber, label }: StepperProps): JSX.Element {
	return (
		<div className={styles.stepperContainer}>
			<div className={styles.stepNumber}>{stepNumber}</div>
			<div className={styles.stepLabel}>{label}</div>
			<div className={styles.dottedLine} />
		</div>
	);
}

export default Stepper;
