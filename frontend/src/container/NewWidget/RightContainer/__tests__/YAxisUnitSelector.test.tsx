/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

import YAxisUnitSelector from '../YAxisUnitSelector';

// Mock the dataFormatCategories to have predictable test data
jest.mock('../dataFormatCategories', () => ({
	flattenedCategories: [
		{ id: 'seconds', name: 'seconds (s)' },
		{ id: 'milliseconds', name: 'milliseconds (ms)' },
		{ id: 'hours', name: 'hours (h)' },
		{ id: 'minutes', name: 'minutes (m)' },
	],
}));

const MOCK_SECONDS = 'seconds';
const MOCK_MILLISECONDS = 'milliseconds';

describe('YAxisUnitSelector', () => {
	const defaultProps = {
		value: MOCK_SECONDS,
		onSelect: jest.fn(),
		fieldLabel: 'Y Axis Unit',
		handleClear: jest.fn(),
	};

	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		jest.clearAllMocks();
		user = userEvent.setup();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Rendering (Read) & (write)', () => {
		it('renders with correct field label', () => {
			render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			expect(screen.getByText('Y Axis Unit')).toBeInTheDocument();
			const input = screen.getByRole('combobox');

			expect(input).toHaveValue('seconds (s)');
		});

		it('renders with custom field label', () => {
			render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel="Custom Unit Label"
					handleClear={defaultProps.handleClear}
				/>,
			);
			expect(screen.getByText('Custom Unit Label')).toBeInTheDocument();
		});

		it('displays empty input when value prop is empty', () => {
			render(
				<YAxisUnitSelector
					value=""
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			expect(screen.getByDisplayValue('')).toBeInTheDocument();
		});

		it('shows placeholder text', () => {
			render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			expect(screen.getByPlaceholderText('Unit')).toBeInTheDocument();
		});

		it('handles numeric input', async () => {
			render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			const input = screen.getByRole('combobox');

			await user.clear(input);
			await user.type(input, '12345');
			expect(input).toHaveValue('12345');
		});

		it('handles mixed content input', async () => {
			render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			const input = screen.getByRole('combobox');

			await user.clear(input);
			await user.type(input, 'Test123!@#');
			expect(input).toHaveValue('Test123!@#');
		});
	});

	describe('State Management', () => {
		it('syncs input value with value prop changes', async () => {
			const { rerender } = render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			const input = screen.getByRole('combobox');

			// Initial value
			expect(input).toHaveValue('seconds (s)');

			// Change value prop
			rerender(
				<YAxisUnitSelector
					value={MOCK_MILLISECONDS}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);

			await waitFor(() => {
				expect(input).toHaveValue('milliseconds (ms)');
			});
		});

		it('handles empty value prop correctly', async () => {
			const { rerender } = render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			const input = screen.getByRole('combobox');

			// Change to empty value
			rerender(
				<YAxisUnitSelector
					value=""
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);

			await waitFor(() => {
				expect(input).toHaveValue('');
			});
		});

		it('handles invalid value prop gracefully', async () => {
			const { rerender } = render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			const input = screen.getByRole('combobox');

			// Change to invalid value
			rerender(
				<YAxisUnitSelector
					value="invalid_id"
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);

			await waitFor(() => {
				expect(input).toHaveValue('');
			});
		});

		it('maintains local state during typing', async () => {
			render(
				<YAxisUnitSelector
					value={defaultProps.value}
					onSelect={defaultProps.onSelect}
					fieldLabel={defaultProps.fieldLabel}
					handleClear={defaultProps.handleClear}
				/>,
			);
			const input = screen.getByRole('combobox');

			// first clear then type
			await user.clear(input);
			await user.type(input, 'test');
			expect(input).toHaveValue('test');

			// Value prop change should not override local typing
			await act(async () => {
				// Simulate prop change
				render(
					<YAxisUnitSelector
						value="bytes"
						onSelect={defaultProps.onSelect}
						fieldLabel={defaultProps.fieldLabel}
						handleClear={defaultProps.handleClear}
					/>,
				);
			});

			// Local typing should be preserved
			expect(input).toHaveValue('test');
		});
	});
});
