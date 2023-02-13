import { render } from '@testing-library/react';
import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

import ListOfPipelines from '../ListOfPipelines';

describe('PipelinePage test', () => {
	it('should render PipelinePage', () => {
		const [isActionType, setActionType] = useState<string | undefined>(undefined);
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<ListOfPipelines
						isActionType={isActionType}
						setActionType={setActionType}
					/>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
