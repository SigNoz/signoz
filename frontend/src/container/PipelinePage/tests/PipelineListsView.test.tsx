/* eslint-disable sonarjs/no-duplicate-string */
import { findByText, fireEvent, render, waitFor } from 'tests/test-utils';

import { pipelineApiResponseMockData } from '../mocks/pipeline';
import PipelineListsView from '../PipelineListsView';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

const samplePipelinePreviewResponse = {
	isLoading: false,
	logs: [
		{
			attributes_bool: {},
			attributes_float64: {},
			attributes_int64: {},
			attributes_string: {
				container_id: 'debian',
				container_name: 'hotrod',
			},
			body:
				'2024-05-01T05:50:57.527Z\tINFO\tfrontend/best_eta.go:106\tDispatch successful\t{"service": "frontend", "trace_id": "5e491e5f00fb4e4f", "span_id": "5e491e5f00fb4e4f", "driver": "T789737C", "eta": "2m0s"}',
			id: '2ffhWqb7Jrb961dX07XWL7aOKtK',
			resources_string: {},
			severity_number: 0,
			severity_text: '',
			span_id: '',
			trace_flags: 0,
			trace_id: '',
			timestamp: '2024-05-01T05:50:57Z',
		},
	],
	isError: false,
};

jest.mock(
	'container/PipelinePage/PipelineListsView/Preview/hooks/useSampleLogs',
	() => ({
		__esModule: true,
		default: jest.fn().mockImplementation(() => ({
			logs: samplePipelinePreviewResponse.logs,
			isLoading: samplePipelinePreviewResponse.isLoading,
			isError: samplePipelinePreviewResponse.isError,
		})),
	}),
);

describe('PipelinePage container test', () => {
	it('should render PipelineListsView section', () => {
		const { getByText, container } = render(
			<PipelineListsView
				setActionType={jest.fn()}
				isActionMode="viewing-mode"
				setActionMode={jest.fn()}
				pipelineData={pipelineApiResponseMockData}
				isActionType=""
				refetchPipelineLists={jest.fn()}
			/>,
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
			<PipelineListsView
				setActionType={jest.fn()}
				isActionMode="editing-mode"
				setActionMode={jest.fn()}
				pipelineData={pipelineApiResponseMockData}
				isActionType=""
				refetchPipelineLists={jest.fn()}
			/>,
		);

		// content assertion
		expect(document.querySelectorAll('[data-icon="edit"]').length).toBe(2);
		expect(getByText('add_new_pipeline')).toBeInTheDocument();

		// expand action
		const expandIcon = document.querySelectorAll(
			'.ant-table-row-expand-icon-cell > span[class*="anticon-right"]',
		);
		expect(expandIcon.length).toBe(2);

		await fireEvent.click(expandIcon[0]);

		// assert expanded view
		expect(document.querySelector('.anticon-down')).toBeInTheDocument();
		expect(getByText('add_new_processor')).toBeInTheDocument();
		expect(getByText('grok use common asd')).toBeInTheDocument();
		expect(getByText('rename auth')).toBeInTheDocument();
	});

	it('should be able to perform actions and edit on expanded view content', async () => {
		render(
			<PipelineListsView
				setActionType={jest.fn()}
				isActionMode="editing-mode"
				setActionMode={jest.fn()}
				pipelineData={pipelineApiResponseMockData}
				isActionType=""
				refetchPipelineLists={jest.fn()}
			/>,
		);

		// content assertion
		expect(document.querySelectorAll('[data-icon="edit"]').length).toBe(2);

		// expand action
		const expandIcon = document.querySelectorAll(
			'.ant-table-row-expand-icon-cell > span[class*="anticon-right"]',
		);
		expect(expandIcon.length).toBe(2);
		await fireEvent.click(expandIcon[0]);

		const switchToggle = document.querySelector(
			'.ant-table-expanded-row .ant-switch',
		);

		expect(switchToggle).toBeChecked();
		await fireEvent.click(switchToggle as HTMLElement);
		expect(switchToggle).not.toBeChecked();

		const deleteBtns = document.querySelectorAll(
			'.ant-table-expanded-row [data-icon="delete"]',
		);

		expect(deleteBtns.length).toBe(2);

		// delete pipeline
		await fireEvent.click(deleteBtns[0] as HTMLElement);

		let deleteConfirmationModal;

		await waitFor(async () => {
			deleteConfirmationModal = document.querySelector('.ant-modal-wrap');
			expect(deleteConfirmationModal).toBeInTheDocument();
		});

		await fireEvent.click(
			((deleteConfirmationModal as unknown) as HTMLElement)?.querySelector(
				'.ant-modal-confirm-btns .ant-btn-primary',
			) as HTMLElement,
		);

		expect(
			document.querySelectorAll('.ant-table-expanded-row [data-icon="delete"]')
				.length,
		).toBe(1);
	});

	it('should be able to toggle and delete pipeline', async () => {
		const { getByText } = render(
			<PipelineListsView
				setActionType={jest.fn()}
				isActionMode="editing-mode"
				setActionMode={jest.fn()}
				pipelineData={pipelineApiResponseMockData}
				isActionType=""
				refetchPipelineLists={jest.fn()}
			/>,
		);

		const addNewPipelineBtn = getByText('add_new_pipeline');
		expect(addNewPipelineBtn).toBeInTheDocument();

		const switchToggle = document.querySelectorAll('.ant-switch');

		expect(switchToggle[0]).not.toBeChecked();
		await fireEvent.click(switchToggle[0] as HTMLElement);
		expect(switchToggle[0]).toBeChecked();

		// view pipeline
		const viewBtn = document.querySelectorAll('[data-icon="eye"]');
		await fireEvent.click(viewBtn[0] as HTMLElement);

		const viewPipelineModal = document.querySelector('.ant-modal-wrap');
		expect(viewPipelineModal).toBeInTheDocument();

		expect(
			await findByText(
				(viewPipelineModal as unknown) as HTMLElement,
				'Simulate Processing',
			),
		).toBeInTheDocument();

		await fireEvent.click(
			viewPipelineModal?.querySelector(
				'button[class*="ant-modal-close"]',
			) as HTMLElement,
		);

		const deleteBtns = document.querySelectorAll('[data-icon="delete"]');

		// delete pipeline
		await fireEvent.click(deleteBtns[0] as HTMLElement);

		await waitFor(() =>
			expect(document.querySelector('.delete-pipeline')).toBeInTheDocument(),
		);

		await waitFor(() =>
			expect(
				document.querySelector('.delete-pipeline-ok-text'),
			).toBeInTheDocument(),
		);

		await fireEvent.click(
			document.querySelector('.delete-pipeline-ok-text') as HTMLElement,
		);

		expect(document.querySelectorAll('[data-icon="delete"]').length).toBe(1);

		const saveBtn = getByText('save_configuration');
		expect(saveBtn).toBeInTheDocument();
		await fireEvent.click(saveBtn);
	});
});
