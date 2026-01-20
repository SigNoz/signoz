import { fireEvent, render, screen } from '@testing-library/react';

import { YAxisSource } from '../types';
import YAxisUnitSelector from '../YAxisUnitSelector';

describe('YAxisUnitSelector', () => {
	const mockOnChange = jest.fn();

	beforeEach(() => {
		mockOnChange.mockClear();
	});

	it('renders with default placeholder', () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);
		expect(screen.getByText('Please select a unit')).toBeInTheDocument();
	});

	it('renders with custom placeholder', () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				placeholder="Custom placeholder"
				source={YAxisSource.ALERTS}
			/>,
		);
		expect(screen.queryByText('Custom placeholder')).toBeInTheDocument();
	});

	it('calls onChange when a value is selected', () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);
		const select = screen.getByRole('combobox');

		fireEvent.mouseDown(select);
		const option = screen.getByText('Bytes (B)');
		fireEvent.click(option);

		expect(mockOnChange).toHaveBeenCalledWith('By', {
			children: 'Bytes (B)',
			key: 'By',
			value: 'By',
		});
	});

	it('filters options based on search input', () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);
		const select = screen.getByRole('combobox');

		fireEvent.mouseDown(select);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'bytes/sec' } });

		expect(screen.getByText('Bytes/sec')).toBeInTheDocument();
	});

	it('shows all categories and their units', () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);
		const select = screen.getByRole('combobox');

		fireEvent.mouseDown(select);

		// Check for category headers
		expect(screen.getByText('Data')).toBeInTheDocument();
		expect(screen.getByText('Time')).toBeInTheDocument();

		// Check for some common units
		expect(screen.getByText('Bytes (B)')).toBeInTheDocument();
		expect(screen.getByText('Seconds (s)')).toBeInTheDocument();
	});

	it('shows warning message when incompatible unit is selected', () => {
		render(
			<YAxisUnitSelector
				source={YAxisSource.ALERTS}
				value="By"
				onChange={mockOnChange}
				initialValue="s"
			/>,
		);
		const warningIcon = screen.getByLabelText('warning');
		expect(warningIcon).toBeInTheDocument();
		fireEvent.mouseOver(warningIcon);
		return screen
			.findByText(
				'Unit mismatch. The metric was sent with unit Seconds (s), but Bytes (B) is selected.',
			)
			.then((el) => expect(el).toBeInTheDocument());
	});

	it('does not show warning message when compatible unit is selected', () => {
		render(
			<YAxisUnitSelector
				source={YAxisSource.ALERTS}
				value="s"
				onChange={mockOnChange}
				initialValue="s"
			/>,
		);
		const warningIcon = screen.queryByLabelText('warning');
		expect(warningIcon).not.toBeInTheDocument();
	});
});
