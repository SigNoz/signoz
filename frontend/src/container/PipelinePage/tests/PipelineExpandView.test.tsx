import { render } from 'tests/test-utils';

import { pipelineMockData } from '../mocks/pipeline';
import PipelineExpandView from '../PipelineListsView/PipelineExpandView';

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

describe('PipelinePage', () => {
	it('should render PipelineExpandView section', () => {
		const { asFragment } = render(
			<PipelineExpandView
				handleAlert={jest.fn()}
				setActionType={jest.fn()}
				processorEditAction={jest.fn()}
				isActionMode="viewing-mode"
				setShowSaveButton={jest.fn()}
				expandedPipelineData={pipelineMockData[0]}
				setExpandedPipelineData={jest.fn()}
				prevPipelineData={pipelineMockData}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
