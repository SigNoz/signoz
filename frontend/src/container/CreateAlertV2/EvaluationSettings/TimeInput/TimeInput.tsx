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
				setHours(timeParts[0].padStart(2, '0'));
				setMinutes(timeParts[1].padStart(2, '0'));
				setSeconds(timeParts[2].padStart(2, '0'));
			}
		}
	}, [value]);

	// Format time value
	const formatTimeValue = (h: string, m: string, s: string): string =>
		`${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;

	// Handle input change
	const handleTimeChange = (
		newHours: string,
		newMinutes: string,
		newSeconds: string,
	): void => {
		const formattedValue = formatTimeValue(newHours, newMinutes, newSeconds);
		onChange?.(formattedValue);
	};

	// Handle hours change
	const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const newHours = e.target.value.replace(/\D/g, '').slice(0, 2);
		setHours(newHours);
		handleTimeChange(newHours, minutes, seconds);
	};

	// Handle minutes change
	const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const newMinutes = e.target.value.replace(/\D/g, '').slice(0, 2);
		setMinutes(newMinutes);
		handleTimeChange(hours, newMinutes, seconds);
	};

	// Handle seconds change
	const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const newSeconds = e.target.value.replace(/\D/g, '').slice(0, 2);
		setSeconds(newSeconds);
		handleTimeChange(hours, minutes, newSeconds);
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
		<div className={`time-input-container ${className}`}>
			<Input
				data-field="hours"
				value={hours}
				onChange={handleHoursChange}
				onKeyDown={(e): void => handleKeyDown(e, 'hours')}
				disabled={disabled}
				maxLength={2}
				className="time-input-field"
			/>
			<span className="time-input-separator">:</span>
			<Input
				data-field="minutes"
				value={minutes}
				onChange={handleMinutesChange}
				onKeyDown={(e): void => handleKeyDown(e, 'minutes')}
				disabled={disabled}
				maxLength={2}
				className="time-input-field"
			/>
			<span className="time-input-separator">:</span>
			<Input
				data-field="seconds"
				value={seconds}
				onChange={handleSecondsChange}
				onKeyDown={(e): void => handleKeyDown(e, 'seconds')}
				disabled={disabled}
				maxLength={2}
				className="time-input-field"
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
