import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

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

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

describe('PipelinePage container test', () => {
	it('should render AddNewPipeline section', () => {
		const setActionType = jest.fn();
		const selectedPipelineData = pipelineMockData[0];
		const isActionType = 'add-pipeline';

		const { asFragment } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<AddNewPipeline
								isActionType={isActionType}
								setActionType={setActionType}
								selectedPipelineData={selectedPipelineData}
								setShowSaveButton={jest.fn()}
								setCurrPipelineData={jest.fn()}
								currPipelineData={pipelineMockData}
							/>
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
