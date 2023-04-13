import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import {
	combineReducers,
	legacy_createStore as createStore,
	Store,
} from 'redux';

import { InitialValue } from '../../store/reducers/metric';
import Metrics from './index';

const rootReducer = combineReducers({
	metrics: (state = InitialValue) => state,
});

const mockStore = createStore(rootReducer);

const renderWithReduxAndRouter = (mockStore: Store) => (
	component: React.ReactElement,
): RenderResult =>
	render(
		<BrowserRouter>
			<Provider store={mockStore}>{component}</Provider>
		</BrowserRouter>,
	);

describe('Metrics Component', () => {
	it('renders without errors', async () => {
		renderWithReduxAndRouter(mockStore)(<Metrics />);

		await waitFor(() => {
			expect(screen.getByText(/application/i)).toBeInTheDocument();
			expect(screen.getByText(/p99 latency \(in ms\)/i)).toBeInTheDocument();
			expect(screen.getByText(/error rate \(% of total\)/i)).toBeInTheDocument();
			expect(screen.getByText(/operations per second/i)).toBeInTheDocument();
		});
	});

	it('renders loading when required conditions are met', async () => {
		const customStore = createStore(rootReducer, {
			metrics: {
				services: [],
				loading: true,
				error: false,
			},
		});

		const { container } = renderWithReduxAndRouter(customStore)(<Metrics />);

		const spinner = container.querySelector('.ant-spin-nested-loading');

		expect(spinner).toBeInTheDocument();
	});

	it('renders no data when required conditions are met', async () => {
		const customStore = createStore(rootReducer, {
			metrics: {
				services: [],
				loading: false,
				error: false,
			},
		});

		renderWithReduxAndRouter(customStore)(<Metrics />);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
