import { render, screen, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';

import AroundTimeContainer from './AroundTimeContainer';

// Mock antd Select so we can test option selection easily
jest.mock('antd', () => {
	const actual = jest.requireActual('antd');
	return {
		...actual,
		Select: Object.assign(
			({
				value,
				onChange,
				options,
				'data-testid': testId,
			}: {
				value: string;
				onChange: (v: string) => void;
				options: { label: string; value: string }[];
				'data-testid'?: string;
			}): JSX.Element => (
				<select
					data-testid={testId ?? 'around-time-offset-select'}
					value={value}
					onChange={(e): void => onChange(e.target.value)}
				>
					{options.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			),
			{ Option: actual.Select.Option },
		),
	};
});

// Mock the Calendar component from @signozhq/ui/calendar
jest.mock('@signozhq/ui/calendar', () => ({
	Calendar: ({
		onSelect,
	}: {
		mode: string;
		selected: Date | undefined;
		onSelect: (date: Date | undefined) => void;
		disabled?: unknown;
	}): JSX.Element => (
		<button
			data-testid="mock-calendar"
			type="button"
			onClick={(): void => onSelect(new Date('2025-06-16'))}
		>
			Select Date
		</button>
	),
}));

describe('AroundTimeContainer', () => {
	const mockOnApply = jest.fn();
	const mockOnCancel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the calendar, offset select, and action buttons', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
		expect(screen.getByTestId('around-time-offset-select')).toBeInTheDocument();
		expect(screen.getByTestId('around-time-apply')).toBeInTheDocument();
		expect(screen.getByTestId('around-time-cancel')).toBeInTheDocument();
	});

	it('shows time inputs immediately (always visible, no layout shift)', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		// Time inputs are always rendered regardless of date selection
		expect(screen.getByTestId('around-time-input-hour')).toBeInTheDocument();
		expect(screen.getByTestId('around-time-input-minute')).toBeInTheDocument();
		expect(screen.getByTestId('around-time-input-second')).toBeInTheDocument();
	});

	it('disables Apply button when no date is selected', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		expect(screen.getByTestId('around-time-apply')).toBeDisabled();
	});

	it('enables Apply button after selecting a date', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		fireEvent.click(screen.getByTestId('mock-calendar'));

		expect(screen.getByTestId('around-time-apply')).not.toBeDisabled();
	});

	it('calls onCancel when Cancel button is clicked', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		fireEvent.click(screen.getByTestId('around-time-cancel'));
		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('calls onApply with correct range when Apply is clicked', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		// Select date
		fireEvent.click(screen.getByTestId('mock-calendar'));

		// Apply with default offset ±15m at 12:00:00
		fireEvent.click(screen.getByTestId('around-time-apply'));

		expect(mockOnApply).toHaveBeenCalledTimes(1);

		const [range] = mockOnApply.mock.calls;
		const [from, to] = range[0] as [
			ReturnType<typeof dayjs>,
			ReturnType<typeof dayjs>,
		];
		expect(from).not.toBeNull();
		expect(to).not.toBeNull();

		// The range should be ±15m = 30 minutes total
		const diffMs = to.valueOf() - from.valueOf();
		expect(diffMs).toBe(2 * 15 * 60 * 1000);
	});

	it('selecting a preset in the Select updates offset', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		const select = screen.getByTestId('around-time-offset-select');
		fireEvent.change(select, { target: { value: '1h' } });

		// No error hint should appear for a valid preset
		expect(screen.queryByText(/Use format:/i)).not.toBeInTheDocument();
	});

	it('selecting Custom shows the free-text offset input', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		const select = screen.getByTestId('around-time-offset-select');
		fireEvent.change(select, { target: { value: '__custom__' } });

		expect(screen.getByTestId('around-time-offset-input')).toBeInTheDocument();
	});

	it('shows error hint for invalid custom offset', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		// Switch to custom first
		fireEvent.change(screen.getByTestId('around-time-offset-select'), {
			target: { value: '__custom__' },
		});

		const offsetInput = screen.getByTestId('around-time-offset-input');
		fireEvent.change(offsetInput, { target: { value: 'invalid' } });

		expect(screen.getByText(/Use format:/i)).toBeInTheDocument();
	});

	it('does not show error hint when custom offset is empty', () => {
		render(<AroundTimeContainer onApply={mockOnApply} onCancel={mockOnCancel} />);

		fireEvent.change(screen.getByTestId('around-time-offset-select'), {
			target: { value: '__custom__' },
		});

		const offsetInput = screen.getByTestId('around-time-offset-input');
		fireEvent.change(offsetInput, { target: { value: '' } });

		expect(screen.queryByText(/Use format:/i)).not.toBeInTheDocument();
	});
});
