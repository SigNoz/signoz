import { Collapse, Input, Select } from 'antd';
import { Y_AXIS_CATEGORIES } from 'components/YAxisUnitSelector/constants';

import { useCreateAlertState } from '../context';
import AdvancedOptionItem from './AdvancedOptionItem';
import EvaluationCadence from './EvaluationCadence';

function AdvancedOptions(): JSX.Element {
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();

	const timeOptions = Y_AXIS_CATEGORIES.find(
		(category) => category.name === 'Time',
	)?.units.map((unit) => ({ label: unit.name, value: unit.id }));

	return (
		<div className="advanced-options-container">
			<Collapse bordered={false}>
				<Collapse.Panel header="ADVANCED OPTIONS" key="1">
					<EvaluationCadence />
					<AdvancedOptionItem
						title="Send a notification if data is missing"
						description="If data is missing for this alert rule for a certain time period, notify in the default notification channel."
						input={
							<Input.Group>
								<Input
									placeholder="Enter tolerance limit..."
									type="number"
									style={{ width: 240 }}
									onChange={(e): void =>
										setAdvancedOptions({
											type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
											payload: {
												toleranceLimit: Number(e.target.value),
												timeUnit: advancedOptions.sendNotificationIfDataIsMissing.timeUnit,
											},
										})
									}
									value={advancedOptions.sendNotificationIfDataIsMissing.toleranceLimit}
								/>
								<Select
									style={{ width: 120 }}
									options={timeOptions}
									placeholder="Select time unit"
									onChange={(value): void =>
										setAdvancedOptions({
											type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
											payload: {
												toleranceLimit:
													advancedOptions.sendNotificationIfDataIsMissing.toleranceLimit,
												timeUnit: value as string,
											},
										})
									}
									value={advancedOptions.sendNotificationIfDataIsMissing.timeUnit}
								/>
							</Input.Group>
						}
					/>
					<AdvancedOptionItem
						title="Enforce minimum datapoints"
						description="Run alert evaluation only when there are minimum of pre-defined number of data points in each result group"
						input={
							<Input
								placeholder="Enter minimum datapoints..."
								style={{ width: 360 }}
								type="number"
								onChange={(e): void =>
									setAdvancedOptions({
										type: 'SET_ENFORCE_MINIMUM_DATAPOINTS',
										payload: {
											minimumDatapoints: Number(e.target.value),
										},
									})
								}
								value={advancedOptions.enforceMinimumDatapoints.minimumDatapoints}
							/>
						}
					/>
					<AdvancedOptionItem
						title="Delay evaluation"
						description="Delay the evaluation of newer groups to prevent noisy alerts."
						input={
							<Input.Group>
								<Input
									placeholder="Enter delay..."
									style={{ width: 240 }}
									type="number"
									onChange={(e): void =>
										setAdvancedOptions({
											type: 'SET_DELAY_EVALUATION',
											payload: {
												delay: Number(e.target.value),
												timeUnit: advancedOptions.delayEvaluation.timeUnit,
											},
										})
									}
									value={advancedOptions.delayEvaluation.delay}
								/>
								<Select
									style={{ width: 120 }}
									options={timeOptions}
									placeholder="Select time unit"
									onChange={(value): void =>
										setAdvancedOptions({
											type: 'SET_DELAY_EVALUATION',
											payload: {
												delay: advancedOptions.delayEvaluation.delay,
												timeUnit: value as string,
											},
										})
									}
									value={advancedOptions.delayEvaluation.timeUnit}
								/>
							</Input.Group>
						}
					/>
				</Collapse.Panel>
			</Collapse>
		</div>
	);
}

export default AdvancedOptions;
