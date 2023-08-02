import { render } from '@testing-library/react';
import { pipelineMockData } from 'container/PipelinePage/mocks/pipeline';
import TableExpandIcon from 'container/PipelinePage/PipelineListsView/TableComponents/TableExpandIcon';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

describe('PipelinePage container test', () => {
	it('should render TableExpandIcon section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<TableExpandIcon
							expanded
							onExpand={jest.fn()}
							record={pipelineMockData[0]}
						/>
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
