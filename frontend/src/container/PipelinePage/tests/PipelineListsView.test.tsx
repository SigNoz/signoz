import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { pipelineApiResponseMockData } from '../mocks/pipeline';
import PipelineListsView from '../PipelineListsView';

describe('PipelinePage container test', () => {
	it('should render PipelineListsView section', () => {
		const { getByText, container } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineListsView
							setActionType={jest.fn()}
							isActionMode="viewing-mode"
							setActionMode={jest.fn()}
							pipelineData={pipelineApiResponseMockData}
							isActionType=""
							refetchPipelineLists={jest.fn()}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);

		// table headers assertions
		[
			'Pipeline Name',
			'Filters',
			'Last Edited',
			'Edited By',
			'Actions',
		].forEach((text) => expect(getByText(text)).toBeInTheDocument());

		// content assertion
		expect(container.querySelectorAll('.ant-table-row').length).toBe(2);

		expect(getByText('Apache common parser')).toBeInTheDocument();
		expect(getByText('source = nginx')).toBeInTheDocument();

		expect(getByText('Moving pipeline new')).toBeInTheDocument();
		expect(getByText('method = POST')).toBeInTheDocument();
	});

	it('should render expanded content and edit mode correctly', async () => {
		const { getByText } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineListsView
							setActionType={jest.fn()}
							isActionMode="editing-mode"
							setActionMode={jest.fn()}
							pipelineData={pipelineApiResponseMockData}
							isActionType=""
							refetchPipelineLists={jest.fn()}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);

		// content assertion
		expect(document.querySelectorAll('[data-icon="edit"]').length).toBe(2);
		expect(getByText('add_new_pipeline')).toBeInTheDocument();

		// expand action
		const expandIcon = document.querySelectorAll(
			'.ant-table-row-expand-icon-cell > span[class*="anticon-right"]',
		);
		expect(expandIcon.length).toBe(2);

		await userEvent.click(expandIcon[0]);

		// assert expanded view
		expect(document.querySelector('.anticon-down')).toBeInTheDocument();
		expect(getByText('add_new_processor')).toBeInTheDocument();
		expect(getByText('grok use common asd')).toBeInTheDocument();
		expect(getByText('rename auth')).toBeInTheDocument();
	});

	it('should be able to perform actions and edit on expanded view content', async () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineListsView
							setActionType={jest.fn()}
							isActionMode="editing-mode"
							setActionMode={jest.fn()}
							pipelineData={pipelineApiResponseMockData}
							isActionType=""
							refetchPipelineLists={jest.fn()}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);

		// content assertion
		expect(document.querySelectorAll('[data-icon="edit"]').length).toBe(2);

		// expand action
		const expandIcon = document.querySelectorAll(
			'.ant-table-row-expand-icon-cell > span[class*="anticon-right"]',
		);
		expect(expandIcon.length).toBe(2);
		await userEvent.click(expandIcon[0]);

		const switchToggle = document.querySelector(
			'.ant-table-expanded-row .ant-switch',
		);

		expect(switchToggle).toBeChecked();
		await userEvent.click(switchToggle as HTMLElement);
		expect(switchToggle).not.toBeChecked();

		const deleteBtns = document.querySelectorAll(
			'.ant-table-expanded-row [data-icon="delete"]',
		);

		expect(deleteBtns.length).toBe(2);

		// delete pipeline
		await userEvent.click(deleteBtns[0] as HTMLElement);

		let deleteConfirmationModal;

		await waitFor(async () => {
			deleteConfirmationModal = document.querySelector('.ant-modal-wrap');
			expect(deleteConfirmationModal).toBeInTheDocument();
		});

		await userEvent.click(
			((deleteConfirmationModal as unknown) as HTMLElement)?.querySelector(
				'.ant-modal-confirm-btns .ant-btn-primary',
			) as HTMLElement,
		);

		expect(
			document.querySelectorAll('.ant-table-expanded-row [data-icon="delete"]')
				.length,
		).toBe(1);
	});
});
