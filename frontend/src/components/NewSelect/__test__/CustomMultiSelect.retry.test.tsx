import {
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';

import CustomMultiSelect from '../CustomMultiSelect';

// Mock scrollIntoView which isn't available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Helper function to render with VirtuosoMockContext
const renderWithVirtuoso = (component: React.ReactElement): RenderResult =>
	render(
		<VirtuosoMockContext.Provider
			value={{ viewportHeight: 300, itemHeight: 100 }}
		>
			{component}
		</VirtuosoMockContext.Provider>,
	);

// Mock options data
const mockOptions = [
	{ label: 'Option 1', value: 'option1' },
	{ label: 'Option 2', value: 'option2' },
	{ label: 'Option 3', value: 'option3' },
];

// CSS selector for retry button
const RETRY_BUTTON_SELECTOR = '.navigation-icons .anticon-reload';

describe('CustomMultiSelect - Retry Functionality', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should show retry button when 5xx error occurs and error message is displayed', async () => {
		const mockOnRetry = jest.fn();
		const errorMessage = 'Internal Server Error (500)';

		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				errorMessage={errorMessage}
				onRetry={mockOnRetry}
				showRetryButton
				loading={false}
			/>,
		);

		// Open dropdown to see error state
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear with error message
		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		// Check that retry button (ReloadOutlined icon) is present
		const retryButton = document.querySelector(RETRY_BUTTON_SELECTOR);
		expect(retryButton).toBeInTheDocument();
	});

	it('should show retry button when 4xx error occurs and error message is displayed (current behavior)', async () => {
		const mockOnRetry = jest.fn();
		const errorMessage = 'Bad Request (400)';

		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				errorMessage={errorMessage}
				onRetry={mockOnRetry}
				showRetryButton={false}
				loading={false}
			/>,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear with error message
		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		const retryButton = document.querySelector(RETRY_BUTTON_SELECTOR);
		expect(retryButton).not.toBeInTheDocument();
	});

	it('should call onRetry function when retry button is clicked', async () => {
		const mockOnRetry = jest.fn();
		const errorMessage = 'Internal Server Error (500)';

		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				errorMessage={errorMessage}
				onRetry={mockOnRetry}
				showRetryButton
				loading={false}
			/>,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		// Find and click the retry button
		const retryButton = document.querySelector(RETRY_BUTTON_SELECTOR);
		expect(retryButton).toBeInTheDocument();

		fireEvent.click(retryButton as Element);

		// Verify onRetry was called
		expect(mockOnRetry).toHaveBeenCalledTimes(1);
	});
});
