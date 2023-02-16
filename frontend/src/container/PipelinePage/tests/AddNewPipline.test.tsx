import { render } from '@testing-library/react';
import { FormInstance } from 'antd';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { pipelineData } from '../mocks/pipeline';
import AddNewPipline from '../PipelineListsView/AddNewPipline';

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

describe('PipelinePage test', () => {
	it('should render AddNewPipline', () => {
		const ref = React.createRef<FormInstance>();
		const setActionType = jest.fn();
		const handleModalCancelAction = jest.fn();
		const setPipelineDataSource = jest.fn();
		const selectedRecord = pipelineData[0];
		const isActionType = 'add-pipeline';
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<AddNewPipline
							isActionType={isActionType}
							setActionType={setActionType}
							selectedRecord={selectedRecord}
							pipelineDataSource={pipelineData}
							setPipelineDataSource={setPipelineDataSource}
							formRef={ref}
							handleModalCancelAction={handleModalCancelAction}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
