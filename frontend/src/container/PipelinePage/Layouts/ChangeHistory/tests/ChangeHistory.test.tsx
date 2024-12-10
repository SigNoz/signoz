import { render } from '@testing-library/react';
import TimezoneProvider from 'providers/Timezone';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import ChangeHistory from '../index';
import { pipelineData, pipelineDataHistory } from './testUtils';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

describe('ChangeHistory test', () => {
	it('should render changeHistory correctly', () => {
		const { getAllByText, getByText } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<TimezoneProvider>
								<ChangeHistory pipelineData={pipelineData} />
							</TimezoneProvider>
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);

		// change History table headers
		[
			'Version',
			'Deployment Stage',
			'Last Deploy Message',
			'Last Deployed Time',
			'Edited by',
		].forEach((text) => expect(getByText(text)).toBeInTheDocument());

		// table content
		expect(getAllByText('test-user').length).toBe(2);
		expect(getAllByText('Deployment was successful').length).toBe(2);
	});

	it('test deployment stage and icon based on history data', () => {
		const { getByText, container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<TimezoneProvider>
								<ChangeHistory
									pipelineData={{
										...pipelineData,
										history: pipelineDataHistory,
									}}
								/>
							</TimezoneProvider>
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);

		// assertion for different deployment stages
		expect(container.querySelector('[data-icon="loading"]')).toBeInTheDocument();
		expect(getByText('In Progress')).toBeInTheDocument();

		expect(
			container.querySelector('[data-icon="exclamation-circle"]'),
		).toBeInTheDocument();
		expect(getByText('Dirty')).toBeInTheDocument();

		expect(
			container.querySelector('[data-icon="close-circle"]'),
		).toBeInTheDocument();
		expect(getByText('Failed')).toBeInTheDocument();

		expect(
			container.querySelector('[data-icon="minus-circle"]'),
		).toBeInTheDocument();
		expect(getByText('Unknown')).toBeInTheDocument();

		expect(container.querySelectorAll('.ant-table-row').length).toBe(5);
	});
});
