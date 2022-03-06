import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import NotFound from './index';
import { expect } from '@jest/globals';

describe('Not Found page test', () => {
	it('should render Not Found page without errors', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<NotFound />
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
