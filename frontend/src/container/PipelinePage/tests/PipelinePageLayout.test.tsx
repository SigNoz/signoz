import { render } from 'tests/test-utils';
import { Pipeline } from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import PipelinePageLayout from '../Layouts/Pipeline';

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

		const refetchPipelineLists = jest.fn();

		const { asFragment } = render(
			<PipelinePageLayout
				pipelineData={pipelinedata}
				refetchPipelineLists={refetchPipelineLists}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
