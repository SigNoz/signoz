import { render } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import i18n from 'ReactI18';
import store from 'store';

import DraggableTableRow from '..';

jest.mock('react-dnd', () => ({
	useDrop: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
	useDrag: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
}));

describe('DraggableTableRow Snapshot test', () => {
	it('should render DraggableTableRow', () => {
		const { asFragment } = render(
			<Provider store={store}>
				<I18nextProvider i18n={i18n}>
					<DraggableTableRow index={2} moveRow={jest.fn()} />
				</I18nextProvider>
			</Provider>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
