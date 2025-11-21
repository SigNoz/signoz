import './styles.scss';
import '../AdvancedOptionItem/styles.scss';

import { Input, Select, Tooltip, Typography } from 'antd';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useCreateAlertState } from '../../context';
import { ADVANCED_OPTIONS_TIME_UNIT_OPTIONS } from '../../context/constants';
import EditCustomSchedule from './EditCustomSchedule';
import EvaluationCadenceDetails from './EvaluationCadenceDetails';
import EvaluationCadencePreview from './EvaluationCadencePreview';

function EvaluationCadence(): JSX.Element {
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();

	const [
		isEvaluationCadenceDetailsVisible,
		setIsEvaluationCadenceDetailsVisible,
	] = useState(false);
	const [
		isCustomScheduleButtonVisible,
		setIsCustomScheduleButtonVisible,
	] = useState(true);
	const [
		isEvaluationCadencePreviewVisible,
		setIsEvaluationCadencePreviewVisible,
	] = useState(false);
	const [isEditCustomScheduleVisible, setIsEditCustomScheduleVisible] = useState(
		() => advancedOptions.evaluationCadence.mode !== 'default',
	);

	useEffect(() => {
		setIsEditCustomScheduleVisible(
			advancedOptions.evaluationCadence.mode !== 'default',
		);
	}, [advancedOptions.evaluationCadence.mode]);

	// const showCustomSchedule = (): void => {
	// 	setIsEvaluationCadenceDetailsVisible(true);
	// 	setIsCustomScheduleButtonVisible(false);
	// };

	return (
		<div className="evaluation-cadence-container">
			<div className="advanced-option-item evaluation-cadence-item">
				<div className="advanced-option-item-left-content">
					<Typography.Text className="advanced-option-item-title">
						How often to check
						<Tooltip title="Controls how frequently the alert evaluates your conditions. For most alerts, 1-5 minutes is sufficient.">
							<Info data-testid="evaluation-cadence-tooltip-icon" size={16} />
						</Tooltip>
					</Typography.Text>
					<Typography.Text className="advanced-option-item-description">
						How frequently this alert checks your data. Default: Every 1 minute
					</Typography.Text>
				</div>
				{isCustomScheduleButtonVisible && (
					<div
						className="advanced-option-item-right-content"
						data-testid="evaluation-cadence-input-group"
					>
						<Input.Group className="advanced-option-item-input-group">
							<Input
								type="number"
								placeholder="Enter time"
								style={{ width: 180 }}
								value={advancedOptions.evaluationCadence.default.value}
								onChange={(value): void =>
									setAdvancedOptions({
										type: 'SET_EVALUATION_CADENCE',
										payload: {
											...advancedOptions.evaluationCadence,
											default: {
												...advancedOptions.evaluationCadence.default,
												value: Number(value.target.value),
											},
										},
									})
								}
								data-testid="evaluation-cadence-duration-input"
							/>
							<Select
								options={ADVANCED_OPTIONS_TIME_UNIT_OPTIONS}
								placeholder="Select time unit"
								style={{ width: 120 }}
								value={advancedOptions.evaluationCadence.default.timeUnit}
								onChange={(value): void =>
									setAdvancedOptions({
										type: 'SET_EVALUATION_CADENCE',
										payload: {
											...advancedOptions.evaluationCadence,
											default: {
												...advancedOptions.evaluationCadence.default,
												timeUnit: value,
											},
										},
									})
								}
								data-testid="evaluation-cadence-unit-select"
							/>
						</Input.Group>
						{/* TODO: Add custom schedule back once the functionality is implemented */}
						{/* <Button
							className="advanced-option-item-button"
							onClick={showCustomSchedule}
						>
							<Plus size={12} />
							<Typography.Text>Add custom schedule</Typography.Text>
						</Button> */}
					</div>
				)}
			</div>
			{isEditCustomScheduleVisible && (
				<EditCustomSchedule
					setIsEvaluationCadenceDetailsVisible={setIsEvaluationCadenceDetailsVisible}
					setIsPreviewVisible={setIsEvaluationCadencePreviewVisible}
				/>
			)}
			{isEvaluationCadenceDetailsVisible && (
				<EvaluationCadenceDetails
					isOpen={isEvaluationCadenceDetailsVisible}
					setIsOpen={setIsEvaluationCadenceDetailsVisible}
					setIsCustomScheduleButtonVisible={setIsCustomScheduleButtonVisible}
				/>
			)}
			{isEvaluationCadencePreviewVisible && (
				<EvaluationCadencePreview
					isOpen={isEvaluationCadencePreviewVisible}
					setIsOpen={setIsEvaluationCadencePreviewVisible}
				/>
			)}
		</div>
	);
}

export default EvaluationCadence;
