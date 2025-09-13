import { Collapse, Input, Select } from 'antd';
import { Y_AXIS_CATEGORIES } from 'components/YAxisUnitSelector/constants';

import { useCreateAlertState } from '../context';
import AdvancedOptionItem from './AdvancedOptionItem';
import AdvancedOptionItemWithToggle from './AdvancedOptionItemWithToggle';
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
					<AdvancedOptionItemWithToggle
						title="Alert when data stops coming"
						description="Send notification if no data is received for a specified time period."
						tooltipContent="Useful for monitoring data pipelines or services that should continuously send data. For example, alert if no logs are received for 10 minutes."
						onToggle={(enabled): void => {
							if (enabled) {
								setAdvancedOptions({
									type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
									payload: {
										toleranceLimit: advancedOptions.sendNotificationIfDataIsMissing.toleranceLimit || 5,
										timeUnit: advancedOptions.sendNotificationIfDataIsMissing.timeUnit || 'm',
									},
								});
							} else {
								setAdvancedOptions({
									type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
									payload: {
										toleranceLimit: 0,
										timeUnit: '',
									},
								});
							}
						}}
						defaultEnabled={advancedOptions.sendNotificationIfDataIsMissing.toleranceLimit > 0 || advancedOptions.sendNotificationIfDataIsMissing.timeUnit !== ''}
						input={
							<>
								<Input
									placeholder="5"
									type="number"
									style={{ width: 80 }}
									onChange={(e): void =>
										setAdvancedOptions({
											type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
											payload: {
												toleranceLimit: Number(e.target.value),
												timeUnit: advancedOptions.sendNotificationIfDataIsMissing.timeUnit,
											},
										})
									}
									value={advancedOptions.sendNotificationIfDataIsMissing.toleranceLimit || undefined}
								/>
								<Select
									style={{ width: 100 }}
									options={timeOptions}
									placeholder="minutes"
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
									value={advancedOptions.sendNotificationIfDataIsMissing.timeUnit || undefined}
								/>
							</>
						}
					/>
					<AdvancedOptionItemWithToggle
						title="Minimum data required"
						description="Only trigger alert when there are enough data points to make a reliable decision."
						tooltipContent="Prevents false alarms when there's insufficient data. For example, require at least 5 data points before checking if CPU usage is above 80%."
						input={
							<>
								<Input
									placeholder="5"
									style={{ width: 80 }}
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
								<span style={{ color: 'var(--bg-vanilla-400)', fontSize: '12px' }}>
									data points
								</span>
							</>
						}
					/>
					<AdvancedOptionItemWithToggle
						title="Account for data delay"
						description="Shift the evaluation window backwards to account for data processing delays."
						tooltipContent="Use when your data takes time to arrive on the platform. For example, if logs typically arrive 5 minutes late, set a 5-minute delay so the alert checks the correct time window."
						onToggle={(enabled): void => {
							if (enabled) {
								setAdvancedOptions({
									type: 'SET_DELAY_EVALUATION',
									payload: {
										delay: advancedOptions.delayEvaluation.delay || 2,
										timeUnit: advancedOptions.delayEvaluation.timeUnit || 'm',
									},
								});
							} else {
								setAdvancedOptions({
									type: 'SET_DELAY_EVALUATION',
									payload: {
										delay: 0,
										timeUnit: '',
									},
								});
							}
						}}
						defaultEnabled={advancedOptions.delayEvaluation.delay > 0 || advancedOptions.delayEvaluation.timeUnit !== ''}
						input={
							<>
								<Input
									placeholder="2"
									style={{ width: 80 }}
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
									value={advancedOptions.delayEvaluation.delay || undefined}
								/>
								<Select
									style={{ width: 100 }}
									options={timeOptions}
									placeholder="minutes"
									onChange={(value): void =>
										setAdvancedOptions({
											type: 'SET_DELAY_EVALUATION',
											payload: {
												delay: advancedOptions.delayEvaluation.delay,
												timeUnit: value as string,
											},
										})
									}
									value={advancedOptions.delayEvaluation.timeUnit || undefined}
								/>
							</>
						}
					/>
				</Collapse.Panel>
			</Collapse>
		</div>
	);
}

export default AdvancedOptions;
