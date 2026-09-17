import { Form } from 'antd';
import { render } from 'tests/test-utils';
import { PipelineData } from 'types/api/pipeline/def';

import { pipelineMockData } from '../mocks/pipeline';
import AddNewPipeline from '../PipelineListsView/AddNewPipeline';

function AddNewPipelineWrapper(): JSX.Element {
	const setActionType = vi.fn();
	const selectedPipelineData = pipelineMockData[0];
	const isActionType = 'add-pipeline';
	const [pipelineForm] = Form.useForm<PipelineData>();

	return (
		<AddNewPipeline
			isActionType={isActionType}
			setActionType={setActionType}
			selectedPipelineData={selectedPipelineData}
			setShowSaveButton={vi.fn()}
			setCurrPipelineData={vi.fn()}
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
