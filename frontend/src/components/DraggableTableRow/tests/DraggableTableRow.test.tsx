import { render } from '@testing-library/react';
import { Table } from 'antd';
import { matchMedia } from 'container/PipelinePage/tests/AddNewPipeline.test';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import i18n from 'ReactI18';
import store from 'store';

import DraggableTableRow from '..';

beforeAll(() => {
	matchMedia();
});

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

jest.mock('react-dnd', () => ({
	useDrop: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
	useDrag: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
}));

describe('DraggableTableRow Snapshot test', () => {
	it('should render DraggableTableRow', async () => {
		const { asFragment } = render(
			<Provider store={store}>
				<I18nextProvider i18n={i18n}>
					<Table
						components={{
							body: {
								row: DraggableTableRow,
							},
						}}
						pagination={false}
					/>
				</I18nextProvider>
			</Provider>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
