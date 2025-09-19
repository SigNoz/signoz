import { Button, DatePicker, Select, Typography } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import classNames from 'classnames';
import { useCreateAlertState } from 'container/CreateAlertV2/context';
import { AdvancedOptionsState } from 'container/CreateAlertV2/context/types';
import { Calendar, Code, Edit3Icon, Info } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
	EVALUATION_CADENCE_REPEAT_EVERY_MONTH_OPTIONS,
	EVALUATION_CADENCE_REPEAT_EVERY_OPTIONS,
	EVALUATION_CADENCE_REPEAT_EVERY_WEEK_OPTIONS,
	TIMEZONE_DATA,
} from '../constants';
import TimeInput from '../TimeInput';
import { IEvaluationCadenceDetailsProps } from '../types';
import {
	buildAlertScheduleFromCustomSchedule,
	buildAlertScheduleFromRRule,
	isValidRRule,
} from '../utils';

function EvaluationCadenceDetails({
	setIsOpen,
}: IEvaluationCadenceDetailsProps): JSX.Element {
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();
	const [evaluationCadence, setEvaluationCadence] = useState<
		AdvancedOptionsState['evaluationCadence']
	>({
		...advancedOptions.evaluationCadence,
	});

	const tabs = [
		{
			label: 'Editor',
			icon: <Edit3Icon size={14} />,
			value: 'editor',
		},
		{
			label: 'RRule',
			icon: <Code size={14} />,
			value: 'rrule',
		},
	];
	const [activeTab, setActiveTab] = useState<'editor' | 'rrule'>(() =>
		evaluationCadence.mode === 'custom' ? 'editor' : 'rrule',
	);

	const occurenceOptions =
		evaluationCadence.custom.repeatEvery === 'week'
			? EVALUATION_CADENCE_REPEAT_EVERY_WEEK_OPTIONS
			: EVALUATION_CADENCE_REPEAT_EVERY_MONTH_OPTIONS;

	const EditorView = (
		<div className="editor-view" data-testid="editor-view">
			<div className="select-group">
				<Typography.Text>REPEAT EVERY</Typography.Text>
				<Select
					options={EVALUATION_CADENCE_REPEAT_EVERY_OPTIONS}
					value={evaluationCadence.custom.repeatEvery || null}
					onChange={(value): void =>
						setEvaluationCadence({
							...evaluationCadence,
							custom: {
								...evaluationCadence.custom,
								repeatEvery: value,
								occurence: [],
							},
						})
					}
					placeholder="Select repeat every"
				/>
			</div>
			{evaluationCadence.custom.repeatEvery !== 'day' && (
				<div className="select-group">
					<Typography.Text>ON DAY(S)</Typography.Text>
					<Select
						options={occurenceOptions}
						value={evaluationCadence.custom.occurence || null}
						mode="multiple"
						onChange={(value): void =>
							setEvaluationCadence({
								...evaluationCadence,
								custom: {
									...evaluationCadence.custom,
									occurence: value,
								},
							})
						}
						placeholder="Select day(s)"
					/>
				</div>
			)}
			<div className="select-group">
				<Typography.Text>AT</Typography.Text>
				<TimeInput
					value={evaluationCadence.custom.startAt}
					onChange={(value): void =>
						setEvaluationCadence({
							...evaluationCadence,
							custom: {
								...evaluationCadence.custom,
								startAt: value,
							},
						})
					}
				/>
			</div>
			<div className="select-group">
				<Typography.Text>TIMEZONE</Typography.Text>
				<Select
					options={TIMEZONE_DATA}
					value={evaluationCadence.custom.timezone || null}
					onChange={(value): void =>
						setEvaluationCadence({
							...evaluationCadence,
							custom: {
								...evaluationCadence.custom,
								timezone: value,
							},
						})
					}
					placeholder="Select timezone"
				/>
			</div>
		</div>
	);

	const RRuleView = (
		<div className="rrule-view" data-testid="rrule-view">
			<div className="select-group">
				<Typography.Text>STARTING ON</Typography.Text>
				<DatePicker
					value={evaluationCadence.rrule.date}
					onChange={(value): void =>
						setEvaluationCadence({
							...evaluationCadence,
							rrule: {
								...evaluationCadence.rrule,
								date: value,
							},
						})
					}
					placeholder="Select date"
				/>
			</div>
			<div className="select-group">
				<Typography.Text>AT</Typography.Text>
				<TimeInput
					value={evaluationCadence.rrule.startAt}
					onChange={(value): void =>
						setEvaluationCadence({
							...evaluationCadence,
							rrule: {
								...evaluationCadence.rrule,
								startAt: value,
							},
						})
					}
				/>
			</div>
			<TextArea
				value={evaluationCadence.rrule.rrule}
				placeholder="Enter RRule"
				onChange={(value): void =>
					setEvaluationCadence({
						...evaluationCadence,
						rrule: {
							...evaluationCadence.rrule,
							rrule: value.target.value,
						},
					})
				}
			/>
		</div>
	);

	const handleDiscard = (): void => {
		setIsOpen(false);
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'default',
		});
	};

	const handleSaveCustomSchedule = (): void => {
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE',
			payload: {
				...advancedOptions.evaluationCadence,
				custom: evaluationCadence.custom,
				rrule: evaluationCadence.rrule,
			},
		});
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: evaluationCadence.mode,
		});
		setIsOpen(false);
	};

	const disableSaveButton = useMemo(() => {
		if (activeTab === 'editor') {
			if (evaluationCadence.custom.repeatEvery === 'day') {
				return (
					!evaluationCadence.custom.repeatEvery ||
					!evaluationCadence.custom.startAt ||
					!evaluationCadence.custom.timezone
				);
			}
			return (
				!evaluationCadence.custom.repeatEvery ||
				!evaluationCadence.custom.occurence.length ||
				!evaluationCadence.custom.startAt ||
				!evaluationCadence.custom.timezone
			);
		}
		return (
			!evaluationCadence.rrule.rrule ||
			!evaluationCadence.rrule.date ||
			!evaluationCadence.rrule.startAt ||
			!isValidRRule(evaluationCadence.rrule.rrule)
		);
	}, [evaluationCadence, activeTab]);

	const schedule = useMemo(() => {
		if (activeTab === 'rrule') {
			return buildAlertScheduleFromRRule(
				evaluationCadence.rrule.rrule,
				evaluationCadence.rrule.date,
				evaluationCadence.rrule.startAt,
				15,
			);
		}
		return buildAlertScheduleFromCustomSchedule(
			evaluationCadence.custom.repeatEvery,
			evaluationCadence.custom.occurence,
			evaluationCadence.custom.startAt,
			15,
		);
	}, [evaluationCadence, activeTab]);

	const handleChangeTab = (tab: 'editor' | 'rrule'): void => {
		setActiveTab(tab);
		const mode = tab === 'editor' ? 'custom' : 'rrule';
		setEvaluationCadence({
			...evaluationCadence,
			mode,
		});
	};

	return (
		<div className="evaluation-cadence-details">
			<Typography.Text className="evaluation-cadence-details-title">
				Add Custom Schedule
			</Typography.Text>
			<div className="evaluation-cadence-details-content">
				<div className="evaluation-cadence-details-content-row">
					<div className="query-section-tabs">
						<div className="query-section-query-actions">
							{tabs.map((tab) => (
								<Button
									key={tab.value}
									className={classNames('list-view-tab', 'explorer-view-option', {
										'active-tab': activeTab === tab.value,
									})}
									onClick={(): void => {
										handleChangeTab(tab.value as 'editor' | 'rrule');
									}}
								>
									{tab.icon}
									{tab.label}
								</Button>
							))}
						</div>
					</div>
					{activeTab === 'editor' && EditorView}
					{activeTab === 'rrule' && RRuleView}
					<div className="buttons-row">
						<Button type="default" onClick={handleDiscard}>
							Discard
						</Button>
						<Button
							type="primary"
							onClick={handleSaveCustomSchedule}
							disabled={disableSaveButton}
						>
							Save Custom Schedule
						</Button>
					</div>
				</div>
				<div className="evaluation-cadence-details-content-row">
					{schedule && schedule.length > 0 ? (
						<div className="schedule-preview">
							<div className="schedule-preview-header">
								<Calendar size={16} />
								<Typography.Text className="schedule-preview-title">
									Schedule Preview
								</Typography.Text>
							</div>
							<div className="schedule-preview-list">
								{schedule.map((date) => (
									<div key={date.toISOString()} className="schedule-preview-item">
										<div className="schedule-preview-timeline">
											<div className="schedule-preview-timeline-line" />
										</div>
										<div className="schedule-preview-content">
											<div className="schedule-preview-date">
												{date.toLocaleDateString('en-US', {
													weekday: 'short',
													month: 'short',
													day: 'numeric',
												})}
												,{' '}
												{date.toLocaleTimeString('en-US', {
													hour12: false,
													hour: '2-digit',
													minute: '2-digit',
													second: '2-digit',
												})}
											</div>
											<div className="schedule-preview-separator" />
											<div className="schedule-preview-timezone">
												{
													TIMEZONE_DATA.find(
														(timezone) =>
															timezone.value === evaluationCadence.custom.timezone,
													)?.label
												}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="no-schedule">
							<Info size={32} />
							<Typography.Text>
								Please fill the relevant information to generate a schedule
							</Typography.Text>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default EvaluationCadenceDetails;
