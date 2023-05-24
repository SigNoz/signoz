import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

import NotFound from './index';

describe('Not Found page test', () => {
	it('should render Not Found page without errors', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<NotFound />
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
