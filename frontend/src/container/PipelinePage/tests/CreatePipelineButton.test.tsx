import { I18nextProvider } from 'react-i18next';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { logEventMock } from '__tests__/logEventMock';
import i18n from 'ReactI18';
import store from 'store';
import { TestRouter } from 'tests/router';

import CreatePipelineButton from '../Layouts/Pipeline/CreatePipelineButton';
import { pipelineApiResponseMockData } from '../mocks/pipeline';

describe('PipelinePage container test', () => {
	it('should render CreatePipelineButton section', async () => {
		const { asFragment } = render(
			<TestRouter>
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
			</TestRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});

	it('CreatePipelineButton - edit mode & tracking', async () => {
		const { getByText } = render(
			<TestRouter>
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
			</TestRouter>,
		);

		// enter_edit_mode click and track event data
		const editButton = getByText('enter_edit_mode');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		expect(logEventMock).toHaveBeenCalledWith(
			'Logs: Pipelines: Entered Edit Mode',
			{
				source: 'signoz-ui',
			},
		);
	});

	it('CreatePipelineButton - add new mode & tracking', async () => {
		const { getByText } = render(
			<TestRouter>
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
			</TestRouter>,
		);
		// new_pipeline click and track event data
		const editButton = getByText('new_pipeline');
		expect(editButton).toBeInTheDocument();
		await userEvent.click(editButton);

		expect(logEventMock).toHaveBeenCalledWith(
			'Logs: Pipelines: Clicked Add New Pipeline',
			{
				source: 'signoz-ui',
			},
		);
	});
});
