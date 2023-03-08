import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import PipelinePageLayout from '../Layouts';
import { matchMedia } from './AddNewPipeline.test';

beforeAll(() => {
	matchMedia();
});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

describe('PipelinePage container test', () => {
	it('should render PipelinePageLayout section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<PipelinePageLayout />
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
