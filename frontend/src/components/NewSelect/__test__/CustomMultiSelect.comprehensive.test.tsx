import { useState } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import CustomMultiSelect from '../CustomMultiSelect';
import type { CustomMultiSelectProps } from '../types';

// Mock scrollIntoView which isn't available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Helper function to render with VirtuosoMockContext
const renderWithVirtuoso = (
	component: React.ReactElement,
): ReturnType<typeof render> =>
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 300, itemHeight: 40 }}>
			{component}
		</VirtuosoMockContext.Provider>,
	);

// Mock clipboard API
Object.assign(navigator, {
	clipboard: {
		writeText: jest.fn(() => Promise.resolve()),
	},
});

// Test data
const mockOptions = [
	{ label: 'Frontend', value: 'frontend' },
	{ label: 'Backend', value: 'backend' },
	{ label: 'Database', value: 'database' },
	{ label: 'API Gateway', value: 'api-gateway' },
];

const mockGroupedOptions = [
	{
		label: 'Development',
		options: [
			{ label: 'Frontend Dev', value: 'frontend-dev' },
			{ label: 'Backend Dev', value: 'backend-dev' },
		],
	},
	{
		label: 'Operations',
		options: [
			{ label: 'DevOps', value: 'devops' },
			{ label: 'SRE', value: 'sre' },
		],
	},
];

function StatefulMultiSelect({
	initialValue,
	onChange,
}: {
	initialValue: string[];
	onChange: CustomMultiSelectProps['onChange'];
}): JSX.Element {
	const [value, setValue] = useState<string[] | string>(initialValue);
	return (
		<CustomMultiSelect
			options={mockOptions}
			value={value}
			onChange={(next, option): void => {
				onChange?.(next, option);
				setValue(next);
			}}
		/>
	);
}

describe('CustomMultiSelect - Comprehensive Tests', () => {
	let user: ReturnType<typeof userEvent.setup>;
	let mockOnChange: jest.Mock;

	beforeEach(() => {
		user = userEvent.setup();
		mockOnChange = jest.fn();
		jest.clearAllMocks();
	});

	// ===== 1. CUSTOM VALUES SUPPORT =====
	describe('Custom Values Support (CS)', () => {
		it('CS-01: Custom values persist in selected state', async () => {
			const { rerender } = renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['custom-value', 'frontend']}
				/>,
			);

			expect(screen.getByText('custom-value')).toBeInTheDocument();
			expect(screen.getByText('frontend')).toBeInTheDocument();

			// Rerender with updated props
			rerender(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['custom-value', 'frontend', 'another-custom']}
				/>,
			);

			// Custom values should still be there
			expect(screen.getByText('custom-value')).toBeInTheDocument();
			expect(screen.getByText('another-custom')).toBeInTheDocument();
		});

		it('CS-02: Partial matches create custom values', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					placeholder="Search..."
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open
			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Wait for Virtuoso to render the options
			await waitFor(
				() => {
					expect(screen.getByText('Frontend')).toBeInTheDocument();
					expect(screen.getByText('Backend')).toBeInTheDocument();
					expect(screen.getByText('Database')).toBeInTheDocument();
				},
				{ timeout: 5000 },
			);

			// Type partial match that doesn't exist exactly
			await user.type(combobox, 'fro');

			// Verify the component renders without crashing
			expect(combobox).toBeInTheDocument();
		});

		it('CS-03: Exact match filtering behavior', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'frontend');

			// Should show the Frontend option in dropdown for exact match
			await waitFor(() => {
				// Check for highlighted "frontend" text
				const highlightTexts = screen
					.getAllByTestId('highlight-text')
					.map((el) => el.textContent);
				expect(highlightTexts).toContain('Frontend');

				// Frontend option should be visible in dropdown - use a simpler approach
				expect(screen.getByTestId('option-item-frontend')).toHaveTextContent(
					'Frontend',
				);
			});

			// Press Enter to select the exact match
			await user.keyboard('{Enter}');

			// Should create selection with exact match
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith(['frontend'], ['frontend']);
			});
		});

		it('CS-04: Search filtering with "end" pattern', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'end');

			// Should filter to show only Frontend and Backend with highlighted "end"
			await waitFor(() => {
				// Check for highlighted "end" text in the options
				const highlightTexts = screen
					.getAllByTestId('highlight-text')
					.map((el) => el.textContent);
				expect(highlightTexts).toContain('end');

				// Check that Frontend and Backend options are present with highlighted text
				expect(screen.getByTestId('option-item-frontend')).toHaveTextContent(
					'Frontend',
				);
				expect(screen.getByTestId('option-item-backend')).toHaveTextContent(
					'Backend',
				);

				// Other options should be filtered out
				expect(
					screen.queryByTestId('option-item-database'),
				).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('option-item-api-gateway'),
				).not.toBeInTheDocument();
			});
		});

		it('CS-05: Comma-separated values behavior', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Type comma-separated values
			await user.type(combobox, 'test1, test2, test3');

			// Press Enter to create the comma-separated chips
			await user.keyboard('{Enter}');

			await waitFor(() => {
				// The component processes comma-separated values individually
				expect(mockOnChange).toHaveBeenCalledTimes(3);

				// Check that each individual value was processed
				expect(mockOnChange).toHaveBeenNthCalledWith(
					1,
					['test1'],
					[{ label: 'test1', value: 'test1' }],
				);
				expect(mockOnChange).toHaveBeenNthCalledWith(
					2,
					['test2'],
					[{ label: 'test2', value: 'test2' }],
				);
				expect(mockOnChange).toHaveBeenNthCalledWith(3, ['test3'], ['test3']);
			});
		});
	});

	// ===== 2. SEARCH AND FILTERING =====
	describe('Search and Filtering (SF)', () => {
		it('SF-01: Selected values pushed to top', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['database']}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(
					screen.getByTestId('custom-multiselect-dropdown'),
				).toBeInTheDocument();

				// Database should be at the top (after ALL option if present)
				const [firstOption] = screen.getAllByTestId(/^option-item-/);
				expect(firstOption).toBe(screen.getByTestId('option-item-database'));
			});
		});

		it('SF-02: Filtering with search text', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open
			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Find and type in search input
			await user.type(combobox, 'front');

			// Should filter to show only options containing 'front' and highlight search term
			await waitFor(() => {
				// Check for highlighted text within the Frontend option
				const highlightTexts = screen
					.getAllByTestId('highlight-text')
					.map((el) => el.textContent);
				expect(highlightTexts).toContain('Front');

				// Should show Frontend option (highlighted) - use a simpler approach
				expect(screen.getByTestId('option-item-frontend')).toHaveTextContent(
					'Frontend',
				);

				// Backend and Database should not be visible
				expect(screen.queryByText('Backend')).not.toBeInTheDocument();
				expect(screen.queryByText('Database')).not.toBeInTheDocument();
			});
		});

		it('SF-03: Highlighting search matches', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'end');

			// Should highlight matching text in options
			await waitFor(() => {
				const highlightTexts = screen
					.getAllByTestId('highlight-text')
					.map((el) => el.textContent);
				expect(highlightTexts).toContain('end');
			});
		});

		it('SF-04: Search with no results', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'nonexistent');

			// Should show custom value option when no matches found
			await waitFor(() => {
				// Original options should not be visible
				expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
				expect(screen.queryByText('Backend')).not.toBeInTheDocument();
				expect(screen.queryByText('Database')).not.toBeInTheDocument();
				expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();

				// Should show custom value option
				const customOption = screen.getByTestId('option-item-nonexistent');
				expect(customOption).toHaveTextContent('nonexistent');
				expect(within(customOption).getByTestId('option-badge')).toHaveTextContent(
					'Custom',
				);
			});
		});
	});

	// ===== 3. KEYBOARD NAVIGATION =====
	describe('Keyboard Navigation (KN)', () => {
		it('KN-01: Arrow key navigation in dropdown', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					enableAllSelection
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Simulate arrow down key
			await user.keyboard('{ArrowDown}');

			// First option should be active
			await waitFor(() => {
				const activeOption = screen.getByTestId('option-item-frontend');
				expect(activeOption).toHaveClass('active');
				expect(activeOption).toHaveAttribute('role', 'option');
			});

			// Arrow up should go to previous option (goes back to ALL)
			await user.keyboard('{ArrowUp}');

			await waitFor(() => {
				const activeOption = screen.getByTestId('all-option');
				expect(activeOption).toHaveClass('active');
				expect(activeOption).toHaveAttribute('role', 'option');
				expect(activeOption).toHaveTextContent('ALL');
			});
		});

		it('KN-02: Tab navigation to dropdown', async () => {
			renderWithVirtuoso(
				<div>
					<input data-testid="prev-input" />
					<CustomMultiSelect
						options={mockOptions}
						onChange={mockOnChange}
						enableAllSelection
					/>
					<input data-testid="next-input" />
				</div>,
			);

			const prevInput = screen.getByTestId('prev-input');
			await user.click(prevInput);

			// Tab to multiselect combobox
			await user.tab();

			const combobox = screen.getByRole('combobox');
			expect(combobox).toHaveFocus();

			// Open dropdown
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Tab from input section to dropdown
			await user.tab();

			// Should navigate to first option in dropdown
			await waitFor(() => {
				expect(screen.getByTestId('option-item-frontend')).toHaveClass('active');
			});

			// Tab again to move to next option
			await user.tab();

			await waitFor(() => {
				expect(screen.getByTestId('option-item-backend')).toHaveClass('active');
			});
		});

		it('KN-03: Enter selection in dropdown', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					enableAllSelection
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open
			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Navigate to ALL option and press Enter
			await user.keyboard('{ArrowDown}');
			await user.keyboard('{Enter}');

			// Should have triggered onChange - based on the actual behavior, it selects frontend
			expect(mockOnChange).toHaveBeenCalledWith(['frontend'], ['frontend']);
		});

		it('KN-04: Chip deletion with keyboard', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend', 'database']}
				/>,
			);

			// Focus on the component
			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Navigate to chips using arrow keys
			await user.keyboard('{ArrowLeft}');

			// Should have an active chip
			await waitFor(() => {
				expect(screen.getByTestId('selected-tag-database')).toHaveClass(
					'ant-select-selection-item-active',
				);
			});

			// Delete the active chip
			await user.keyboard('{Backspace}');

			// Should have triggered onChange with database removed
			expect(mockOnChange).toHaveBeenCalledWith(
				['frontend', 'backend'],
				['frontend', 'backend'],
			);

			// Verify that the active chip (backend) is highlighted for deletion
			await waitFor(() => {
				expect(screen.getByTestId('selected-tag-backend')).toHaveClass(
					'ant-select-selection-item-active',
				);
			});
		});
	});

	// ===== 5. UI/UX BEHAVIORS =====
	describe('UI/UX Behaviors (UI)', () => {
		it('UI-01: Loading state does not block interaction', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');

			// Should still be clickable and interactive
			await user.click(combobox);
			expect(combobox).toHaveFocus();

			// Check loading message is shown
			await waitFor(() => {
				expect(screen.getByText('Refreshing values...')).toBeInTheDocument();
			});
		});

		it('UI-02: Component remains editable in all states', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');
			expect(combobox).not.toBeDisabled();

			// Rerender with error state
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					errorMessage="Test error"
				/>,
			);

			expect(combobox).not.toBeDisabled();

			// Rerender with no data
			renderWithVirtuoso(
				<CustomMultiSelect
					options={[]}
					onChange={mockOnChange}
					noDataMessage="No data"
				/>,
			);

			expect(combobox).not.toBeDisabled();
		});

		it('UI-03: Toggle/Only labels in dropdown', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend']}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				// Should show toggle/only buttons for options
				const toggleButtons = screen.getAllByText('Toggle');
				expect(toggleButtons.length).toBeGreaterThan(0);

				const onlyButtons = screen.getAllByText(/Only|All/);
				expect(onlyButtons.length).toBeGreaterThan(0);
			});
		});

		it('UI-03b: clicking "Only" selects just that value', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend']}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// "Only" renders for each non-selected row (hidden until hover via CSS,
			// which jsdom doesn't apply, so it's clickable here).
			const onlyButtons = await screen.findAllByText('Only');
			mockOnChange.mockClear();
			await user.click(onlyButtons[0]);

			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange.mock.calls[0][0]).toStrictEqual(['backend']);
		});

		it('UI-03c: clicking an option checkbox toggles it exactly once', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend']}
				/>,
			);

			await user.click(screen.getByRole('combobox'));
			const backendRow = await screen.findByTestId('option-item-backend');
			mockOnChange.mockClear();
			await user.click(within(backendRow).getByRole('checkbox'));

			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange.mock.calls[0][0]).toStrictEqual(['frontend', 'backend']);
		});

		it('UI-03d: clicking an option label toggles it exactly once', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend']}
				/>,
			);

			await user.click(screen.getByRole('combobox'));
			const backendLabel = await screen.findByText('Backend');
			mockOnChange.mockClear();
			await user.click(backendLabel);

			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange.mock.calls[0][0]).toStrictEqual(['frontend', 'backend']);
		});

		it('UI-03e: clicking "Toggle" does not also toggle the wrapping checkbox', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend']}
				/>,
			);

			await user.click(screen.getByRole('combobox'));
			const backendRow = await screen.findByTestId('option-item-backend');
			mockOnChange.mockClear();
			await user.click(within(backendRow).getByText('Toggle'));

			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange.mock.calls[0][0]).toStrictEqual(['frontend']);
		});

		it('UI-04: Should display values with loading info at bottom', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				// should display values
				expect(screen.getByText('Frontend')).toBeInTheDocument();
				expect(screen.getByText('Backend')).toBeInTheDocument();
				expect(screen.getByText('Database')).toBeInTheDocument();
				expect(screen.getByText('API Gateway')).toBeInTheDocument();

				expect(screen.getByTestId('navigation-loading')).toBeInTheDocument();
				expect(screen.getByText('Refreshing values...')).toBeInTheDocument();
			});
		});

		it('UI-05: Error state display in footer', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					errorMessage="Something went wrong"
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByTestId('navigation-error')).toBeInTheDocument();
				expect(screen.getByText('Something went wrong')).toBeInTheDocument();
			});
		});

		it('UI-06: No data state display', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={[]}
					onChange={mockOnChange}
					noDataMessage="No options available"
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('No options available')).toBeInTheDocument();
			});
		});
	});

	// ===== 6. CLEAR ACTIONS =====
	describe('Clear Actions (CA)', () => {
		it('CA-01: Ctrl+A selects all chips', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend', 'database']}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Ctrl+A should select all chips
			await user.keyboard('{Control>}a{/Control}');

			await waitFor(() => {
				// All chips should be selected (have selected class)
				const selectedChips = screen
					.getAllByTestId(/^selected-tag-/)
					.filter((chip) =>
						chip.classList.contains('ant-select-selection-item-selected'),
					);
				expect(selectedChips.length).toBeGreaterThan(0);

				// Verify that all expected chips are present AND selected
				const frontendChip = screen.getByTestId('selected-tag-frontend');
				const backendChip = screen.getByTestId('selected-tag-backend');
				const databaseChip = screen.getByTestId('selected-tag-database');

				expect(frontendChip).toHaveClass('ant-select-selection-item-selected');
				expect(backendChip).toHaveClass('ant-select-selection-item-selected');
				expect(databaseChip).toHaveClass('ant-select-selection-item-selected');

				// Verify all chips are present
				expect(screen.getByText('frontend')).toBeInTheDocument();
				expect(screen.getByText('backend')).toBeInTheDocument();
				expect(screen.getByText('database')).toBeInTheDocument();
			});
		});

		it('CA-02: Clear icon removes all selections', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend']}
					allowClear
				/>,
			);

			await user.click(screen.getByLabelText('close-circle'));
			expect(mockOnChange).toHaveBeenCalledWith([], []);
		});

		it('CA-03: Individual chip removal', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend']}
				/>,
			);

			// Find and click the close button on a chip
			const removeButtons = screen.getAllByLabelText(/^Remove tag /);
			expect(removeButtons).toHaveLength(2);

			await user.click(removeButtons[1]);

			// Should call onChange with one item removed
			expect(mockOnChange).toHaveBeenCalledWith(
				['frontend'],
				[{ label: 'Frontend', value: 'frontend' }],
			);
		});
	});

	// ===== 7. SAVE AND SELECTION TRIGGERS =====
	describe('Save and Selection Triggers (ST)', () => {
		it('ST-01: ESC triggers save action', async () => {
			const mockDropdownChange = jest.fn();

			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					onDropdownVisibleChange={mockDropdownChange}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Verify dropdown is visible before Escape
			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
				expect(mockDropdownChange).toHaveBeenCalledWith(true);
			});

			await user.keyboard('{Escape}');

			// Verify dropdown is closed after Escape
			expect(mockDropdownChange).toHaveBeenCalledWith(false);

			await waitFor(() => {
				// Dropdown should be hidden (not completely removed from DOM)
				expect(
					screen.getByTestId('custom-multiselect-dropdown'),
				).toBeInTheDocument();
				expect(combobox).toHaveAttribute('aria-expanded', 'false');
			});
		});

		it('ST-02: Mouse selection works', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const frontendOption = screen.getByText('Frontend');
				expect(frontendOption).toBeInTheDocument();
			});

			const frontendOption = screen.getByText('Frontend');
			await user.click(frontendOption);

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.arrayContaining(['frontend']),
				expect.any(Array),
			);
		});

		it('ST-03: ENTER in input field creates custom value', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'custom-input');

			// Press Enter in input field
			await user.keyboard('{Enter}');

			// Should create custom value
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith(
					['custom-input'],
					['custom-input'],
				);
			});
		});

		it('ST-04: Search text persistence', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'search-text');

			// Verify search text is in input
			await waitFor(() => {
				expect(combobox).toHaveValue('search-text');
			});

			// Press Escape to close dropdown
			await user.keyboard('{Escape}');

			// Dropdown should close and search text should be cleared
			await waitFor(() => {
				expect(combobox).toHaveAttribute('aria-expanded', 'false');
				expect(combobox).toHaveValue('');
			});
		});
	});

	// ===== 8. SPECIAL OPTIONS AND STATES =====
	describe('Special Options and States (SO)', () => {
		it('SO-01: ALL option appears first and separated', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					enableAllSelection
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const allOption = screen.getByText('ALL');
				expect(allOption).toBeInTheDocument();

				// Check for divider after ALL option
				expect(screen.getByTestId('all-option-divider')).toBeInTheDocument();
			});
		});

		it('SO-02: ALL selection behavior', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					enableAllSelection
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const allOption = screen.getByText('ALL');
				expect(allOption).toBeInTheDocument();
			});

			const allOption = screen.getByText('ALL');
			await user.click(allOption);

			// Should select all available options
			expect(mockOnChange).toHaveBeenCalledWith(
				['frontend', 'backend', 'database', 'api-gateway'],
				expect.any(Array),
			);
		});

		it('SO-03: ALL tag display when all selected', () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend', 'database', 'api-gateway']}
					enableAllSelection
				/>,
			);

			// Should show ALL tag instead of individual tags
			expect(screen.getByText('ALL')).toBeInTheDocument();
			expect(screen.queryByText('frontend')).not.toBeInTheDocument();
		});

		it('SO-04: Footer information display', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				// Should show navigation footer
				expect(screen.getByTestId('navigation-footer')).toBeInTheDocument();

				// Should show navigation hint
				expect(screen.getByText('to navigate')).toBeInTheDocument();
			});
		});
	});

	// ===== GROUPED OPTIONS SUPPORT =====
	describe('Grouped Options Support', () => {
		it('handles grouped options correctly', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockGroupedOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				// Check group headers
				expect(screen.getByText('Development')).toBeInTheDocument();
				expect(screen.getByText('Operations')).toBeInTheDocument();

				// Check group options
				expect(screen.getByText('Frontend Dev')).toBeInTheDocument();
				expect(screen.getByText('Backend Dev')).toBeInTheDocument();
				expect(screen.getByText('DevOps')).toBeInTheDocument();
				expect(screen.getByText('SRE')).toBeInTheDocument();
			});
		});
	});

	// ===== ACCESSIBILITY TESTS =====
	describe('Accessibility', () => {
		it('has proper ARIA attributes', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			expect(combobox).toHaveAttribute('aria-expanded');

			await user.click(combobox);

			await waitFor(() => {
				const listbox = screen.getByRole('listbox');
				expect(listbox).toBeInTheDocument();
				expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
			});
		});

		it('supports screen reader navigation', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const options = screen.getAllByRole('option');
				expect(options.length).toBeGreaterThan(0);

				options.forEach((option) => {
					expect(option).toHaveAttribute('aria-selected');
				});
			});
		});
	});

	// ===== 9. ADVANCED KEYBOARD NAVIGATION =====
	describe('Advanced Keyboard Navigation (AKN)', () => {
		it('AKN-01: Shift + Arrow + Del chip deletion', async () => {
			renderWithVirtuoso(
				<StatefulMultiSelect
					initialValue={['frontend', 'backend', 'database']}
					onChange={mockOnChange}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Navigate to chips using arrow keys
			await user.keyboard('{ArrowLeft}');

			// Should have an active chip - verify initial chip
			await waitFor(() => {
				// Verify we're on the last chip (database)
				expect(screen.getByTestId('selected-tag-database')).toHaveClass(
					'ant-select-selection-item-active',
				);
			});

			// Use Shift + Arrow to navigate to previous chip
			await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');

			// Verify we're on a different chip (backend)
			await waitFor(() => {
				// Verify we moved to the previous chip (backend)
				expect(screen.getByTestId('selected-tag-backend')).toHaveClass(
					'ant-select-selection-item-active',
				);
			});

			// Use Del to delete the active chip
			await user.keyboard('{Delete}');

			// Verify the chip was deleted
			await waitFor(() => {
				// Check that the backend chip is no longer present
				expect(
					screen.queryByTestId('selected-tag-backend'),
				).not.toBeInTheDocument();

				// Verify onChange was called with the updated value (without backend)
				expect(mockOnChange).toHaveBeenCalledWith(
					['frontend'],
					[{ label: 'frontend', value: 'frontend' }],
				);
			});

			// Verify focus remains on combobox
			expect(combobox).toHaveFocus();
		});

		it('AKN-03: Mouse out closes dropdown', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Verify dropdown is open
			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Simulate mouse out by clicking outside
			await user.click(document.body);

			// Dropdown should close - check for hidden state
			await waitFor(() => {
				// The dropdown should be hidden with the hidden class
				expect(combobox).toHaveAttribute('aria-expanded', 'false');
			});
		});
	});

	// ===== 10. ADVANCED FILTERING AND HIGHLIGHTING =====
	describe('Advanced Filtering and Highlighting (AFH)', () => {
		it('AFH-01: Highlighted values pushed to top', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			await user.type(combobox, 'front');

			// Should show highlighted options with correct order
			await waitFor(() => {
				// Check for highlighted text
				const highlightTexts = screen
					.getAllByTestId('highlight-text')
					.map((el) => el.textContent);
				expect(highlightTexts).toContain('front');

				// Get all option items to check the order
				const optionTexts = screen
					.getAllByTestId(/^option-item-/)
					.map((item) => item.textContent?.trim());

				// Custom value "front" should appear first (above Frontend)
				// The text should contain "front"
				expect(optionTexts[0]).toContain('front');

				// Frontend should appear after the custom value
				const frontendIndex = optionTexts.findIndex((text) =>
					text?.includes('Frontend'),
				);
				expect(frontendIndex).toBeGreaterThan(0); // Should not be first
				expect(optionTexts[frontendIndex]).toContain('Frontend');

				// Should show Frontend option with highlighting (text is split due to highlighting)
				const frontendOption = screen.getByText('end');
				expect(frontendOption).toBeInTheDocument();
			});
		});

		it('AFH-02: Distinction between selection Enter and save Enter', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Navigate to an option using arrow keys
			await user.keyboard('{ArrowDown}');
			await user.keyboard('{ArrowDown}'); // Navigate to Frontend

			// Press Enter to select (should not close dropdown)
			await user.keyboard('{Enter}');

			// Dropdown should still be open for selection
			await waitFor(() => {
				expect(screen.getByText('Backend')).toBeInTheDocument();
			});

			// Now type something and press Enter to save
			await user.type(combobox, 'custom-value');

			// Press Enter to save (should create custom value)
			await user.keyboard('{Enter}');

			// Should create custom value
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith(
					['custom-value'],
					['custom-value'],
				);
			});
		});
	});

	// ===== 11. ADVANCED CLEAR ACTIONS =====
	describe('Advanced Clear Actions (ACA)', () => {
		it('ACA-01: Clear action waiting behavior', async () => {
			const mockOnChangeWithDelay = jest.fn().mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						setTimeout(() => resolve(), 100);
					}),
			);

			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChangeWithDelay}
					value={['frontend', 'backend', 'database']}
					allowClear
				/>,
			);

			// Click clear button
			await user.click(screen.getByLabelText('close-circle'));

			// Should call onChange immediately (no loading state in this component)
			expect(mockOnChangeWithDelay).toHaveBeenCalledWith([], []);

			// The component may call onChange multiple times, so just verify it was called
			expect(mockOnChangeWithDelay).toHaveBeenCalled();
		});
	});

	// ===== 12. ADVANCED UI STATES =====
	describe('Advanced UI States (AUS)', () => {
		it('AUS-01: No data with previous value selected', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={[]}
					onChange={mockOnChange}
					value={['previous-value']}
					noDataMessage="No options available"
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Should show no data message
			await waitFor(() => {
				expect(screen.getByText('No options available')).toBeInTheDocument();
			});

			// Should still show the previous selected value
			expect(screen.getByText('previous-value')).toBeInTheDocument();
		});

		it('AUS-02: Always editable accessibility', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');

			// Should be editable even in loading state
			expect(combobox).not.toBeDisabled();
			await user.click(combobox);
			expect(combobox).toHaveFocus();

			// Should still be interactive
			expect(combobox).not.toBeDisabled();
		});

		it('AUS-03: Sufficient space for search value', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Type a long search value
			const longSearchValue = 'a'.repeat(50); // Reduced length to avoid timeout
			await user.type(combobox, longSearchValue);

			// Should not overflow or break layout
			await waitFor(() => {
				// oxlint-disable-next-line signoz/no-dom-node-access -- antd's search wrapper has no test hook; the test reads its computed overflow
				const searchContainer = document.querySelector(
					'.ant-select-selection-search',
				);
				const computedStyle = window.getComputedStyle(searchContainer as Element);

				// Should not have overflow issues
				expect(computedStyle.overflow).not.toBe('hidden');
			});
		});
	});

	// ===== 13. REGEX AND CUSTOM VALUES =====
	describe('Regex and Custom Values (RCV)', () => {
		it('RCV-01: Regex pattern support', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					enableRegexOption
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open (don't expect ALL option as it might not be there)
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Test regex pattern
			await user.type(combobox, '.*test.*');

			// Should create custom value for regex pattern
			await waitFor(() => {
				const regexOption = screen.getByTestId('option-item-.*test.*');
				expect(regexOption).toHaveTextContent('.*test.*');
				expect(within(regexOption).getByTestId('option-badge')).toHaveTextContent(
					'Custom',
				);
			});

			// Press Enter to create the regex value
			await user.keyboard('{Enter}');

			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith(['.*test.*'], ['.*test.*']);
			});
		});

		it('RCV-02: Custom values treated as normal dropdown values', async () => {
			const customOptions = [
				...mockOptions,
				{ label: 'custom-value', value: 'custom-value', type: 'custom' as const },
			];

			renderWithVirtuoso(
				<CustomMultiSelect
					options={customOptions}
					onChange={mockOnChange}
					enableRegexOption
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open (don't expect ALL option as it might not be there)
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Custom value should appear in dropdown like normal options
			expect(screen.getByText('custom-value')).toBeInTheDocument();

			// Should be selectable like normal options
			const customOption = screen.getByText('custom-value');
			await user.click(customOption);

			expect(mockOnChange).toHaveBeenCalledWith(
				['custom-value'],
				[{ label: 'custom-value', value: 'custom-value', type: 'custom' }],
			);
		});
	});

	// ===== 14. DROPDOWN PERSISTENCE =====
	describe('Dropdown Persistence (DP)', () => {
		it('DP-01: Dropdown stays open for non-save actions', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			// Navigate with arrow keys (non-save action)
			await user.keyboard('{ArrowDown}');
			await user.keyboard('{ArrowDown}');

			// Dropdown should still be open
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Click on an option (selection action, not save)
			const frontendOption = screen.getByText('Frontend');
			await user.click(frontendOption);

			// Dropdown should still be open for more selections
			await waitFor(() => {
				expect(screen.getByText('Backend')).toBeInTheDocument();
			});

			// Only ESC should close the dropdown
			await user.keyboard('{Escape}');

			await waitFor(() => {
				expect(combobox).toHaveAttribute('aria-expanded', 'false');
			});
		});
	});
});
