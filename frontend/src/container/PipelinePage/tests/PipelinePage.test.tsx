import { render } from '@testing-library/react';
import PipelinePage from 'container/PipelinePage';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

describe('PipelinePage test', () => {
	it('should render PipelinePage', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<PipelinePage />
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
