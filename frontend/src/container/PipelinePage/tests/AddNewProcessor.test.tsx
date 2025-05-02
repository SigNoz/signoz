import { render } from 'tests/test-utils';

import { pipelineMockData } from '../mocks/pipeline';
import AddNewProcessor from '../PipelineListsView/AddNewProcessor';

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

beforeAll(() => {
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
});

const selectedProcessorData = {
	id: '1',
	orderId: 1,
	type: 'grok_parser',
	name: 'grok use common',
	output: 'grokusecommon',
};
describe('PipelinePage container test', () => {
	it('should render AddNewProcessor section', () => {
		const setActionType = jest.fn();
		const isActionType = 'add-processor';

		const { asFragment } = render(
			<AddNewProcessor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				setShowSaveButton={jest.fn()}
				expandedPipelineData={pipelineMockData[0]}
				setExpandedPipelineData={jest.fn()}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
