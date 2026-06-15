import { useEffect, useState } from 'react';
import { Input, Select, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Info } from '@signozhq/icons';

import { useCreateAlertState } from '../../context';
import { ADVANCED_OPTIONS_TIME_UNIT_OPTIONS } from '../../context/constants';
import EditCustomSchedule from './EditCustomSchedule';
import EvaluationCadenceDetails from './EvaluationCadenceDetails';
import EvaluationCadencePreview from './EvaluationCadencePreview';
import advancedOptionStyles from '../AdvancedOptionItem/styles.module.scss';
import styles from './styles.module.scss';

function EvaluationCadence(): JSX.Element {
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();

	const [
		isEvaluationCadenceDetailsVisible,
		setIsEvaluationCadenceDetailsVisible,
	] = useState(false);
	const [isCustomScheduleButtonVisible, setIsCustomScheduleButtonVisible] =
		useState(true);
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
		<div className={styles.evaluationCadenceContainer}>
			<div
				className={`${advancedOptionStyles.advancedOptionItem} ${styles.evaluationCadenceItem}`}
			>
				<div className={advancedOptionStyles.advancedOptionItemLeftContent}>
					<Typography.Text className={advancedOptionStyles.advancedOptionItemTitle}>
						How often to check
						<Tooltip title="Controls how frequently the alert evaluates your conditions. For most alerts, 1-5 minutes is sufficient.">
							<Info data-testid="evaluation-cadence-tooltip-icon" size={16} />
						</Tooltip>
					</Typography.Text>
					<Typography.Text
						className={advancedOptionStyles.advancedOptionItemDescription}
					>
						How frequently this alert checks your data. Default: Every 1 minute
					</Typography.Text>
				</div>
				{isCustomScheduleButtonVisible && (
					<div
						className={advancedOptionStyles.advancedOptionItemRightContent}
						data-testid="evaluation-cadence-input-group"
					>
						<Input.Group
							className={advancedOptionStyles.advancedOptionItemInputGroup}
						>
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
