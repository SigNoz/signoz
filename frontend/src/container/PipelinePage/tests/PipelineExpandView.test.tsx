import { render } from 'tests/test-utils';

import { pipelineMockData } from '../mocks/pipeline';
import PipelineExpandView from '../PipelineListsView/PipelineExpandView';

describe('PipelinePage', () => {
	it('should render PipelineExpandView section', () => {
		const { asFragment } = render(
			<PipelineExpandView
				handleAlert={vi.fn()}
				setActionType={vi.fn()}
				processorEditAction={vi.fn()}
				isActionMode="viewing-mode"
				setShowSaveButton={vi.fn()}
				expandedPipelineData={pipelineMockData[0]}
				setExpandedPipelineData={vi.fn()}
				prevPipelineData={pipelineMockData}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
