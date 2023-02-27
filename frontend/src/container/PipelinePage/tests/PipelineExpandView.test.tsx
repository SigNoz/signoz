import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { pipelineMockData } from '../mocks/pipeline';
import PipelineExpandView from '../PipelineListsView/PipelineExpandView';

beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		})),
	});
});

describe('PipelinePage', () => {
	it('should render PipelineExpandView section', () => {
		const handleAlert = jest.fn();
		const setActionType = jest.fn();
		const handleProcessorEditAction = jest.fn();
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineExpandView
							handleAlert={handleAlert}
							setActionType={setActionType}
							handleProcessorEditAction={handleProcessorEditAction}
							isActionMode="viewing-mode"
							setIsVisibleSaveButton={jest.fn()}
							selectedPipelineDataState={pipelineMockData[0]}
							setSelectedPipelineDataState={jest.fn()}
							processorData={pipelineMockData[0].operators}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
