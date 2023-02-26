import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import AddNewProcessor from '../PipelineListsView/AddNewProcessor';

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

const selectedProcessorData = {
	id: 1,
	key: 'grokusecommon',
	type: 'grok',
	name: 'grok use common',
};
describe('PipelinePage container test', () => {
	it('should render AddNewProcessor section', () => {
		const setActionType = jest.fn();
		const isActionType = 'add-processor';

		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<AddNewProcessor
							isActionType={isActionType}
							setActionType={setActionType}
							selectedProcessorData={selectedProcessorData}
							setIsVisibleSaveButton={jest.fn()}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
