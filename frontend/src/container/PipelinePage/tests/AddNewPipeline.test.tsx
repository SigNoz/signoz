import { Form } from 'antd';
import { render } from 'tests/test-utils';
import { PipelineData } from 'types/api/pipeline/def';

import { pipelineMockData } from '../mocks/pipeline';
import AddNewPipeline from '../PipelineListsView/AddNewPipeline';

export function matchMedia(): void {
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
}
beforeAll(() => {
	matchMedia();
});

function AddNewPipelineWrapper(): JSX.Element {
	const setActionType = jest.fn();
	const selectedPipelineData = pipelineMockData[0];
	const isActionType = 'add-pipeline';
	const [pipelineForm] = Form.useForm<PipelineData>();

	return (
		<AddNewPipeline
			isActionType={isActionType}
			setActionType={setActionType}
			selectedPipelineData={selectedPipelineData}
			setShowSaveButton={jest.fn()}
			setCurrPipelineData={jest.fn()}
			currPipelineData={pipelineMockData}
			form={pipelineForm}
		/>
	);
}

describe('PipelinePage container test', () => {
	it('should render AddNewPipeline section', () => {
		const { asFragment } = render(<AddNewPipelineWrapper />);
		expect(asFragment()).toMatchSnapshot();
	});
});
