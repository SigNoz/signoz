import { render } from '@testing-library/react';
import PipelineSequence from 'container/PipelinePage/PipelineListsView/TableComponents/PipelineSequence';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { matchMedia } from './AddNewPipeline.test';

beforeAll(() => {
	matchMedia();
});

describe('PipelinePage container test', () => {
	it('should render PipelineSequence section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineSequence value={123} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
