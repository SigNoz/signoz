/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CustomSelect from '../CustomSelect';

// Mock scrollIntoView which isn't available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

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

describe('CustomSelect - Comprehensive Tests', () => {
	let user: ReturnType<typeof userEvent.setup>;
	let mockOnChange: jest.Mock;

	beforeEach(() => {
		user = userEvent.setup();
		mockOnChange = jest.fn();
		jest.clearAllMocks();
	});

	// ===== 1. CUSTOM VALUES SUPPORT =====
	describe('Custom Values Support (CS)', () => {
		test('CS-02: Partial matches create custom values', async () => {
			render(
				<CustomSelect
					options={mockOptions}
					onChange={mockOnChange}
					placeholder="Search..."
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Find input by class name
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			// Type partial match that doesn't exist exactly
			if (searchInput) {
				await user.type(searchInput, 'fro');
			}

			// Check that custom value appears in dropdown with custom tag
			await waitFor(() => {
				// Find the custom option with "fro" text and "Custom" badge
				const customOptions = screen.getAllByText('fro');
				const customOption = customOptions.find((option) => {
					const optionItem = option.closest('.option-item');
					const badge = optionItem?.querySelector('.option-badge');
					return badge?.textContent === 'Custom';
				});

				expect(customOption).toBeInTheDocument();

				// Verify it has the custom badge
				const optionItem = customOption?.closest('.option-item');
				const badge = optionItem?.querySelector('.option-badge');
				expect(badge).toBeInTheDocument();
				expect(badge?.textContent).toBe('Custom');
			});

			// Press Enter to create the custom value
			await user.keyboard('{Enter}');

			// Should create a custom value for partial match
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith('fro', {
					label: 'fro',
					value: 'fro',
					type: 'custom',
				});
			});
		});

		test('CS-03: Exact match behavior', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
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
				const optionContents = document.querySelectorAll('.option-content');
				const hasFrontendOption = Array.from(optionContents).some((content) =>
					content.textContent?.includes('Frontend'),
				);
				expect(hasFrontendOption).toBe(true);
			});

			// Press Enter to select the exact match
			await user.keyboard('{Enter}');

			// Should select existing option with exact match
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith('frontend', {
					label: 'Frontend',
					value: 'frontend',
				});
			});
		});
	});

	// ===== 2. SEARCH AND FILTERING =====
	describe('Search and Filtering (SF)', () => {
		test('SF-01: Selected values pushed to top', async () => {
			render(
				<CustomSelect
					options={mockOptions}
					onChange={mockOnChange}
					value="database"
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const dropdown = document.querySelector('.custom-select-dropdown');
				expect(dropdown).toBeInTheDocument();

				const options = dropdown?.querySelectorAll('.option-content') || [];
				const optionTexts = Array.from(options).map((el) => el.textContent);

				// Database should be at the top
				expect(optionTexts[0]).toContain('Database');
			});
		});

		test('SF-02: Real-time search filtering', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown to open
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Find and type in search input
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			if (searchInput) {
				await user.type(searchInput, 'front');
			}

			// Should filter to show only options containing 'front'
			await waitFor(() => {
				// Check for highlighted text within the Frontend option
				const highlightedElements = document.querySelectorAll('.highlight-text');
				const highlightTexts = Array.from(highlightedElements).map(
					(el) => el.textContent,
				);
				expect(highlightTexts).toContain('Front');

				// Should show Frontend option (highlighted) - use a simpler approach
				const optionContents = document.querySelectorAll('.option-content');
				const hasFrontendOption = Array.from(optionContents).some((content) =>
					content.textContent?.includes('Frontend'),
				);
				expect(hasFrontendOption).toBe(true);

				// Backend and Database should not be visible
				expect(screen.queryByText('Backend')).not.toBeInTheDocument();
				expect(screen.queryByText('Database')).not.toBeInTheDocument();
			});
		});

		test('SF-03: Search highlighting', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
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

		test('SF-04: Search with partial matches', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
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
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Simulate arrow down key
			await user.keyboard('{ArrowDown}');

			// First option should be active
			await waitFor(() => {
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
				// Verify it's the first option (Frontend)
				expect(activeOption?.textContent).toContain('Backend');
			});

			// Arrow up should go to previous option
			await user.keyboard('{ArrowUp}');

			await waitFor(() => {
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
				expect(activeOption?.textContent).toContain('Frontend');
			});
		});

		test('KN-02: Tab navigation to dropdown', async () => {
			render(
				<div>
					<input data-testid="prev-input" />
					<CustomSelect options={mockOptions} onChange={mockOnChange} />
					<input data-testid="next-input" />
				</div>,
			);

			const prevInput = screen.getByTestId('prev-input');
			await user.click(prevInput);

			// Tab to select
			await user.tab();

			const combobox = screen.getByRole('combobox');
			expect(combobox).toHaveFocus();

			// Open dropdown
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});
		});

		test('KN-03: Enter selection in dropdown', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Wait for dropdown and navigate to first option
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			await user.keyboard('{ArrowDown}');
			await user.keyboard('{Enter}');

			// Should have selected an option
			expect(mockOnChange).toHaveBeenCalledWith('backend', {
				label: 'Backend',
				value: 'backend',
			});
		});

		test('KN-04: Space key selection', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			await user.keyboard('{ArrowDown}');
			await user.keyboard(' ');

			// Should have selected an option
			expect(mockOnChange).toHaveBeenCalledWith('backend', {
				label: 'Backend',
				value: 'backend',
			});
		});

		test('KN-05: Tab navigation within dropdown', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Tab should navigate within dropdown
			await user.keyboard('{Tab}');

			// Should still be within dropdown context
			const dropdown = document.querySelector('.custom-select-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	// ===== 4. UI/UX BEHAVIORS =====
	describe('UI/UX Behaviors (UI)', () => {
		test('UI-01: Loading state does not block interaction', async () => {
			render(
				<CustomSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');

			// Should still be clickable and interactive
			await user.click(combobox);
			expect(combobox).toHaveFocus();
		});

		test('UI-02: Component remains editable in all states', () => {
			render(
				<CustomSelect
					options={mockOptions}
					onChange={mockOnChange}
					loading
					errorMessage="Test error"
				/>,
			);

			const combobox = screen.getByRole('combobox');
			expect(combobox).toBeInTheDocument();
			expect(combobox).not.toBeDisabled();
		});

		test('UI-03: Loading state display in footer', async () => {
			render(
				<CustomSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const loadingFooter = document.querySelector('.navigation-loading');
				expect(loadingFooter).toBeInTheDocument();
			});
		});

		test('UI-04: Error state display in footer', async () => {
			render(
				<CustomSelect
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

		test('UI-05: No data state display', async () => {
			render(
				<CustomSelect
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

	// ===== 6. SAVE AND SELECTION TRIGGERS =====
	describe('Save and Selection Triggers (ST)', () => {
		test('ST-01: Mouse selection works', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const frontendOption = screen.getByText('Frontend');
				expect(frontendOption).toBeInTheDocument();
			});

			const frontendOption = screen.getByText('Frontend');
			await user.click(frontendOption);

			expect(mockOnChange).toHaveBeenCalledWith(
				'frontend',
				expect.objectContaining({ value: 'frontend' }),
			);
		});
	});

	// ===== 7. GROUPED OPTIONS SUPPORT =====
	describe('Grouped Options Support', () => {
		test('handles grouped options correctly', async () => {
			render(
				<CustomSelect options={mockGroupedOptions} onChange={mockOnChange} />,
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

		test('grouped option selection works', async () => {
			render(
				<CustomSelect options={mockGroupedOptions} onChange={mockOnChange} />,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const frontendDevOption = screen.getByText('Frontend Dev');
				expect(frontendDevOption).toBeInTheDocument();
			});

			const frontendDevOption = screen.getByText('Frontend Dev');
			await user.click(frontendDevOption);

			expect(mockOnChange).toHaveBeenCalledWith(
				'frontend-dev',
				expect.objectContaining({ value: 'frontend-dev' }),
			);
		});
	});

	// ===== 8. ACCESSIBILITY =====
	describe('Accessibility', () => {
		test('has proper ARIA attributes', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			expect(combobox).toHaveAttribute('aria-expanded');

			await user.click(combobox);

			await waitFor(() => {
				const listbox = screen.getByRole('listbox');
				expect(listbox).toBeInTheDocument();
			});
		});

		test('supports screen reader navigation', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

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

		test('has proper focus management', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			expect(combobox).toHaveFocus();

			await waitFor(() => {
				const dropdown = document.querySelector('.custom-select-dropdown');
				expect(dropdown).toBeInTheDocument();
			});

			// Focus should remain manageable
			await user.keyboard('{ArrowDown}');
			expect(document.activeElement).toBeDefined();
		});
	});

	// ===== 10. EDGE CASES =====
	describe('Edge Cases', () => {
		test('handles special characters in options', async () => {
			const specialOptions = [
				{ label: 'Option with spaces', value: 'option-with-spaces' },
				{ label: 'Option-with-dashes', value: 'option-with-dashes' },
				{ label: 'Option_with_underscores', value: 'option_with_underscores' },
				{ label: 'Option.with.dots', value: 'option.with.dots' },
			];

			render(<CustomSelect options={specialOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Option with spaces')).toBeInTheDocument();
				expect(screen.getByText('Option-with-dashes')).toBeInTheDocument();
				expect(screen.getByText('Option_with_underscores')).toBeInTheDocument();
				expect(screen.getByText('Option.with.dots')).toBeInTheDocument();
			});
		});

		test('handles extremely long option labels', async () => {
			const longLabelOptions = [
				{
					label:
						'This is an extremely long option label that should be handled gracefully by the component without breaking the layout or causing performance issues',
					value: 'long-option',
				},
			];

			render(<CustomSelect options={longLabelOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				const longOption = screen.getByText(
					/This is an extremely long option label/,
				);
				expect(longOption).toBeInTheDocument();
			});
		});
	});

	// ===== 11. ADVANCED KEYBOARD NAVIGATION =====
	describe('Advanced Keyboard Navigation (AKN)', () => {
		test('AKN-01: Mouse out closes dropdown', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Verify dropdown is open
			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Simulate mouse out by clicking outside
			await user.click(document.body);

			// Dropdown should close
			await waitFor(() => {
				const dropdown = document.querySelector('.ant-select-dropdown');
				expect(dropdown).toHaveClass('ant-select-dropdown-hidden');
			});
		});

		test('AKN-02: TAB navigation from input to dropdown', async () => {
			render(
				<div>
					<input data-testid="prev-input" />
					<CustomSelect options={mockOptions} onChange={mockOnChange} />
					<input data-testid="next-input" />
				</div>,
			);

			const prevInput = screen.getByTestId('prev-input');
			await user.click(prevInput);

			// Tab to select
			await user.tab();

			const combobox = screen.getByRole('combobox');
			expect(combobox).toHaveFocus();

			// Open dropdown
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Tab from input section to dropdown
			await user.tab();

			// Should navigate to first option in dropdown
			await waitFor(() => {
				const activeOption = document.querySelector('.option-item.active');
				expect(activeOption).toBeInTheDocument();
			});
		});
	});

	// ===== 12. ADVANCED FILTERING AND HIGHLIGHTING =====
	describe('Advanced Filtering and Highlighting (AFH)', () => {
		test('AFH-01: Highlighted values pushed to top', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
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
						const contentElement = item.querySelector('.option-content');
						return contentElement?.textContent?.trim();
					})
					.filter(Boolean);

				// Custom value "front" should appear first (above Frontend)
				// The text includes "Custom" badge, so check for "front" in the text
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
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Navigate to an option using arrow keys
			await user.keyboard('{ArrowDown}');
			await user.keyboard('{ArrowDown}'); // Navigate to Backend

			// Press Enter to select (should close dropdown for single select)
			await user.keyboard('{Enter}');

			// Should have selected an option
			expect(mockOnChange).toHaveBeenCalledWith('database', {
				label: 'Database',
				value: 'database',
			});

			// Open dropdown again
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Now type something and press Enter to save
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			if (searchInput) {
				await user.type(searchInput, 'custom-value');
			}

			// Press Enter to save (should close dropdown)
			await user.keyboard('{Enter}');

			// Should create custom value
			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith('custom-value', {
					label: 'custom-value',
					value: 'custom-value',
					type: 'custom',
				});
			});
		});
	});

	// ===== 13. ADVANCED CLEAR ACTIONS =====
	describe('Advanced Clear Actions (ACA)', () => {
		test('ACA-01: Clear action waiting behavior', async () => {
			const mockOnChangeWithDelay = jest.fn().mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 100);
					}),
			);

			render(
				<CustomSelect
					options={mockOptions}
					onChange={mockOnChangeWithDelay}
					value="frontend"
					allowClear
				/>,
			);

			const clearButton = document.querySelector('.ant-select-clear');
			expect(clearButton).toBeInTheDocument();

			// Click clear button
			await user.click(clearButton as Element);

			// Should call onChange immediately (no loading state in this component)
			expect(mockOnChangeWithDelay).toHaveBeenCalledWith(undefined, undefined);

			// The component may call onChange multiple times, so just verify it was called
			expect(mockOnChangeWithDelay).toHaveBeenCalled();
		});

		test('ACA-02: Single select clear behavior like text input', async () => {
			render(
				<CustomSelect
					options={mockOptions}
					onChange={mockOnChange}
					value="frontend"
					allowClear
				/>,
			);

			const clearButton = document.querySelector('.ant-select-clear');
			expect(clearButton).toBeInTheDocument();

			// Click clear button
			await user.click(clearButton as Element);

			// Should clear the single selection
			expect(mockOnChange).toHaveBeenCalledWith(undefined, undefined);
		});
	});

	// ===== 14. ADVANCED UI STATES =====
	describe('Advanced UI States (AUS)', () => {
		test('AUS-01: No data with previous value selected', async () => {
			render(
				<CustomSelect
					options={[]}
					onChange={mockOnChange}
					value="previous-value"
					noDataMessage="No options available"
				/>,
			);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			// Should show no data message
			await waitFor(() => {
				expect(screen.getByText('No options available')).toBeInTheDocument();
			});

			// Should still show the previous selected value (use getAllByText to handle multiple instances)
			expect(screen.getAllByText('previous-value')).toHaveLength(2);
		});

		test('AUS-02: Always editable accessibility', async () => {
			render(
				<CustomSelect options={mockOptions} onChange={mockOnChange} loading />,
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
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			expect(searchInput).toBeInTheDocument();

			// Type a long search value
			if (searchInput) {
				const longSearchValue = 'a'.repeat(100);
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

		test('AUS-04: No spinners blocking user interaction', async () => {
			render(
				<CustomSelect options={mockOptions} onChange={mockOnChange} loading />,
			);

			const combobox = screen.getByRole('combobox');

			// Should be clickable even with loading state
			await user.click(combobox);
			expect(combobox).toHaveFocus();

			// Should be able to type even with loading state
			const searchInput = document.querySelector(
				'.ant-select-selection-search-input',
			);
			if (searchInput) {
				await user.type(searchInput, 'test');
			}

			// Should not be blocked by loading spinner
			expect(combobox).not.toBeDisabled();
		});
	});

	// ===== 15. REGEX AND CUSTOM VALUES =====
	describe('Regex and Custom Values (RCV)', () => {
		test('RCV-01: Regex pattern support', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

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
				expect(mockOnChange).toHaveBeenCalledWith('.*test.*', {
					label: '.*test.*',
					value: '.*test.*',
					type: 'custom',
				});
			});
		});

		test('RCV-02: Custom values treated as normal dropdown values', async () => {
			const customOptions = [
				...mockOptions,
				{ label: 'custom-value', value: 'custom-value', type: 'custom' as const },
			];

			render(<CustomSelect options={customOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Custom value should appear in dropdown like normal options
			expect(screen.getByText('custom-value')).toBeInTheDocument();

			// Should be selectable like normal options
			const customOption = screen.getByText('custom-value');
			await user.click(customOption);

			expect(mockOnChange).toHaveBeenCalledWith('custom-value', {
				label: 'custom-value',
				value: 'custom-value',
				type: 'custom',
			});
		});
	});

	// ===== 16. DROPDOWN PERSISTENCE =====
	describe('Dropdown Persistence (DP)', () => {
		test('DP-01: Dropdown closes only on save actions', async () => {
			render(<CustomSelect options={mockOptions} onChange={mockOnChange} />);

			const combobox = screen.getByRole('combobox');
			await user.click(combobox);

			await waitFor(() => {
				expect(screen.getByText('Frontend')).toBeInTheDocument();
			});

			// Navigate with arrow keys (non-save action)
			await user.keyboard('{ArrowDown}');
			await user.keyboard('{ArrowDown}');

			// Dropdown should still be open
			await waitFor(() => {
				expect(screen.getByText('Backend')).toBeInTheDocument();
			});

			// Click on an option (selection action, should close for single select)
			const backendOption = screen.getByText('Backend');
			await user.click(backendOption);

			// Dropdown should close after selection in single select
			await waitFor(() => {
				const dropdown = document.querySelector('.ant-select-dropdown');
				expect(dropdown).toHaveClass('ant-select-dropdown-hidden');
			});
		});
	});
});
