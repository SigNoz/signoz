import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import * as timeUtils from 'utils/timeUtils';

import CustomTimePicker from './CustomTimePicker';

jest.mock('react-router-dom', () => {
	const actual = jest.requireActual('react-router-dom');

	return {
		...actual,
		useLocation: jest.fn().mockReturnValue({
			pathname: '/test-path',
		}),
	};
});

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useDispatch: jest.fn(() => jest.fn()),
	useSelector: jest.fn(() => ({
		minTime: 0,
		maxTime: Date.now(),
	})),
}));

jest.mock('providers/Timezone', () => {
	const actual = jest.requireActual('providers/Timezone');

	return {
		...actual,
		useTimezone: jest.fn().mockReturnValue({
			timezone: {
				value: 'UTC',
				offset: '+00:00',
				name: 'UTC',
			},
			browserTimezone: {
				value: 'UTC',
				offset: '+00:00',
				name: 'UTC',
			},
		}),
	};
});

interface WrapperProps {
	initialValue?: string;
	showLiveLogs?: boolean;
	onValidCustomDateChange?: () => void;
	onError?: () => void;
	onSelect?: (value: string) => void;
	onCustomDateHandler?: () => void;
	onCustomTimeStatusUpdate?: () => void;
}

function Wrapper({
	initialValue = '2024-01-01 00:00:00 - 2024-01-01 01:00:00',
	showLiveLogs = false,
	onValidCustomDateChange = (): void => {},
	onError = (): void => {},
	onSelect = (): void => {},
	onCustomDateHandler = (): void => {},
	onCustomTimeStatusUpdate = (): void => {},
}: WrapperProps): JSX.Element {
	const [open, setOpen] = useState(false);
	const [selectedTime, setSelectedTime] = useState('custom');
	const [selectedValue, setSelectedValue] = useState(initialValue);

	const handleSelect = (value: string): void => {
		setSelectedTime(value);
		onSelect(value);
	};

	return (
		<CustomTimePicker
			open={open}
			setOpen={setOpen}
			onSelect={handleSelect}
			onError={onError}
			selectedTime={selectedTime}
			selectedValue={selectedValue}
			onValidCustomDateChange={({ timeStr }): void => {
				setSelectedValue(timeStr);
				onValidCustomDateChange();
			}}
			onCustomDateHandler={(): void => {
				onCustomDateHandler();
			}}
			onCustomTimeStatusUpdate={(): void => {
				onCustomTimeStatusUpdate();
			}}
			items={[
				{ label: 'Last 5 minutes', value: '5m' },
				{ label: 'Custom', value: 'custom' },
			]}
			minTime={dayjs('2024-01-01 00:00:00').valueOf() * 1000_000}
			maxTime={dayjs('2024-01-01 01:00:00').valueOf() * 1000_000}
			showLiveLogs={showLiveLogs}
		/>
	);
}

describe('CustomTimePicker', () => {
	it('does not close or reset when clicking input while open', () => {
		render(<Wrapper />);

		const input = screen.getByRole('textbox');

		// Open popover
		fireEvent.focus(input);

		// Type some text
		fireEvent.change(input, { target: { value: '5m' } });

		// Click the input again while open
		fireEvent.mouseDown(input);
		fireEvent.click(input);

		// Value should remain as typed
		expect((input as HTMLInputElement).value).toBe('5m');
	});

	it('applies valid shorthand on Enter', () => {
		const onValid = jest.fn();
		const onError = jest.fn();

		render(<Wrapper onValidCustomDateChange={onValid} onError={onError} />);

		const input = screen.getByRole('textbox');

		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: '5m' } });
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(onValid).toHaveBeenCalledTimes(1);
		// onError(false) may be called by internal reset logic; we only assert that
		// it was never called with a truthy error state
		expect(onError).not.toHaveBeenCalledWith(true);
	});

	it('sets error and updates custom time status for invalid shorthand exceeding max allowed window', () => {
		const onValid = jest.fn();
		const onError = jest.fn();
		const onCustomTimeStatusUpdate = jest.fn();

		render(
			<Wrapper
				onValidCustomDateChange={onValid}
				onError={onError}
				onCustomTimeStatusUpdate={onCustomTimeStatusUpdate}
			/>,
		);

		const input = screen.getByRole('textbox');

		fireEvent.focus(input);
		// large number of days to ensure it exceeds the 15 months allowed window
		fireEvent.change(input, { target: { value: '9999d' } });
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(onError).toHaveBeenCalledWith(true);
		expect(onCustomTimeStatusUpdate).toHaveBeenCalledWith();
		expect(onValid).not.toHaveBeenCalled();
	});

	it('treats close after change like pressing Enter (blur + chevron)', () => {
		const onValid = jest.fn();
		const onError = jest.fn();

		render(<Wrapper onValidCustomDateChange={onValid} onError={onError} />);

		const input = screen.getByRole('textbox');

		// Open and change value so "changed since open" is true
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: '5m' } });
		fireEvent.blur(input);

		// Click the chevron (which triggers handleClose)
		const chevron = document.querySelector(
			'.time-input-suffix-icon-badge',
		) as HTMLElement;

		fireEvent.click(chevron);

		// Should have applied the value (same as Enter)
		expect(onValid).toHaveBeenCalledTimes(1);
		expect(onError).not.toHaveBeenCalledWith(true);
	});

	it('applies epoch start/end range on Enter via onCustomDateHandler', () => {
		const onCustomDateHandler = jest.fn();
		const onError = jest.fn();

		render(
			<Wrapper onCustomDateHandler={onCustomDateHandler} onError={onError} />,
		);

		const now = dayjs().valueOf();
		const later = dayjs().add(1, 'hour').valueOf();
		const input = screen.getByRole('textbox');

		fireEvent.focus(input);
		fireEvent.change(input, {
			target: { value: `${now} - ${later}` },
		});
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(onCustomDateHandler).toHaveBeenCalledTimes(1);
		expect(onError).not.toHaveBeenCalledWith(true);
	});

	it('uses validateTimeRange result for generic formatted ranges (valid case)', () => {
		const validateTimeRangeSpy = jest.spyOn(timeUtils, 'validateTimeRange');
		const onCustomDateHandler = jest.fn();
		const onError = jest.fn();

		validateTimeRangeSpy.mockReturnValue({
			isValid: true,
			errorDetails: undefined,
			startTimeMs: dayjs('2024-01-01 00:00:00').valueOf(),
			endTimeMs: dayjs('2024-01-01 01:00:00').valueOf(),
		});

		render(
			<Wrapper onCustomDateHandler={onCustomDateHandler} onError={onError} />,
		);

		const input = screen.getByRole('textbox');

		fireEvent.focus(input);
		fireEvent.change(input, {
			target: { value: 'foo - bar' },
		});
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(validateTimeRangeSpy).toHaveBeenCalled();
		expect(onCustomDateHandler).toHaveBeenCalledTimes(1);
		expect(onError).not.toHaveBeenCalledWith(true);

		validateTimeRangeSpy.mockRestore();
	});

	it('uses validateTimeRange result for generic formatted ranges (invalid case)', () => {
		const validateTimeRangeSpy = jest.spyOn(timeUtils, 'validateTimeRange');
		const onValid = jest.fn();
		const onError = jest.fn();

		validateTimeRangeSpy.mockReturnValue({
			isValid: false,
			errorDetails: {
				message: 'Invalid range',
				code: 'INVALID_RANGE',
				description: 'Start must be before end',
			},
			startTimeMs: 0,
			endTimeMs: 0,
		});

		render(<Wrapper onValidCustomDateChange={onValid} onError={onError} />);

		const input = screen.getByRole('textbox');

		fireEvent.focus(input);
		fireEvent.change(input, {
			target: { value: 'foo - bar' },
		});
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(validateTimeRangeSpy).toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(true);
		expect(onValid).not.toHaveBeenCalled();

		validateTimeRangeSpy.mockRestore();
	});

	it('opens live mode with correct label', () => {
		render(<Wrapper showLiveLogs />);

		const input = screen.getByRole('textbox');

		fireEvent.focus(input);

		expect((input as HTMLInputElement).value).toBe('Live');
	});
});
