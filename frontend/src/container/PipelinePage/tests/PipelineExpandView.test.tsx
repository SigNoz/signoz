import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import { pipelineMockData } from '../mocks/pipeline';
import PipelineExpandView from '../PipelineListsView/PipelineExpandView';
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

describe('PipelinePage', () => {
	it('should render PipelineExpandView section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelineExpandView
							handleAlert={jest.fn()}
							setActionType={jest.fn()}
							processorEditAction={jest.fn()}
							isActionMode="viewing-mode"
							setShowSaveButton={jest.fn()}
							expandedPipelineData={pipelineMockData[0]}
							setExpandedPipelineData={jest.fn()}
							prevPipelineData={pipelineMockData}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
