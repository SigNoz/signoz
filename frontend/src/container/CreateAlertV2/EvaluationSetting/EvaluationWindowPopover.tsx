/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Button, Select, Typography } from 'antd';
import classNames from 'classnames';
import { Check } from 'lucide-react';
import { useMemo } from 'react';

import {
	EVALUATION_WINDOW_TIMEFRAME,
	EVALUATION_WINDOW_TYPE,
} from './constants';
import TimeInput from './TimeInput';
import {
	CumulativeWindowTimeframes,
	IEvaluationWindowDetailsProps,
	IEvaluationWindowPopoverProps,
	RollingWindowTimeframes,
} from './types';
import { TIMEZONE_DATA } from './utils';

function EvaluationWindowDetails({
	evaluationWindow,
	setEvaluationWindow,
}: IEvaluationWindowDetailsProps): JSX.Element {
	const currentHourOptions = useMemo(() => {
		const options = [];
		for (let i = 0; i < 60; i++) {
			options.push({ label: i.toString(), value: i });
		}
		return options;
	}, []);

	const currentMonthOptions = useMemo(() => {
		const options = [];
		for (let i = 1; i <= 31; i++) {
			options.push({ label: i.toString(), value: i });
		}
		return options;
	}, []);

	if (evaluationWindow.windowType === 'rolling') {
		return <div />;
	}

	const isCurrentHour =
		evaluationWindow.windowType === 'cumulative' &&
		evaluationWindow.timeframe === 'currentHour';
	const isCurrentDay =
		evaluationWindow.windowType === 'cumulative' &&
		evaluationWindow.timeframe === 'currentDay';
	const isCurrentMonth =
		evaluationWindow.windowType === 'cumulative' &&
		evaluationWindow.timeframe === 'currentMonth';

	const handleNumberChange = (value: string): void => {
		setEvaluationWindow({
			type: 'SET_STARTING_AT',
			payload: {
				number: value,
				time: evaluationWindow.startingAt.time,
				timezone: evaluationWindow.startingAt.timezone,
			},
		});
	};

	const handleTimeChange = (value: string): void => {
		setEvaluationWindow({
			type: 'SET_STARTING_AT',
			payload: {
				number: evaluationWindow.startingAt.number,
				time: value,
				timezone: evaluationWindow.startingAt.timezone,
			},
		});
	};

	const handleTimezoneChange = (value: string): void => {
		setEvaluationWindow({
			type: 'SET_STARTING_AT',
			payload: {
				number: evaluationWindow.startingAt.number,
				time: evaluationWindow.startingAt.time,
				timezone: value,
			},
		});
	};

	if (isCurrentHour) {
		return (
			<div className="evaluation-window-details">
				<div className="select-group">
					<Typography.Text>STARTING AT MINUTE</Typography.Text>
					<Select
						options={currentHourOptions}
						value={evaluationWindow.startingAt.number || null}
						onChange={handleNumberChange}
						placeholder="Select starting at"
					/>
				</div>
			</div>
		);
	}

	if (isCurrentDay) {
		return (
			<div className="evaluation-window-details">
				<div className="select-group time-select-group">
					<Typography.Text>STARTING AT</Typography.Text>
					<TimeInput
						value={evaluationWindow.startingAt.time}
						onChange={handleTimeChange}
					/>
				</div>
				<div className="select-group">
					<Typography.Text>SELECT TIMEZONE</Typography.Text>
					<Select
						options={TIMEZONE_DATA}
						value={evaluationWindow.startingAt.timezone || null}
						onChange={handleTimezoneChange}
						placeholder="Select timezone"
					/>
				</div>
			</div>
		);
	}

	if (isCurrentMonth) {
		return (
			<div className="evaluation-window-details">
				<div className="select-group">
					<Typography.Text>STARTING ON DAY</Typography.Text>
					<Select
						options={currentMonthOptions}
						value={evaluationWindow.startingAt.number || null}
						onChange={handleNumberChange}
						placeholder="Select starting at"
					/>
				</div>
				<div className="select-group time-select-group">
					<Typography.Text>STARTING AT</Typography.Text>
					<TimeInput
						value={evaluationWindow.startingAt.time}
						onChange={handleTimeChange}
					/>
				</div>
				<div className="select-group">
					<Typography.Text>SELECT TIMEZONE</Typography.Text>
					<Select
						options={TIMEZONE_DATA}
						value={evaluationWindow.startingAt.timezone || null}
						onChange={handleTimezoneChange}
						placeholder="Select timezone"
					/>
				</div>
			</div>
		);
	}

	return <div />;
}

function EvaluationWindowPopover({
	evaluationWindow,
	setEvaluationWindow,
}: IEvaluationWindowPopoverProps): JSX.Element {
	const renderEvaluationWindowContent = (
		label: string,
		contentOptions: Array<{ label: string; value: string }>,
		currentValue: string,
		onChange: (value: string) => void,
	): JSX.Element => (
		<div className="evaluation-window-content-item">
			<Typography.Text className="evaluation-window-content-item-label">
				{label}
			</Typography.Text>
			<div className="evaluation-window-content-list">
				{contentOptions.map((option) => (
					<div
						className={classNames('evaluation-window-content-list-item', {
							active: currentValue === option.value,
						})}
						key={option.value}
						role="button"
						onClick={(): void => onChange(option.value)}
					>
						<Typography.Text>{option.label}</Typography.Text>
						{currentValue === option.value && <Check size={12} />}
					</div>
				))}
			</div>
		</div>
	);

	const renderSelectionContent = (): JSX.Element => {
		if (evaluationWindow.windowType === 'rolling') {
			return (
				<div className="selection-content">
					<Typography.Text>
						A Rolling Window has a fixed size and shifts its starting point over time
						based on when the rules are evaluated.
					</Typography.Text>
					<Button type="link">Read the docs</Button>
				</div>
			);
		}

		if (
			evaluationWindow.windowType === 'cumulative' &&
			!evaluationWindow.timeframe
		) {
			return (
				<div className="selection-content">
					<Typography.Text>
						A Cumulative Window has a fixed starting point and expands over time.
					</Typography.Text>
					<Button type="link">Read the docs</Button>
				</div>
			);
		}

		return (
			<EvaluationWindowDetails
				evaluationWindow={evaluationWindow}
				setEvaluationWindow={setEvaluationWindow}
			/>
		);
	};

	return (
		<div className="evaluation-window-popover">
			<div className="evaluation-window-content">
				{renderEvaluationWindowContent(
					'EVALUATION WINDOW',
					EVALUATION_WINDOW_TYPE,
					evaluationWindow.windowType,
					(value: string): void =>
						setEvaluationWindow({
							type: 'SET_WINDOW_TYPE',
							payload: value as 'rolling' | 'cumulative',
						}),
				)}
				{renderEvaluationWindowContent(
					'TIMEFRAME',
					EVALUATION_WINDOW_TIMEFRAME[evaluationWindow.windowType],
					evaluationWindow.timeframe,
					(value: string): void =>
						setEvaluationWindow({
							type: 'SET_TIMEFRAME',
							payload: value as RollingWindowTimeframes | CumulativeWindowTimeframes,
						}),
				)}
				{renderSelectionContent()}
			</div>
		</div>
	);
}

export default EvaluationWindowPopover;
