import './TimeInput.scss';

import { Input } from 'antd';
import React, { useEffect, useState } from 'react';

export interface TimeInputProps {
	value?: string; // Format: "HH:MM:SS"
	onChange?: (value: string) => void;
	disabled?: boolean;
	className?: string;
}

function TimeInput({
	value = '00:00:00',
	onChange,
	disabled = false,
	className = '',
}: TimeInputProps): JSX.Element {
	const [hours, setHours] = useState('00');
	const [minutes, setMinutes] = useState('00');
	const [seconds, setSeconds] = useState('00');

	// Parse initial value
	useEffect(() => {
		if (value) {
			const timeParts = value.split(':');
			if (timeParts.length === 3) {
				setHours(timeParts[0]);
				setMinutes(timeParts[1]);
				setSeconds(timeParts[2]);
			}
		}
	}, [value]);

	const notifyChange = (h: string, m: string, s: string): void => {
		const rawValue = `${h}:${m}:${s}`;
		onChange?.(rawValue);
	};

	const notifyFormattedChange = (h: string, m: string, s: string): void => {
		const formattedValue = `${h.padStart(2, '0')}:${m.padStart(
			2,
			'0',
		)}:${s.padStart(2, '0')}`;
		onChange?.(formattedValue);
	};

	const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		let newHours = e.target.value.replace(/\D/g, '');

		if (newHours.length > 2) {
			newHours = newHours.slice(0, 2);
		}

		if (newHours && parseInt(newHours, 10) > 23) {
			newHours = '23';
		}
		setHours(newHours);
		notifyChange(newHours, minutes, seconds);
	};

	const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		let newMinutes = e.target.value.replace(/\D/g, '');
		if (newMinutes.length > 2) {
			newMinutes = newMinutes.slice(0, 2);
		}
		if (newMinutes && parseInt(newMinutes, 10) > 59) {
			newMinutes = '59';
		}
		setMinutes(newMinutes);
		notifyChange(hours, newMinutes, seconds);
	};

	const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		let newSeconds = e.target.value.replace(/\D/g, '');
		if (newSeconds.length > 2) {
			newSeconds = newSeconds.slice(0, 2);
		}
		if (newSeconds && parseInt(newSeconds, 10) > 59) {
			newSeconds = '59';
		}
		setSeconds(newSeconds);
		notifyChange(hours, minutes, newSeconds);
	};

	const handleHoursBlur = (): void => {
		const formattedHours = hours.padStart(2, '0');
		setHours(formattedHours);
		notifyFormattedChange(formattedHours, minutes, seconds);
	};

	const handleMinutesBlur = (): void => {
		const formattedMinutes = minutes.padStart(2, '0');
		setMinutes(formattedMinutes);
		notifyFormattedChange(hours, formattedMinutes, seconds);
	};

	const handleSecondsBlur = (): void => {
		const formattedSeconds = seconds.padStart(2, '0');
		setSeconds(formattedSeconds);
		notifyFormattedChange(hours, minutes, formattedSeconds);
	};

	// Helper functions for field navigation
	const getNextField = (current: string): string => {
		switch (current) {
			case 'hours':
				return 'minutes';
			case 'minutes':
				return 'seconds';
			default:
				return 'hours';
		}
	};

	const getPrevField = (current: string): string => {
		switch (current) {
			case 'seconds':
				return 'minutes';
			case 'minutes':
				return 'hours';
			default:
				return 'seconds';
		}
	};

	// Handle key navigation
	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
		currentField: 'hours' | 'minutes' | 'seconds',
	): void => {
		if (e.key === 'ArrowRight' || e.key === 'Tab') {
			e.preventDefault();
			const nextField = document.querySelector(
				`[data-field="${getNextField(currentField)}"]`,
			) as HTMLInputElement;
			nextField?.focus();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			const prevField = document.querySelector(
				`[data-field="${getPrevField(currentField)}"]`,
			) as HTMLInputElement;
			prevField?.focus();
		}
	};

	return (
		<div data-testid="time-input" className={`time-input-container ${className}`}>
			<Input
				data-field="hours"
				value={hours}
				onChange={handleHoursChange}
				onBlur={handleHoursBlur}
				onKeyDown={(e): void => handleKeyDown(e, 'hours')}
				disabled={disabled}
				maxLength={2}
				className="time-input-field"
				placeholder="00"
				data-testid="time-input-hours"
			/>
			<span className="time-input-separator">:</span>
			<Input
				data-field="minutes"
				value={minutes}
				onChange={handleMinutesChange}
				onBlur={handleMinutesBlur}
				onKeyDown={(e): void => handleKeyDown(e, 'minutes')}
				disabled={disabled}
				maxLength={2}
				className="time-input-field"
				placeholder="00"
				data-testid="time-input-minutes"
			/>
			<span className="time-input-separator">:</span>
			<Input
				data-field="seconds"
				value={seconds}
				onChange={handleSecondsChange}
				onBlur={handleSecondsBlur}
				onKeyDown={(e): void => handleKeyDown(e, 'seconds')}
				disabled={disabled}
				maxLength={2}
				className="time-input-field"
				placeholder="00"
				data-testid="time-input-seconds"
			/>
		</div>
	);
}

TimeInput.defaultProps = {
	value: '00:00:00',
	onChange: undefined,
	disabled: false,
	className: '',
};

export default TimeInput;
