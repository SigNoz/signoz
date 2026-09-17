import { render } from 'tests/test-utils-full';
import { Pipeline } from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import PipelinePageLayout from '../Layouts/Pipeline';

describe('PipelinePage container test', () => {
	it('should render PipelinePageLayout section', () => {
		const pipelinedata: Pipeline = {
			active: true,
			createdBy: 'admin',
			deployResult: 'random_data',
			deployStatus: 'random_data',
			disabled: false,
			elementType: 'random_data',
			history: [],
			id: v4(),
			is_valid: true,
			lastConf: 'random_data',
			lastHash: 'random_data',
			pipelines: [],
			version: 1,
		};

		const refetchPipelineLists = vi.fn();

		const { asFragment } = render(
			<PipelinePageLayout
				pipelineData={pipelinedata}
				refetchPipelineLists={refetchPipelineLists}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
