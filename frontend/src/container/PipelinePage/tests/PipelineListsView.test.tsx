import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { pipelineApiResponseMockData } from '../mocks/pipeline';
import PipelineListsView from '../PipelineListsView';
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
	it('should render PipelineListsView section of Pipeline Page', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<PipelineListsView
								isActionType="add-pipeline"
								setActionType={jest.fn()}
								isActionMode="viewing-mode"
								setActionMode={jest.fn()}
								piplineData={pipelineApiResponseMockData}
								refetchPipelineLists={jest.fn()}
							/>
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
