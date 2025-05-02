import { render } from '@testing-library/react';
import { Table } from 'antd';

import DraggableTableRow from '..';

beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		})),
	});
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
			<Table
				components={{
					body: {
						row: DraggableTableRow,
					},
				}}
				pagination={false}
			/>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
