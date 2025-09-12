import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TimeInput from '../TimeInput/TimeInput';

describe('TimeInput', () => {
	const mockOnChange = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render with default value', () => {
		render(<TimeInput />);

		expect(screen.getAllByDisplayValue('00')).toHaveLength(3); // hours, minutes, seconds
	});

	it('should render with provided value', () => {
		render(<TimeInput value="12:34:56" />);

		expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // hours
		expect(screen.getByDisplayValue('34')).toBeInTheDocument(); // minutes
		expect(screen.getByDisplayValue('56')).toBeInTheDocument(); // seconds
	});

	it('should handle value changes', () => {
		render(<TimeInput onChange={mockOnChange} />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		fireEvent.change(hoursInput, { target: { value: '12' } });

		expect(mockOnChange).toHaveBeenCalledWith('12:00:00');
	});

	it('should handle minutes changes', () => {
		render(<TimeInput onChange={mockOnChange} />);

		const minutesInput = screen.getAllByDisplayValue('00')[1];
		fireEvent.change(minutesInput, { target: { value: '30' } });

		expect(mockOnChange).toHaveBeenCalledWith('00:30:00');
	});

	it('should handle seconds changes', () => {
		render(<TimeInput onChange={mockOnChange} />);

		const secondsInput = screen.getAllByDisplayValue('00')[2];
		fireEvent.change(secondsInput, { target: { value: '45' } });

		expect(mockOnChange).toHaveBeenCalledWith('00:00:45');
	});

	it('should pad single digits with zeros', () => {
		render(<TimeInput onChange={mockOnChange} />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		fireEvent.change(hoursInput, { target: { value: '5' } });

		expect(mockOnChange).toHaveBeenCalledWith('05:00:00');
	});

	it('should filter non-numeric characters', () => {
		render(<TimeInput onChange={mockOnChange} />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		fireEvent.change(hoursInput, { target: { value: '1a2b3c' } });

		expect(mockOnChange).toHaveBeenCalledWith('12:00:00');
	});

	it('should limit input to 2 characters', () => {
		render(<TimeInput onChange={mockOnChange} />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		fireEvent.change(hoursInput, { target: { value: '123456' } });

		expect(hoursInput).toHaveValue('12');
		expect(mockOnChange).toHaveBeenCalledWith('12:00:00');
	});

	it('should handle keyboard navigation with ArrowRight', async () => {
		const user = userEvent.setup();
		render(<TimeInput />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		const minutesInput = screen.getAllByDisplayValue('00')[1];

		await user.click(hoursInput);
		await user.keyboard('{ArrowRight}');

		expect(minutesInput).toHaveFocus();
	});

	it('should handle keyboard navigation with ArrowLeft', async () => {
		const user = userEvent.setup();
		render(<TimeInput />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		const minutesInput = screen.getAllByDisplayValue('00')[1];

		await user.click(minutesInput);
		await user.keyboard('{ArrowLeft}');

		expect(hoursInput).toHaveFocus();
	});

	it('should handle Tab navigation', async () => {
		const user = userEvent.setup();
		render(<TimeInput />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		const minutesInput = screen.getAllByDisplayValue('00')[1];

		await user.click(hoursInput);
		await user.keyboard('{Tab}');

		expect(minutesInput).toHaveFocus();
	});

	it('should wrap around navigation from seconds to hours', async () => {
		const user = userEvent.setup();
		render(<TimeInput />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		const secondsInput = screen.getAllByDisplayValue('00')[2];

		await user.click(secondsInput);
		await user.keyboard('{ArrowRight}');

		expect(hoursInput).toHaveFocus();
	});

	it('should wrap around navigation from hours to seconds', async () => {
		const user = userEvent.setup();
		render(<TimeInput />);

		const hoursInput = screen.getAllByDisplayValue('00')[0];
		const secondsInput = screen.getAllByDisplayValue('00')[2];

		await user.click(hoursInput);
		await user.keyboard('{ArrowLeft}');

		expect(secondsInput).toHaveFocus();
	});

	it('should apply custom className', () => {
		const { container } = render(<TimeInput className="custom-class" />);

		expect(container.firstChild).toHaveClass(
			'time-input-container',
			'custom-class',
		);
	});

	it('should disable inputs when disabled prop is true', () => {
		render(<TimeInput disabled />);

		const inputs = screen.getAllByRole('textbox');
		inputs.forEach((input) => {
			expect(input).toBeDisabled();
		});
	});

	it('should update internal state when value prop changes', () => {
		const { rerender } = render(<TimeInput value="01:02:03" />);

		expect(screen.getByDisplayValue('01')).toBeInTheDocument();
		expect(screen.getByDisplayValue('02')).toBeInTheDocument();
		expect(screen.getByDisplayValue('03')).toBeInTheDocument();

		rerender(<TimeInput value="04:05:06" />);

		expect(screen.getByDisplayValue('04')).toBeInTheDocument();
		expect(screen.getByDisplayValue('05')).toBeInTheDocument();
		expect(screen.getByDisplayValue('06')).toBeInTheDocument();
	});

	it('should handle malformed time values gracefully', () => {
		render(<TimeInput value="invalid:time:format" />);

		// Should show the invalid values as they are
		expect(screen.getByDisplayValue('invalid')).toBeInTheDocument();
		expect(screen.getByDisplayValue('time')).toBeInTheDocument();
		expect(screen.getByDisplayValue('format')).toBeInTheDocument();
	});

	it('should handle partial time values', () => {
		render(<TimeInput value="12:34" />);

		// Should fall back to default values for incomplete format
		expect(screen.getAllByDisplayValue('00')).toHaveLength(3);
	});
});
