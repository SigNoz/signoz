// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import store from 'store';
import { TestRouter } from 'tests/router';

import NotFound from './index';

describe('Not Found page test', () => {
	it('should render Not Found page without errors', () => {
		const { asFragment } = render(
			<TestRouter>
				<Provider store={store}>
					<NotFound />
				</Provider>
			</TestRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
