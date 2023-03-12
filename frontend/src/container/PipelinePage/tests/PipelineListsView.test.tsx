import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
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

describe('PipelinePage container test', () => {
	it('should render PipelineListsView section', () => {
		const { asFragment } = render(
			<MemoryRouter>
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
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
