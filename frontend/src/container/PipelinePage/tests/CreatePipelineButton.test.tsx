import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import CreatePipelineButton from '../Layouts/Pipeline/CreatePipelineButton';
import { pipelineApiResponseMockData } from '../mocks/pipeline';

jest.mock('api/common/logEvent');

describe('PipelinePage container test', () => {
	it('should render CreatePipelineButton section', async () => {
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

	it('CreatePipelineButton - edit mode & tracking', async () => {
		const { getByText } = render(
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

		// enter_edit_mode click and track event data
		const editButton = getByText('enter_edit_mode');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		expect(logEvent).toBeCalledWith('Logs: Pipelines: Entered Edit Mode', {
			source: 'signoz-ui',
		});
	});

	it('CreatePipelineButton - add new mode & tracking', async () => {
		const { getByText } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<CreatePipelineButton
							setActionType={jest.fn()}
							isActionMode="viewing-mode"
							setActionMode={jest.fn()}
							pipelineData={{ ...pipelineApiResponseMockData, pipelines: [] }}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		// new_pipeline click and track event data
		const editButton = getByText('new_pipeline');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		expect(logEvent).toBeCalledWith('Logs: Pipelines: Clicked Add New Pipeline', {
			source: 'signoz-ui',
		});
	});
});
