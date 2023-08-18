import { render } from '@testing-library/react';
import Tags from 'container/PipelinePage/PipelineListsView/TableComponents/Tags';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

const tags = ['server', 'app'];

describe('PipelinePage container test', () => {
	it('should render Tags section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<Tags tags={tags} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
