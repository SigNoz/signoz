import { render } from 'tests/test-utils';

import { pipelineMockData } from '../mocks/pipeline';
import AddNewPipeline from '../PipelineListsView/AddNewPipeline';

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

describe('PipelinePage container test', () => {
	it('should render AddNewPipeline section', () => {
		const setActionType = jest.fn();
		const selectedPipelineData = pipelineMockData[0];
		const isActionType = 'add-pipeline';

		const { asFragment } = render(
			<AddNewPipeline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedPipelineData={selectedPipelineData}
				setShowSaveButton={jest.fn()}
				setCurrPipelineData={jest.fn()}
				currPipelineData={pipelineMockData}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
