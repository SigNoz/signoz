import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';
import { Pipeline } from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import PipelinePageLayout from '../Layouts/Pipeline';
import { matchMedia } from './AddNewPipeline.test';

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
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<PipelinePageLayout
								pipelineData={pipelinedata}
								refetchPipelineLists={refetchPipelineLists}
							/>
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
