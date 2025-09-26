/* eslint-disable sonarjs/no-duplicate-string */

import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { ContextLinksData } from 'types/api/dashboard/getAll';

import ContextLinks from '../index';

// Mock data for testing
const MOCK_EMPTY_CONTEXT_LINKS: ContextLinksData = {
	linksData: [],
};

const MOCK_CONTEXT_LINKS: ContextLinksData = {
	linksData: [
		{
			id: '1',
			label: 'Dashboard 1',
			url: 'https://example.com/dashboard1',
		},
		{
			id: '2',
			label: 'External Tool',
			url: 'https://external.com/tool',
		},
		{
			id: '3',
			label: 'Grafana',
			url: 'https://grafana.example.com',
		},
	],
};

// Test wrapper component
const renderWithProviders = (
	component: React.ReactElement,
): ReturnType<typeof render> =>
	render(
		<Provider store={store}>
			<MemoryRouter>{component}</MemoryRouter>
		</Provider>,
	);

describe('ContextLinks Component', () => {
	describe('Component Rendering & Initial State', () => {
		it('should render correctly with existing context links', () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Check that the component renders
			expect(screen.getByText('Context Links')).toBeInTheDocument();

			// Check that the add button is present
			expect(
				screen.getByRole('button', { name: /context link/i }),
			).toBeInTheDocument();

			// Check that all context link items are displayed
			expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
			expect(screen.getByText('External Tool')).toBeInTheDocument();
			expect(screen.getByText('Grafana')).toBeInTheDocument();

			// Check that URLs are displayed
			expect(
				screen.getByText('https://example.com/dashboard1'),
			).toBeInTheDocument();
			expect(screen.getByText('https://external.com/tool')).toBeInTheDocument();
			expect(screen.getByText('https://grafana.example.com')).toBeInTheDocument();
		});

		it('should show "Context Link" add button', () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Check that the add button is present and has correct text
			const addButton = screen.getByRole('button', { name: /context link/i });
			expect(addButton).toBeInTheDocument();
			expect(addButton).toHaveTextContent('Context Link');
			expect(addButton).toHaveClass('add-context-link-button');
		});
	});

	describe('Add Context Link Functionality', () => {
		it('should show "Add a context link" title in modal when adding new link', () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Click the add button to open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Check that modal content is displayed
			expect(screen.getByText('Add a context link')).toBeInTheDocument();

			// Check that save and cancel buttons are present
			expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
		});

		it('should call setContextLinks when saving new context link', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Click the add button to open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Fill in the form fields using placeholder text
			const labelInput = screen.getByPlaceholderText(
				'View Traces details: {{_traceId}}',
			);
			fireEvent.change(labelInput, { target: { value: 'New Link' } });
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			);
			fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

			// Click save button in modal
			const saveButton = screen.getByRole('button', { name: /save/i });
			fireEvent.click(saveButton);

			// Wait for the modal to close and state to update
			await waitFor(() => {
				expect(screen.queryByText('Add a context link')).not.toBeInTheDocument();
			});

			// Verify that setContextLinks was called
			expect(mockSetContextLinks).toHaveBeenCalledTimes(1);

			// setContextLinks is called with a function (state updater)
			const setContextLinksCall = mockSetContextLinks.mock.calls[0][0];
			expect(typeof setContextLinksCall).toBe('function');

			// Test the function by calling it with the current state
			const result = setContextLinksCall(MOCK_EMPTY_CONTEXT_LINKS);
			expect(result).toEqual({
				linksData: [
					{
						id: expect.any(String), // ID is generated dynamically
						label: 'New Link',
						url: 'https://example.com',
					},
				],
			});
		});

		it('should close modal when cancel button is clicked', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Click the add button to open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Modal should be visible
			expect(screen.getByText('Add a context link')).toBeInTheDocument();

			// Click cancel button
			const cancelButton = screen.getByRole('button', { name: /cancel/i });
			fireEvent.click(cancelButton);

			// Modal should be closed
			await waitFor(() => {
				expect(screen.queryByText('Add a context link')).not.toBeInTheDocument();
			});
		});

		it('should not call setContextLinks when cancel button is clicked', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Click the add button to open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Click cancel button
			const cancelButton = screen.getByRole('button', { name: /cancel/i });
			fireEvent.click(cancelButton);

			// Wait for modal to close
			await waitFor(() => {
				expect(screen.queryByText('Add a context link')).not.toBeInTheDocument();
			});

			// Verify that setContextLinks was not called
			expect(mockSetContextLinks).not.toHaveBeenCalled();
		});

		it('should show form fields in the modal', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Click the add button to open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Check that form field labels are present
			expect(screen.getByText('Label')).toBeInTheDocument();
			expect(screen.getByText('URL')).toBeInTheDocument();

			// Check that form field inputs are present using placeholder text
			const labelInput = screen.getByPlaceholderText(
				'View Traces details: {{_traceId}}',
			);
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			);
			expect(labelInput.tagName).toBe('INPUT');
			expect(urlInput.tagName).toBe('INPUT');
		});

		it('should validate form fields before saving', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Click the add button to open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Try to save without filling required fields
			const saveButton = screen.getByRole('button', { name: /save/i });
			fireEvent.click(saveButton);

			// Form validation should prevent saving
			await waitFor(() => {
				expect(mockSetContextLinks).not.toHaveBeenCalled();
			});

			// Modal should still be open
			expect(screen.getByText('Add a context link')).toBeInTheDocument();
		});

		it('should pre-populate form with existing data when editing a context link', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Find and click the edit button for the first context link using CSS class
			const editButtons = document.querySelectorAll('.edit-context-link-btn');
			expect(editButtons).toHaveLength(3); // Should have 3 edit buttons for 3 context links
			fireEvent.click(editButtons[0]); // Click edit button for first link

			// Modal should open with "Edit context link" title
			expect(screen.getByText('Edit context link')).toBeInTheDocument();

			// Form should be pre-populated with existing data from the first context link
			const labelInput = screen.getByPlaceholderText(
				'View Traces details: {{_traceId}}',
			);
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			);

			// Check that the form is pre-populated with the first context link's data
			expect(labelInput).toHaveAttribute('value', 'Dashboard 1');
			expect(urlInput).toHaveAttribute('value', 'https://example.com/dashboard1');

			// Verify save and cancel buttons are present
			expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
		});
	});

	describe('URL and Query Parameter Functionality', () => {
		it('should parse URL with query parameters and display them in parameter table', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal to add new context link
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Type a URL with query parameters
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			);
			const testUrl =
				'https://example.com/api?param1=value1&param2=value2&param3=value3';
			fireEvent.change(urlInput, { target: { value: testUrl } });

			// Wait for parameter parsing and display
			await waitFor(() => {
				expect(screen.getByText('Key')).toBeInTheDocument();
				expect(screen.getByText('Value')).toBeInTheDocument();
			});

			// Verify all parameters are displayed
			expect(screen.getByDisplayValue('param1')).toBeInTheDocument();
			expect(screen.getByDisplayValue('value1')).toBeInTheDocument();
			expect(screen.getByDisplayValue('param2')).toBeInTheDocument();
			expect(screen.getByDisplayValue('value2')).toBeInTheDocument();
			expect(screen.getByDisplayValue('param3')).toBeInTheDocument();
			expect(screen.getByDisplayValue('value3')).toBeInTheDocument();
		});

		it('should add new URL parameter when "Add URL parameter" button is clicked', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Initially no parameters should be visible
			expect(screen.queryByText('Key')).not.toBeInTheDocument();

			// Click "Add URL parameter" button
			const addParamButton = screen.getByRole('button', {
				name: /add url parameter/i,
			});
			fireEvent.click(addParamButton);

			// Parameter table should now be visible
			await waitFor(() => {
				expect(screen.getByText('Key')).toBeInTheDocument();
				expect(screen.getByText('Value')).toBeInTheDocument();
			});

			// Should have one empty parameter row
			const keyInputs = screen.getAllByPlaceholderText('Key');
			const valueInputs = screen.getAllByPlaceholderText('Value');
			expect(keyInputs).toHaveLength(1);
			expect(valueInputs).toHaveLength(1);
		});

		it('should update URL when parameter values are changed', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Add a parameter
			const addParamButton = screen.getByRole('button', {
				name: /add url parameter/i,
			});
			fireEvent.click(addParamButton);

			// Fill in parameter key and value
			const keyInput = screen.getByPlaceholderText('Key');
			const valueInput = screen.getAllByPlaceholderText('Value')[0];

			fireEvent.change(keyInput, { target: { value: 'search' } });
			fireEvent.change(valueInput, { target: { value: 'query' } });

			// URL should be updated with the parameter
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			) as HTMLInputElement;
			expect(urlInput.value).toBe('?search=query');
		});

		it('should delete URL parameter when delete button is clicked', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Add a parameter
			const addParamButton = screen.getByRole('button', {
				name: /add url parameter/i,
			});
			fireEvent.click(addParamButton);

			// Fill in parameter
			const keyInput = screen.getByPlaceholderText('Key');
			const valueInput = screen.getAllByPlaceholderText('Value')[0];
			fireEvent.change(keyInput, { target: { value: 'test' } });
			fireEvent.change(valueInput, { target: { value: 'value' } });

			// Verify parameter is added
			expect(screen.getByDisplayValue('test')).toBeInTheDocument();

			// Click delete button for the parameter
			const deleteButtons = screen.getAllByRole('button', { name: '' });
			const deleteButton = deleteButtons.find((btn) =>
				btn.className.includes('delete-parameter-btn'),
			);
			expect(deleteButton).toBeInTheDocument();
			fireEvent.click(deleteButton!);

			// Parameter should be removed
			await waitFor(() => {
				expect(screen.queryByDisplayValue('test')).not.toBeInTheDocument();
			});

			// URL should be cleaned up
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			) as HTMLInputElement;
			expect(urlInput.value).toBe('');
		});

		it('should handle multiple parameters and maintain URL synchronization', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Add first parameter
			const addParamButton = screen.getByRole('button', {
				name: /add url parameter/i,
			});
			fireEvent.click(addParamButton);

			// Fill first parameter
			let keyInputs = screen.getAllByPlaceholderText('Key');
			let valueInputs = screen.getAllByPlaceholderText('Value');
			fireEvent.change(keyInputs[0], { target: { value: 'page' } });
			fireEvent.change(valueInputs[0], { target: { value: '1' } });

			// Add second parameter
			fireEvent.click(addParamButton);

			// Get updated inputs after adding second parameter
			keyInputs = screen.getAllByPlaceholderText('Key');
			valueInputs = screen.getAllByPlaceholderText('Value');

			// Fill second parameter
			fireEvent.change(keyInputs[1], { target: { value: 'size' } });
			fireEvent.change(valueInputs[1], { target: { value: '10' } });

			// URL should contain both parameters
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			) as HTMLInputElement;
			expect(urlInput.value).toBe('?page=1&size=10');

			// Change first parameter value
			fireEvent.change(valueInputs[0], { target: { value: '2' } });

			// URL should be updated
			expect(urlInput.value).toBe('?page=2&size=10');
		});

		it('should validate URL format and show appropriate error messages', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Try to save with invalid URL
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			);
			fireEvent.change(urlInput, { target: { value: 'invalid-url' } });

			// Try to save
			const saveButton = screen.getByRole('button', { name: /save/i });
			fireEvent.click(saveButton);

			// Should show validation error
			await waitFor(() => {
				expect(
					screen.getByText('URLs must start with http(s), /, or {{.*}}/'),
				).toBeInTheDocument();
			});

			// setContextLinks should not be called due to validation failure
			expect(mockSetContextLinks).not.toHaveBeenCalled();
		});

		it('should handle special characters in parameter keys and values correctly', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Add parameter with special characters
			const addParamButton = screen.getByRole('button', {
				name: /add url parameter/i,
			});
			fireEvent.click(addParamButton);

			// Fill parameter with special characters
			const keyInput = screen.getByPlaceholderText('Key');
			const valueInput = screen.getAllByPlaceholderText('Value')[0];

			fireEvent.change(keyInput, { target: { value: 'user@domain' } });
			fireEvent.change(valueInput, { target: { value: 'John Doe & Co.' } });

			// URL should be properly encoded
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			) as HTMLInputElement;
			expect(urlInput.value).toBe('?user%40domain=John%20Doe%20%26%20Co.');
		});

		it('should support template variables in URL and parameters', async () => {
			const mockSetContextLinks = jest.fn();

			renderWithProviders(
				<ContextLinks
					contextLinks={MOCK_EMPTY_CONTEXT_LINKS}
					setContextLinks={mockSetContextLinks}
				/>,
			);

			// Open modal
			const addButton = screen.getByRole('button', { name: /context link/i });
			fireEvent.click(addButton);

			// Type URL with template variable
			const urlInput = screen.getByPlaceholderText(
				'http://localhost/trace/{{_traceId}}',
			);
			const testUrl =
				'https://example.com/trace/{{_traceId}}?service={{_serviceName}}';
			fireEvent.change(urlInput, { target: { value: testUrl } });

			// Wait for parameter parsing
			await waitFor(() => {
				expect(screen.getByText('Key')).toBeInTheDocument();
			});

			// Should parse template variable as parameter
			expect(screen.getByDisplayValue('service')).toBeInTheDocument();
			expect(screen.getByDisplayValue('{{_serviceName}}')).toBeInTheDocument();

			// URL should maintain template variables
			expect((urlInput as HTMLInputElement).value).toBe(
				'https://example.com/trace/{{_traceId}}?service={{_serviceName}}',
			);
		});
	});
});
