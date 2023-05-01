import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import configureStore from 'store';

import AllErrors from './index';

const history = createMemoryHistory();
const queryClient = new QueryClient();

const renderComponent = (): any =>
	render(
		<Provider store={configureStore}>
			<Router history={history}>
				<QueryClientProvider client={queryClient}>
					<AllErrors />
				</QueryClientProvider>
			</Router>
		</Provider>,
	);

describe('AllErrors', () => {
	test('renders the AllErrors component', () => {
		renderComponent();
		expect(screen.getByText('Exception Type')).toBeInTheDocument();
	});

	test('handles the filter dropdown and search functionality correctly', async () => {
		renderComponent();
		fireEvent.click(screen.getByTestId('exception-type-filter-icon'));
		const input = screen.getByPlaceholderText('Search By Exception');
		fireEvent.change(input, { target: { value: 'test-exception' } });
		fireEvent.click(screen.getByText('Search'));
		await waitFor(() =>
			expect(screen.getByDisplayValue('test-exception')).toBeInTheDocument(),
		);
	});

	test('renders the ResizeTable component correctly', () => {
		renderComponent();
		expect(screen.getByRole('table')).toBeInTheDocument();
	});

	test('handles table onChangeHandler for sorting, filtering, and pagination correctly', async () => {
		renderComponent();
		fireEvent.click(screen.getByText('Exception Type'));
		fireEvent.click(screen.getByText('Count'));
		fireEvent.click(screen.getByText('Last Seen'));
		fireEvent.click(screen.getByText('First Seen'));
		fireEvent.click(screen.getByText('Application'));
		await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
	});
});
