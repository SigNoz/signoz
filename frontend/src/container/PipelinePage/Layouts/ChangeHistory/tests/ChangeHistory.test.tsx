import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import TimezoneProvider from 'providers/Timezone';
import i18n from 'ReactI18';
import store from 'store';
import { TestRouter } from 'tests/router';

import ChangeHistory from '../index';
import { pipelineData, pipelineDataHistory } from './testUtils';

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
			<TestRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<TimezoneProvider>
								<ChangeHistory pipelineData={pipelineData} />
							</TimezoneProvider>
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</TestRouter>,
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
		expect(getAllByText('test-user')).toHaveLength(2);
		expect(getAllByText('Deployment was successful')).toHaveLength(2);
	});

	it('test deployment stage and icon based on history data', () => {
		const { getByText } = render(
			<TestRouter>
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
			</TestRouter>,
		);

		// assertion for different deployment stages
		expect(screen.getByTestId('deployment-icon-in-progress')).toBeInTheDocument();
		expect(getByText('In Progress')).toBeInTheDocument();

		expect(screen.getByTestId('deployment-icon-dirty')).toBeInTheDocument();
		expect(getByText('Dirty')).toBeInTheDocument();

		expect(screen.getByTestId('deployment-icon-failed')).toBeInTheDocument();
		expect(getByText('Failed')).toBeInTheDocument();

		expect(screen.getByTestId('deployment-icon-unknown')).toBeInTheDocument();
		expect(getByText('Unknown')).toBeInTheDocument();

		expect(screen.getAllByTestId('change-history-row')).toHaveLength(5);
	});
});
