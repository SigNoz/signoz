import Tags from 'container/PipelinePage/PipelineListsView/TableComponents/Tags';
import { render } from 'tests/test-utils';

const tags = ['server', 'app'];

describe('PipelinePage container test', () => {
	it('should render Tags section', () => {
		const { asFragment } = render(<Tags tags={tags} />);
		expect(asFragment()).toMatchSnapshot();
	});
});
