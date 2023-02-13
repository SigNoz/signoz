import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

import PiplinesSearchBar from '../SearchBar';

describe('PipelinePage test', () => {
	it('should render PipelinePage', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<PiplinesSearchBar />
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
