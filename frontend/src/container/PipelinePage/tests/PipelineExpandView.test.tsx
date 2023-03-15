import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { pipelineMockData } from '../mocks/pipeline';
import PipelineExpandView from '../PipelineListsView/PipelineExpandView';
import { matchMedia } from './AddNewPipeline.test';

beforeAll(() => {
	matchMedia();
});

describe('PipelinePage', () => {
	it('should render PipelineExpandView section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineExpandView
							handleAlert={jest.fn()}
							setActionType={jest.fn()}
							processorEditAction={jest.fn()}
							isActionMode="viewing-mode"
							setShowSaveButton={jest.fn()}
							expandedPipelineData={pipelineMockData[0]}
							setExpandedPipelineData={jest.fn()}
							processorData={[
								{
									orderId: 1,
									enabled: true,
									type: 'grok',
									id: 'grokusecommon',
									name: 'grok use common asd',
									output: 'renameauth',
									parse_to: 'attributes',
									pattern: '%{COMMONAPACHELOG}',
									parse_from: 'body',
								},
								{
									orderId: 2,
									enabled: true,
									type: 'move',
									id: 'renameauth',
									name: 'rename auth',
									from: 'attributes.auth',
									to: 'attributes.username',
								},
							]}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
