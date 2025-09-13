/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Button, Input, Select, Typography } from 'antd';
import classNames from 'classnames';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import {
	EVALUATION_WINDOW_TIMEFRAME,
	EVALUATION_WINDOW_TYPE,
	TIME_UNIT_OPTIONS,
} from './constants';
import TimeInput from './TimeInput';
import {
	CumulativeWindowTimeframes,
	IEvaluationWindowDetailsProps,
	IEvaluationWindowPopoverProps,
	RollingWindowTimeframes,
} from './types';
import { getDetailedDescription, TIMEZONE_DATA } from './utils';

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

	if (evaluationWindow.timeframe === 'custom' && evaluationWindow.windowType === 'rolling') {
		return (
			<div className="evaluation-window-details">
				<Typography.Text className="custom-duration-title">
					SPECIFY CUSTOM DURATION
				</Typography.Text>
				<div className="custom-duration-inputs">
					<div className="select-group">
						<Typography.Text>VALUE</Typography.Text>
						<Input
							type="number"
							min={1}
							value={evaluationWindow.customDuration.value}
							onChange={(e): void => {
								const value = parseInt(e.target.value, 10) || 1;
								setEvaluationWindow({
									type: 'SET_CUSTOM_DURATION',
									payload: {
										value,
										unit: evaluationWindow.customDuration.unit,
									},
								});
							}}
							placeholder="Enter number"
						/>
					</div>
					<div className="select-group">
						<Typography.Text>UNIT</Typography.Text>
						<Select
							options={TIME_UNIT_OPTIONS}
							value={evaluationWindow.customDuration.unit}
							onChange={(unit: string): void => {
								setEvaluationWindow({
									type: 'SET_CUSTOM_DURATION',
									payload: {
										value: evaluationWindow.customDuration.value,
										unit,
									},
								});
							}}
							placeholder="Select unit"
						/>
					</div>
				</div>
				<div className="custom-duration-preview">
					<Typography.Text>
						Window: Last {evaluationWindow.customDuration.value} {TIME_UNIT_OPTIONS.find(opt => opt.value === evaluationWindow.customDuration.unit)?.label || evaluationWindow.customDuration.unit}
					</Typography.Text>
				</div>
			</div>
		);
	}

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
	isOpen,
	setIsOpen,
}: IEvaluationWindowPopoverProps): JSX.Element {
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (!isOpen || !popoverRef.current) return;
			
			if (!popoverRef.current.contains(document.activeElement)) return;

			const currentElement = document.activeElement as HTMLElement;
			const currentColumn = currentElement.closest('.evaluation-window-content-item');
			
			if (!currentColumn) return;

			const columnsElements = popoverRef.current.querySelectorAll('.evaluation-window-content-item');
			const currentColumnIndex = Array.from(columnsElements).indexOf(currentColumn);
			const currentColumnItems = currentColumn.querySelectorAll('[tabindex="0"]');
			const currentItemIndex = Array.from(currentColumnItems).indexOf(currentElement);

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					const nextItemIndex = currentItemIndex < currentColumnItems.length - 1 ? currentItemIndex + 1 : 0;
					(currentColumnItems[nextItemIndex] as HTMLElement).focus();
					break;
				case 'ArrowUp':
					e.preventDefault();
					const prevItemIndex = currentItemIndex > 0 ? currentItemIndex - 1 : currentColumnItems.length - 1;
					(currentColumnItems[prevItemIndex] as HTMLElement).focus();
					break;
				case 'ArrowRight':
					e.preventDefault();
					const nextColumnIndex = currentColumnIndex < columnsElements.length - 1 ? currentColumnIndex + 1 : 0;
					const nextColumnItems = columnsElements[nextColumnIndex].querySelectorAll('[tabindex="0"]');
					if (nextColumnItems.length > 0) {
						(nextColumnItems[0] as HTMLElement).focus();
					}
					break;
				case 'ArrowLeft':
					e.preventDefault();
					const prevColumnIndex = currentColumnIndex > 0 ? currentColumnIndex - 1 : columnsElements.length - 1;
					const prevColumnItems = columnsElements[prevColumnIndex].querySelectorAll('[tabindex="0"]');
					if (prevColumnItems.length > 0) {
						(prevColumnItems[0] as HTMLElement).focus();
					}
					break;
				case 'Escape':
					e.preventDefault();
					setIsOpen(false);
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, setIsOpen]);

	useEffect(() => {
		if (popoverRef.current && isOpen) {
			const firstFocusable = popoverRef.current.querySelector('[tabindex="0"]') as HTMLElement;
			if (firstFocusable) {
				setTimeout(() => firstFocusable.focus(), 150);
			}
		}
	}, [isOpen]);
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
						tabIndex={0}
						onClick={(): void => onChange(option.value)}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onChange(option.value);
							}
						}}
					>
						<Typography.Text>{option.label}</Typography.Text>
						{currentValue === option.value && <Check size={12} />}
					</div>
				))}
			</div>
		</div>
	);

	const getPopoverDetailedDescription = (): string => {
		const baseDescription = getDetailedDescription(evaluationWindow);
		
		if (evaluationWindow.windowType === 'rolling') {
			return `Rolling window: ${baseDescription}`;
		}
		
		if (evaluationWindow.windowType === 'cumulative') {
			if (!evaluationWindow.timeframe) {
				return 'Cumulative window: Select a timeframe to see configuration';
			}
			return `Cumulative window: ${baseDescription}`;
		}

		return baseDescription;
	};

	const renderSelectionContent = (): JSX.Element => {
		if (evaluationWindow.windowType === 'rolling' && evaluationWindow.timeframe !== 'custom') {
			return (
				<div className="selection-content">
					<Typography.Text>
						{getPopoverDetailedDescription()}
					</Typography.Text>
					<Typography.Text style={{ marginTop: '8px', fontSize: '12px', color: 'var(--bg-vanilla-400)' }}>
						A Rolling Window has a fixed size and shifts its starting point over time based on when the rules are evaluated.
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
						Select a timeframe to configure cumulative window
					</Typography.Text>
					<Typography.Text style={{ marginTop: '8px', fontSize: '12px', color: 'var(--bg-vanilla-400)' }}>
						A Cumulative Window has a fixed starting point and expands over time.
					</Typography.Text>
					<Button type="link">Read the docs</Button>
				</div>
			);
		}

		if (evaluationWindow.windowType === 'cumulative' && evaluationWindow.timeframe) {
			return (
				<div className="selection-content">
					<Typography.Text>
						{getPopoverDetailedDescription()}
					</Typography.Text>
					<Typography.Text style={{ marginTop: '8px', fontSize: '12px', color: 'var(--bg-vanilla-400)' }}>
						A Cumulative Window has a fixed starting point and expands over time.
					</Typography.Text>
					<div style={{ marginTop: '16px' }}>
						<EvaluationWindowDetails
							evaluationWindow={evaluationWindow}
							setEvaluationWindow={setEvaluationWindow}
						/>
					</div>
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
		<div className="evaluation-window-popover" ref={popoverRef}>
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
