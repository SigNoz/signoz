import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import CreatePipelineButton from '../Layouts/Pipeline/CreatePipelineButton';
import { pipelineApiResponseMockData } from '../mocks/pipeline';

describe('PipelinePage container test', () => {
	it('should render CreatePipelineButton section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<CreatePipelineButton
							setActionType={jest.fn()}
							isActionMode="viewing-mode"
							setActionMode={jest.fn()}
							pipelineData={pipelineApiResponseMockData}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
