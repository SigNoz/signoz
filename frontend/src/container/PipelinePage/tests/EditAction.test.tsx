import { I18nextProvider } from 'react-i18next';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import EditAction from 'container/PipelinePage/PipelineListsView/TableComponents/TableActions/EditAction';
import i18n from 'ReactI18';
import store from 'store';
import { TestRouter } from 'tests/router';

describe('PipelinePage container test', () => {
	it('should render EditAction section', () => {
		const { asFragment } = render(
			<TestRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<EditAction isPipelineAction editAction={jest.fn()} />
					</I18nextProvider>
				</Provider>
			</TestRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
