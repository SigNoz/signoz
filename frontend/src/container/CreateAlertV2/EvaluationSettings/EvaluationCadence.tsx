import { Button, DatePicker, Input, Select, Typography, Tooltip } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import {
	Calendar,
	Calendar1,
	Code,
	Edit,
	Edit3Icon,
	HelpCircle,
	Info,
	Plus,
	X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useCreateAlertState } from '../context';
import {
	ADVANCED_OPTIONS_TIME_UNIT_OPTIONS,
	INITIAL_ADVANCED_OPTIONS_STATE,
} from '../context/constants';
import { AdvancedOptionsState } from '../context/types';
import {
	EVALUATION_CADENCE_REPEAT_EVERY_MONTH_OPTIONS,
	EVALUATION_CADENCE_REPEAT_EVERY_OPTIONS,
	EVALUATION_CADENCE_REPEAT_EVERY_WEEK_OPTIONS,
} from './constants';
import TimeInput from './TimeInput';
import { IEvaluationCadenceDetailsProps } from './types';
import {
	buildAlertScheduleFromCustomSchedule,
	buildAlertScheduleFromRRule,
	isValidRRule,
	TIMEZONE_DATA,
} from './utils';

export function EvaluationCadenceDetails({
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
			evaluationCadence.custom.timezone,
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
					{schedule ? (
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
												UTC {date.getTimezoneOffset() <= 0 ? '+' : '-'}{' '}
												{Math.abs(Math.floor(date.getTimezoneOffset() / 60))}:
												{String(Math.abs(date.getTimezoneOffset() % 60)).padStart(2, '0')}
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

function EditCustomSchedule({
	setIsEvaluationCadenceDetailsVisible,
}: {
	setIsEvaluationCadenceDetailsVisible: (isOpen: boolean) => void;
}): JSX.Element {
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();

	const displayText = useMemo(() => {
		if (advancedOptions.evaluationCadence.mode === 'custom') {
			return (
				<Typography.Text>
					<Typography.Text>Every </Typography.Text>
					<Typography.Text className="highlight">
						{advancedOptions.evaluationCadence.custom.repeatEvery
							.charAt(0)
							.toUpperCase() +
							advancedOptions.evaluationCadence.custom.repeatEvery.slice(1)}
					</Typography.Text>
					<Typography.Text> on </Typography.Text>
					<Typography.Text className="highlight">
						{advancedOptions.evaluationCadence.custom.occurence
							.map(
								(occurence) => occurence.charAt(0).toUpperCase() + occurence.slice(1),
							)
							.join(', ')}
					</Typography.Text>
					<Typography.Text> at </Typography.Text>
					<Typography.Text className="highlight">
						{advancedOptions.evaluationCadence.custom.startAt}
					</Typography.Text>
				</Typography.Text>
			);
		}
		return (
			<Typography.Text>
				<Typography.Text>Starting on </Typography.Text>
				<Typography.Text className="highlight">
					{advancedOptions.evaluationCadence.rrule.date?.format('DD/MM/YYYY')}
				</Typography.Text>
				<Typography.Text> at </Typography.Text>
				<Typography.Text className="highlight">
					{advancedOptions.evaluationCadence.rrule.startAt}
				</Typography.Text>
			</Typography.Text>
		);
	}, [advancedOptions.evaluationCadence]);

	const handlePreviewAndEdit = (): void => {
		setIsEvaluationCadenceDetailsVisible(true);
	};

	const handleDiscard = (): void => {
		setIsEvaluationCadenceDetailsVisible(false);
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE',
			payload: INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
		});
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'default',
		});
	};

	return (
		<div className="edit-custom-schedule">
			{displayText}
			<div className="button-row">
				<Button.Group>
					<Button type="default" onClick={handlePreviewAndEdit}>
						<Edit size={12} />
						<Typography.Text>Edit custom schedule</Typography.Text>
					</Button>
					<Button type="default" onClick={handlePreviewAndEdit}>
						<Calendar1 size={12} />
						<Typography.Text>Preview</Typography.Text>
					</Button>
					<Button
						data-testid="discard-button"
						type="default"
						onClick={handleDiscard}
					>
						<X size={12} />
					</Button>
				</Button.Group>
			</div>
		</div>
	);
}

function EvaluationCadence(): JSX.Element {
	const [
		isEvaluationCadenceDetailsVisible,
		setIsEvaluationCadenceDetailsVisible,
	] = useState(false);
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();

	const showCustomScheduleButton = useMemo(
		() =>
			!isEvaluationCadenceDetailsVisible &&
			advancedOptions.evaluationCadence.mode === 'default',
		[isEvaluationCadenceDetailsVisible, advancedOptions.evaluationCadence.mode],
	);

	const showCustomSchedule = (): void => {
		setIsEvaluationCadenceDetailsVisible(true);
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'custom',
		});
	};

	return (
		<div className="evaluation-cadence-container">
			<div className="advanced-option-item evaluation-cadence-item">
				<div className="advanced-option-item-left-content">
					<div className="advanced-option-item-header">
						<Typography.Text className="advanced-option-item-title">
							How often to check
						</Typography.Text>
						<Tooltip title="Controls how frequently the alert evaluates your conditions. For most alerts, 1-5 minutes is sufficient." placement="top">
							<HelpCircle size={14} style={{ color: 'var(--bg-vanilla-400)', cursor: 'help' }} />
						</Tooltip>
					</div>
					<Typography.Text className="advanced-option-item-description">
						How frequently this alert checks your data. Default: Every 1 minute
					</Typography.Text>
				</div>
				{showCustomScheduleButton && (
					<div className="advanced-option-item-right-content">
						<div className="advanced-option-item-input-inline">
							<Input
								type="number"
								placeholder="1"
								style={{ width: 80 }}
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
							/>
							<Select
								options={ADVANCED_OPTIONS_TIME_UNIT_OPTIONS}
								placeholder="minute"
								style={{ width: 100 }}
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
							/>
						</div>
						<Button
							className="advanced-option-item-button"
							onClick={showCustomSchedule}
							size="small"
						>
							<Calendar size={12} />
							<Typography.Text>Custom schedule</Typography.Text>
						</Button>
					</div>
				)}
			</div>
			{!isEvaluationCadenceDetailsVisible &&
				advancedOptions.evaluationCadence.mode !== 'default' && (
					<EditCustomSchedule
						setIsEvaluationCadenceDetailsVisible={
							setIsEvaluationCadenceDetailsVisible
						}
					/>
				)}
			{isEvaluationCadenceDetailsVisible && (
				<EvaluationCadenceDetails
					isOpen={isEvaluationCadenceDetailsVisible}
					setIsOpen={setIsEvaluationCadenceDetailsVisible}
				/>
			)}
		</div>
	);
}

export default EvaluationCadence;
