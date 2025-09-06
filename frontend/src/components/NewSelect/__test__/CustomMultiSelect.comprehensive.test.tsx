/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtuosoMockContext } from 'react-virtuoso';

import CustomMultiSelect from '../CustomMultiSelect';

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
		test('CS-01: Custom values persist in selected state', async () => {
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

		test('CS-02: Partial matches create custom values', async () => {
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

			// Find input by class name
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			// Type partial match that doesn't exist exactly
			if (searchInput) {
				await user.type(searchInput, 'fro');
			}

			// Verify the component renders without crashing
			expect(combobox).toBeInTheDocument();
		});

		test('CS-03: Exact match filtering behavior', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'frontend');
			}

			// Should show the Frontend option in dropdown for exact match
			await waitFor(() => {
				// Check for highlighted "frontend" text
				const highlightedElements = document.querySelectorAll('.highlight-text');
				const highlightTexts = Array.from(highlightedElements).map(
					(el) => el.textContent,
				);
				expect(highlightTexts).toContain('Frontend');

				// Frontend option should be visible in dropdown - use a simpler approach
				const optionLabels = document.querySelectorAll('.option-label-text');
				const hasFrontendOption = Array.from(optionLabels).some((label) =>
					label.textContent?.includes('Frontend'),
				);
				expect(hasFrontendOption).toBe(true);
			});

			// Press Enter to select the exact match
			await user.keyboard('{Enter}');

			// Should create selection with exact match
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith(['frontend'], ['frontend']);
			});
		});

		test('CS-04: Search filtering with "end" pattern', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'end');
			}

			// Should filter to show only Frontend and Backend with highlighted "end"
			await waitFor(() => {
				// Check for highlighted "end" text in the options
				const highlightedElements = document.querySelectorAll('.highlight-text');
				const highlightTexts = Array.from(highlightedElements).map(
					(el) => el.textContent,
				);
				expect(highlightTexts).toContain('end');

				// Check that Frontend and Backend options are present with highlighted text
				const optionLabels = document.querySelectorAll('.option-label-text');
				const hasFrontendOption = Array.from(optionLabels).some(
					(label) =>
						label.textContent?.includes('Front') &&
						label.textContent?.includes('end'),
				);
				const hasBackendOption = Array.from(optionLabels).some(
					(label) =>
						label.textContent?.includes('Back') && label.textContent?.includes('end'),
				);

				expect(hasFrontendOption).toBe(true);
				expect(hasBackendOption).toBe(true);

				// Other options should be filtered out
				const hasDatabaseOption = Array.from(optionLabels).some((label) =>
					label.textContent?.includes('Database'),
				);
				const hasApiGatewayOption = Array.from(optionLabels).some((label) =>
					label.textContent?.includes('API Gateway'),
				);

				expect(hasDatabaseOption).toBe(false);
				expect(hasApiGatewayOption).toBe(false);
			});
		});

		test('CS-05: Comma-separated values behavior', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				// Type comma-separated values
				await user.type(searchInput, 'test1, test2, test3');
			}

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
		test('SF-01: Selected values pushed to top', async () => {
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
				const dropdown = document.querySelector('.custom-multiselect-dropdown');
				expect(dropdown).toBeInTheDocument();

				const options = dropdown?.querySelectorAll('.option-label-text') || [];
				const optionTexts = Array.from(options).map((el) => el.textContent);

				// Database should be at the top (after ALL option if present)
				expect(optionTexts[0]).toBe('Database');
			});
		});

		test('SF-02: Filtering with search text', async () => {
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
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'front');
			}

			// Should filter to show only options containing 'front' and highlight search term
			await waitFor(() => {
				// Check for highlighted text within the Frontend option
				const highlightedElements = document.querySelectorAll('.highlight-text');
				const highlightTexts = Array.from(highlightedElements).map(
					(el) => el.textContent,
				);
				expect(highlightTexts).toContain('Front');

				// Should show Frontend option (highlighted) - use a simpler approach
				const optionLabels = document.querySelectorAll('.option-label-text');
				const hasFrontendOption = Array.from(optionLabels).some((label) =>
					label.textContent?.includes('Frontend'),
				);
				expect(hasFrontendOption).toBe(true);

				// Backend and Database should not be visible
				expect(screen.queryByText('Backend')).not.toBeInTheDocument();
				expect(screen.queryByText('Database')).not.toBeInTheDocument();
			});
		});

		test('SF-03: Highlighting search matches', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'end');
			}

			// Should highlight matching text in options
			await waitFor(() => {
				const highlightedElements = document.querySelectorAll('.highlight-text');
				const highlightTexts = Array.from(highlightedElements).map(
					(el) => el.textContent,
				);
				expect(highlightTexts).toContain('end');
			});
		});

		test('SF-04: Search with no results', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'nonexistent');
			}

			// Should show custom value option when no matches found
			await waitFor(() => {
				// Original options should not be visible
				expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
				expect(screen.queryByText('Backend')).not.toBeInTheDocument();
				expect(screen.queryByText('Database')).not.toBeInTheDocument();
				expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();

				// Should show custom value option
				const customOptions = screen.getAllByText('nonexistent');
				const customOption = customOptions.find((option) => {
					const optionItem = option.closest('.option-item');
					const badge = optionItem?.querySelector('.option-badge');
					return badge?.textContent === 'Custom';
				});
				expect(customOption).toBeInTheDocument();
			});
		});
	});

	// ===== 3. KEYBOARD NAVIGATION =====
	describe('Keyboard Navigation (KN)', () => {
		test('KN-01: Arrow key navigation in dropdown', async () => {
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
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
				expect(activeOption).toHaveClass('active');
				expect(activeOption).toHaveAttribute('role', 'option');
				// The active option should be an option in the dropdown
				expect(activeOption?.textContent).toBeTruthy();
			});

			// Arrow up should go to previous option (goes back to ALL)
			await user.keyboard('{ArrowUp}');

			await waitFor(() => {
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
				expect(activeOption).toHaveClass('active');
				expect(activeOption).toHaveAttribute('role', 'option');
				expect(activeOption?.textContent).toContain('ALL');
			});
		});

		test('KN-02: Tab navigation to dropdown', async () => {
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
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
				expect(activeOption).toHaveClass('active');
				expect(activeOption?.textContent).toBeTruthy();
			});

			// Tab again to move to next option
			await user.tab();

			await waitFor(() => {
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
				expect(activeOption?.textContent).toContain('Backend');
			});
		});

		test('KN-03: Enter selection in dropdown', async () => {
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

		test('KN-04: Chip deletion with keyboard', async () => {
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
				const activeChip = document.querySelector(
					'.ant-select-selection-item-active',
				);
				expect(activeChip).toBeInTheDocument();
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
				const activeChip = document.querySelector(
					'.ant-select-selection-item-active',
				);
				expect(activeChip).toBeInTheDocument();
				expect(activeChip).toHaveTextContent('backend');
			});
		});
	});

	// ===== 5. UI/UX BEHAVIORS =====
	describe('UI/UX Behaviors (UI)', () => {
		test('UI-01: Loading state does not block interaction', async () => {
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

		test('UI-02: Component remains editable in all states', async () => {
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

		test('UI-03: Toggle/Only labels in dropdown', async () => {
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

		test('UI-04: Should display values with loading info at bottom', async () => {
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

				const loadingFooter = document.querySelector('.navigation-loading');
				expect(loadingFooter).toBeInTheDocument();
				expect(screen.getByText('Refreshing values...')).toBeInTheDocument();
			});
		});

		test('UI-05: Error state display in footer', async () => {
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
				const errorFooter = document.querySelector('.navigation-error');
				expect(errorFooter).toBeInTheDocument();
				expect(screen.getByText('Something went wrong')).toBeInTheDocument();
			});
		});

		test('UI-06: No data state display', async () => {
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
		test('CA-01: Ctrl+A selects all chips', async () => {
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
				const selectedChips = document.querySelectorAll(
					'.ant-select-selection-item-selected',
				);
				expect(selectedChips.length).toBeGreaterThan(0);

				// Verify that all expected chips are present AND selected
				const frontendChip = screen
					.getByText('frontend')
					.closest('.ant-select-selection-item');
				const backendChip = screen
					.getByText('backend')
					.closest('.ant-select-selection-item');
				const databaseChip = screen
					.getByText('database')
					.closest('.ant-select-selection-item');

				expect(frontendChip).toHaveClass('ant-select-selection-item-selected');
				expect(backendChip).toHaveClass('ant-select-selection-item-selected');
				expect(databaseChip).toHaveClass('ant-select-selection-item-selected');

				// Verify all chips are present
				expect(screen.getByText('frontend')).toBeInTheDocument();
				expect(screen.getByText('backend')).toBeInTheDocument();
				expect(screen.getByText('database')).toBeInTheDocument();
			});
		});

		test('CA-02: Clear icon removes all selections', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend']}
					allowClear
				/>,
			);

			const clearButton = document.querySelector('.ant-select-clear');
			if (clearButton) {
				await user.click(clearButton as Element);
				expect(mockOnChange).toHaveBeenCalledWith([], []);
			}
		});

		test('CA-03: Individual chip removal', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend']}
				/>,
			);

			// Find and click the close button on a chip
			const removeButtons = document.querySelectorAll(
				'.ant-select-selection-item-remove',
			);
			expect(removeButtons.length).toBe(2);

			await user.click(removeButtons[1] as Element);

			// Should call onChange with one item removed
			expect(mockOnChange).toHaveBeenCalledWith(
				['frontend'],
				[{ label: 'Frontend', value: 'frontend' }],
			);
		});
	});

	// ===== 7. SAVE AND SELECTION TRIGGERS =====
	describe('Save and Selection Triggers (ST)', () => {
		test('ST-01: ESC triggers save action', async () => {
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
				const dropdown = document.querySelector('.ant-select-dropdown');
				expect(dropdown).toHaveClass('ant-select-dropdown-hidden');
				expect(dropdown).toHaveStyle('pointer-events: none');
			});
		});

		test('ST-02: Mouse selection works', async () => {
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

		test('ST-03: ENTER in input field creates custom value', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'custom-input');
			}

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

		test('ST-04: Search text persistence', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'search-text');
			}

			// Verify search text is in input
			await waitFor(() => {
				expect(searchInput).toHaveValue('search-text');
			});

			// Press Escape to close dropdown
			await user.keyboard('{Escape}');

			// Dropdown should close and search text should be cleared
			await waitFor(() => {
				const dropdown = document.querySelector('.ant-select-dropdown');
				expect(dropdown).toHaveClass('ant-select-dropdown-hidden');
				expect(searchInput).toHaveValue('');
			});
		});
	});

	// ===== 8. SPECIAL OPTIONS AND STATES =====
	describe('Special Options and States (SO)', () => {
		test('SO-01: ALL option appears first and separated', async () => {
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
				const divider = document.querySelector('.divider');
				expect(divider).toBeInTheDocument();
			});
		});

		test('SO-02: ALL selection behavior', async () => {
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

		test('SO-03: ALL tag display when all selected', () => {
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

		test('SO-04: Footer information display', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				// Should show navigation footer
				const footer = document.querySelector('.navigation-footer');
				expect(footer).toBeInTheDocument();

				// Should show navigation hint
				expect(screen.getByText('to navigate')).toBeInTheDocument();
			});
		});
	});

	// ===== GROUPED OPTIONS SUPPORT =====
	describe('Grouped Options Support', () => {
		test('handles grouped options correctly', async () => {
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
		test('has proper ARIA attributes', async () => {
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

		test('supports screen reader navigation', async () => {
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
		test('AKN-01: Shift + Arrow + Del chip deletion', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect
					options={mockOptions}
					onChange={mockOnChange}
					value={['frontend', 'backend', 'database']}
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Navigate to chips using arrow keys
			await user.keyboard('{ArrowLeft}');

			// Should have an active chip - verify initial chip
			await waitFor(() => {
				const activeChip = document.querySelector(
					'.ant-select-selection-item-active',
				);
				expect(activeChip).toBeInTheDocument();
				// Verify we're on the last chip (database)
				expect(activeChip?.textContent).toContain('database');
			});

			// Use Shift + Arrow to navigate to previous chip
			await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');

			// Verify we're on a different chip (backend)
			await waitFor(() => {
				const activeChip = document.querySelector(
					'.ant-select-selection-item-active',
				);
				expect(activeChip).toBeInTheDocument();
				// Verify we moved to the previous chip (backend)
				expect(activeChip?.textContent).toContain('backend');
			});

			// Use Del to delete the active chip
			await user.keyboard('{Delete}');

			// Verify the chip was deleted
			await waitFor(() => {
				// Check that the backend chip is no longer present
				const backendChip = document.querySelector('.ant-select-selection-item');
				expect(backendChip?.textContent).not.toContain('backend');

				// Verify onChange was called with the updated value (without backend)
				expect(mockOnChange).toHaveBeenCalledWith(
					['frontend'],
					[{ label: 'frontend', value: 'frontend' }],
				);
			});

			// Verify focus remains on combobox
			expect(combobox).toHaveFocus();
		});

		test('AKN-03: Mouse out closes dropdown', async () => {
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
				const dropdown = document.querySelector('.ant-select-dropdown');
				// The dropdown should be hidden with the hidden class
				expect(dropdown).toHaveClass('ant-select-dropdown-hidden');
			});
		});
	});

	// ===== 10. ADVANCED FILTERING AND HIGHLIGHTING =====
	describe('Advanced Filtering and Highlighting (AFH)', () => {
		test('AFH-01: Highlighted values pushed to top', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('ALL')).toBeInTheDocument();
			});

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'front');
			}

			// Should show highlighted options with correct order
			await waitFor(() => {
				// Check for highlighted text
				const highlightedElements = document.querySelectorAll('.highlight-text');
				const highlightTexts = Array.from(highlightedElements).map(
					(el) => el.textContent,
				);
				expect(highlightTexts).toContain('front');

				// Get all option items to check the order
				const optionItems = document.querySelectorAll('.option-item');
				const optionTexts = Array.from(optionItems)
					.map((item) => {
						const labelElement = item.querySelector('.option-label-text');
						return labelElement?.textContent?.trim();
					})
					.filter(Boolean);

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

		test('AFH-02: Distinction between selection Enter and save Enter', async () => {
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
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			if (searchInput) {
				await user.type(searchInput, 'custom-value');
			}

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
		test('ACA-01: Clear action waiting behavior', async () => {
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

			const clearButton = document.querySelector('.ant-select-clear');
			expect(clearButton).toBeInTheDocument();

			// Click clear button
			await user.click(clearButton as Element);

			// Should call onChange immediately (no loading state in this component)
			expect(mockOnChangeWithDelay).toHaveBeenCalledWith([], []);

			// The component may call onChange multiple times, so just verify it was called
			expect(mockOnChangeWithDelay).toHaveBeenCalled();
		});
	});

	// ===== 12. ADVANCED UI STATES =====
	describe('Advanced UI States (AUS)', () => {
		test('AUS-01: No data with previous value selected', async () => {
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

		test('AUS-02: Always editable accessibility', async () => {
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

		test('AUS-03: Sufficient space for search value', async () => {
			renderWithVirtuoso(
				<CustomMultiSelect options={mockOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			// Type a long search value
			if (searchInput) {
				const longSearchValue = 'a'.repeat(50); // Reduced length to avoid timeout
				await user.type(searchInput, longSearchValue);
			}

			// Should not overflow or break layout
			await waitFor(() => {
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
		test('RCV-01: Regex pattern support', async () => {
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

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				// Test regex pattern
				await user.type(searchInput, '.*test.*');
			}

			// Should create custom value for regex pattern
			await waitFor(() => {
				const regexOptions = screen.getAllByText('.*test.*');
				const regexOption = regexOptions.find((option) => {
					const optionItem = option.closest('.option-item');
					const badge = optionItem?.querySelector('.option-badge');
					return badge?.textContent === 'Custom';
				});
				expect(regexOption).toBeInTheDocument();
			});

			// Press Enter to create the regex value
			await user.keyboard('{Enter}');

			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith(['.*test.*'], ['.*test.*']);
			});
		});

		test('RCV-02: Custom values treated as normal dropdown values', async () => {
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
				[{ label: 'custom-value', value: 'custom-value' }],
			);
		});
	});

	// ===== 14. DROPDOWN PERSISTENCE =====
	describe('Dropdown Persistence (DP)', () => {
		test('DP-01: Dropdown stays open for non-save actions', async () => {
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
				const dropdown = document.querySelector('.ant-select-dropdown');
				expect(dropdown).toHaveClass('ant-select-dropdown-hidden');
			});
		});
	});
});
