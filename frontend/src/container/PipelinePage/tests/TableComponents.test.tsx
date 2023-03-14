import { render } from '@testing-library/react';
import { pipelineMockData } from 'container/PipelinePage/mocks/pipeline';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import TableComponents from '../PipelineListsView/TableComponents';
import { matchMedia } from './AddNewPipeline.test';

beforeAll(() => {
	matchMedia();
});

describe('PipelinePage container test', () => {
	it('should render TableComponents section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<TableComponents
							columnKey="id"
							record={pipelineMockData[0].config as never}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
