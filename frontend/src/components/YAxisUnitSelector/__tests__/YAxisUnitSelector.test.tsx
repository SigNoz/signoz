import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { YAxisCategoryNames } from '../constants';
import { UniversalYAxisUnit, YAxisSource } from '../types';
import YAxisUnitSelector from '../YAxisUnitSelector';

describe('YAxisUnitSelector', () => {
	const mockOnChange = jest.fn();
	// antd injects its `pointer-events` styles via cssinjs in jsdom, but the SCSS
	// overrides aren't loaded — skip the pointer-events check so hovers/clicks register.
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		mockOnChange.mockClear();
		user = userEvent.setup({ pointerEventsCheck: 0 });
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

	it('calls onChange when a value is selected', async () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);
		const select = screen.getByRole('combobox');

		await user.click(select);
		await user.click(screen.getByText('Bytes (B)'));

		expect(mockOnChange).toHaveBeenCalledWith('By', {
			children: 'Bytes (B)',
			key: 'By',
			value: 'By',
		});
	});

	it('filters options based on search input', async () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);
		const select = screen.getByRole('combobox');

		await user.click(select);
		await user.type(select, 'bytes/sec');

		expect(screen.getByText('Bytes/sec')).toBeInTheDocument();
	});

	it('shows all categories and their units', async () => {
		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
			/>,
		);

		await user.click(screen.getByRole('combobox'));

		// Check for category headers
		expect(screen.getByText('Data')).toBeInTheDocument();
		expect(screen.getByText('Time')).toBeInTheDocument();

		// Check for some common units
		expect(screen.getByText('Bytes (B)')).toBeInTheDocument();
		expect(screen.getByText('Seconds (s)')).toBeInTheDocument();
	});

	it('shows warning message when incompatible unit is selected', async () => {
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
		await user.hover(warningIcon);
		await expect(
			screen.findByText(
				'Unit mismatch. The metric was sent with unit Seconds (s), but Bytes (B) is selected.',
			),
		).resolves.toBeInTheDocument();
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

	it('uses categories override to render custom units', async () => {
		const customCategories = [
			{
				name: YAxisCategoryNames.Data,
				units: [
					{
						id: UniversalYAxisUnit.BYTES,
						name: 'Custom Bytes (B)',
					},
				],
			},
		];

		render(
			<YAxisUnitSelector
				value=""
				onChange={mockOnChange}
				source={YAxisSource.ALERTS}
				categoriesOverride={customCategories}
			/>,
		);

		await user.click(screen.getByRole('combobox'));

		expect(screen.getByText('Custom Bytes (B)')).toBeInTheDocument();
		expect(screen.queryByText('Bytes (B)')).not.toBeInTheDocument();
	});
});
