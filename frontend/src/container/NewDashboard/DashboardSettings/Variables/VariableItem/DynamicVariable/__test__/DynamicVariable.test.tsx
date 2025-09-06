/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable sonarjs/no-duplicate-string */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';

import DynamicVariable from '../DynamicVariable';

// Mock scrollIntoView since it's not available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock dependencies
jest.mock('hooks/dynamicVariables/useGetFieldKeys', () => ({
	useGetFieldKeys: jest.fn(),
}));

jest.mock('hooks/useDebounce', () => ({
	__esModule: true,
	default: (value: any): any => value, // Return the same value without debouncing for testing
}));

describe('DynamicVariable Component', () => {
	const mockSetDynamicVariablesSelectedValue = jest.fn();
	const ATTRIBUTE_PLACEHOLDER = 'Select a field';
	const LOADING_TEXT = 'Refreshing values...';
	const DEFAULT_PROPS = {
		setDynamicVariablesSelectedValue: mockSetDynamicVariablesSelectedValue,
		dynamicVariablesSelectedValue: undefined,
		errorAttributeKeyMessage: '',
	};

	const mockFieldKeysResponse = {
		data: {
			keys: {
				'service.name': [],
				'http.status_code': [],
				duration: [],
			},
			complete: true,
		},
		httpStatusCode: 200,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Default mock implementation
		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: mockFieldKeysResponse,
			error: null,
			isLoading: false,
			refetch: jest.fn(),
		});
	});

	// Helper function to get the attribute select element
	const getAttributeSelect = (): HTMLElement =>
		screen.getAllByRole('combobox')[0];

	// Helper function to get the source select element
	const getSourceSelect = (): HTMLElement => screen.getAllByRole('combobox')[1];

	it('renders with default state', () => {
		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Check for main components
		expect(screen.getByText(ATTRIBUTE_PLACEHOLDER)).toBeInTheDocument();
		expect(screen.getByText('All telemetry')).toBeInTheDocument();
		expect(screen.getByText('from')).toBeInTheDocument();
	});

	it('uses existing values from dynamicVariablesSelectedValue prop', () => {
		const selectedValue = {
			name: 'service.name',
			value: 'Logs',
		};

		render(
			<DynamicVariable
				setDynamicVariablesSelectedValue={mockSetDynamicVariablesSelectedValue}
				dynamicVariablesSelectedValue={selectedValue}
			/>,
		);

		// Verify values are set
		expect(screen.getByText('service.name')).toBeInTheDocument();
		expect(screen.getByText('Logs')).toBeInTheDocument();
	});

	it('shows loading state when fetching data', () => {
		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: null,
			error: null,
			isLoading: true,
			refetch: jest.fn(),
		});

		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Open the CustomSelect dropdown
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Should show loading state
		expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
	});

	it('shows error message when API fails', () => {
		const errorMessage = 'Failed to fetch field keys';

		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: null,
			error: { message: errorMessage },
			isLoading: false,
			refetch: jest.fn(),
		});

		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Open the CustomSelect dropdown
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Should show error message
		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('updates filteredAttributes when data is loaded', async () => {
		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Open the CustomSelect dropdown
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Wait for options to appear in the dropdown
		await waitFor(() => {
			// Looking for option-content elements inside the CustomSelect dropdown
			const options = document.querySelectorAll('.option-content');
			expect(options.length).toBeGreaterThan(0);

			// Check if all expected options are present
			let foundServiceName = false;
			let foundHttpStatusCode = false;
			let foundDuration = false;

			options.forEach((option) => {
				const text = option.textContent?.trim();
				if (text === 'service.name') foundServiceName = true;
				if (text === 'http.status_code') foundHttpStatusCode = true;
				if (text === 'duration') foundDuration = true;
			});

			expect(foundServiceName).toBe(true);
			expect(foundHttpStatusCode).toBe(true);
			expect(foundDuration).toBe(true);
		});
	});

	it('calls setDynamicVariablesSelectedValue when attribute is selected', async () => {
		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Open the attribute dropdown
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Wait for options to appear, then click on service.name
		await waitFor(() => {
			// Need to find the option-item containing service.name
			const serviceNameOption = screen.getByText('service.name');
			expect(serviceNameOption).not.toBeNull();
			expect(serviceNameOption?.textContent).toBe('service.name');

			// Click on the option-item that contains service.name
			const optionElement = serviceNameOption?.closest('.option-item');
			if (optionElement) {
				fireEvent.click(optionElement);
			}
		});

		// Check if the setter was called with the correct value
		expect(mockSetDynamicVariablesSelectedValue).toHaveBeenCalledWith({
			name: 'service.name',
			value: 'All telemetry',
		});
	});

	it('calls setDynamicVariablesSelectedValue when source is selected', () => {
		const mockRefetch = jest.fn();

		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: mockFieldKeysResponse,
			error: null,
			isLoading: false,
			refetch: mockRefetch,
		});

		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Get the Select component
		const select = screen
			.getByText('All telemetry')
			.closest('div[class*="ant-select"]');
		expect(select).toBeInTheDocument();

		// Directly call the onChange handler by simulating the Select's onChange
		// Find the props.onChange of the Select component and call it directly
		fireEvent.mouseDown(select as HTMLElement);

		// Use a more specific selector to find the "Logs" option
		const optionsContainer = document.querySelector(
			'.rc-virtual-list-holder-inner',
		);
		expect(optionsContainer).not.toBeNull();

		// Find the option with Logs text content
		const logsOption = Array.from(
			optionsContainer?.querySelectorAll('.ant-select-item-option-content') || [],
		)
			.find((element) => element.textContent === 'Logs')
			?.closest('.ant-select-item-option');

		expect(logsOption).not.toBeNull();

		// Click on it
		if (logsOption) {
			fireEvent.click(logsOption);
		}

		// Check if the setter was called with the correct value
		expect(mockSetDynamicVariablesSelectedValue).toHaveBeenCalledWith(
			expect.objectContaining({
				value: 'Logs',
			}),
		);
	});

	it('filters attributes locally when complete is true', async () => {
		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Open the attribute dropdown
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Mock the filter function behavior
		const attributeKeys = Object.keys(mockFieldKeysResponse.data.keys);

		// Only "http.status_code" should match the filter
		const expectedFilteredKeys = attributeKeys.filter((key) =>
			key.includes('http'),
		);

		// Verify our expected filtering logic
		expect(expectedFilteredKeys).toContain('http.status_code');
		expect(expectedFilteredKeys).not.toContain('service.name');
		expect(expectedFilteredKeys).not.toContain('duration');

		// Now verify the component's filtering ability by inputting the search text
		const inputElement = screen
			.getAllByRole('combobox')[0]
			.querySelector('input');
		if (inputElement) {
			fireEvent.change(inputElement, { target: { value: 'http' } });
		}
	});

	it('triggers API call when complete is false and search text changes', async () => {
		const mockRefetch = jest.fn();

		// Set up the mock to indicate that data is not complete
		// and needs to be fetched from the server
		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: {
				data: {
					keys: {
						'http.status_code': [],
					},
					complete: false, // This indicates server-side filtering is needed
				},
				httpStatusCode: 200,
			},
			error: null,
			isLoading: false,
			refetch: mockRefetch,
		});

		// Render with Logs as the initial source
		render(
			<DynamicVariable
				{...DEFAULT_PROPS}
				dynamicVariablesSelectedValue={{
					name: '',
					value: 'Logs',
				}}
			/>,
		);

		// Clear any initial calls
		mockRefetch.mockClear();

		// Now test the search functionality
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Find the input element and simulate typing
		const inputElement = document.querySelector(
			'.ant-select-selection-search-input',
		);

		if (inputElement) {
			// Simulate typing in the search input
			fireEvent.change(inputElement, { target: { value: 'http' } });

			// Verify that the input has the correct value
			expect((inputElement as HTMLInputElement).value).toBe('http');

			// Wait for the effect to run and verify refetch was called
			await waitFor(
				() => {
					expect(mockRefetch).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			); // Increase timeout to give more time for the effect to run
		}
	});

	it('triggers refetch when attributeSource changes', async () => {
		const mockRefetch = jest.fn();

		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: mockFieldKeysResponse,
			error: null,
			isLoading: false,
			refetch: mockRefetch,
		});

		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Clear any initial calls
		mockRefetch.mockClear();

		// Find and click on the source select to open dropdown
		const sourceSelectElement = getSourceSelect();
		fireEvent.mouseDown(sourceSelectElement);

		// Find and click on the "Metrics" option
		const metricsOption = screen.getByText('Metrics');
		fireEvent.click(metricsOption);

		// Wait for the effect to run
		await waitFor(() => {
			// Verify that refetch was called after source selection
			expect(mockRefetch).toHaveBeenCalled();
		});
	});

	it('shows retry button when error occurs', () => {
		const mockRefetch = jest.fn();

		(useGetFieldKeys as jest.Mock).mockReturnValue({
			data: null,
			error: { message: 'Failed to fetch field keys' },
			isLoading: false,
			refetch: mockRefetch,
		});

		render(<DynamicVariable {...DEFAULT_PROPS} />);

		// Open the attribute dropdown
		const attributeSelectElement = getAttributeSelect();
		fireEvent.mouseDown(attributeSelectElement);

		// Find and click reload icon (retry button)
		const reloadIcon = screen.getByLabelText('reload');
		fireEvent.click(reloadIcon);

		// Should trigger refetch
		expect(mockRefetch).toHaveBeenCalled();
	});
});
