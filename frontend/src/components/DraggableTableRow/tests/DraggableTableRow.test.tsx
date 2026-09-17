import { render } from '@testing-library/react';
import { Table } from 'antd';

import DraggableTableRow from '..';

vi.mock('react-dnd', () => ({
	useDrop: vi.fn().mockImplementation(() => [vi.fn(), vi.fn(), vi.fn()]),
	useDrag: vi.fn().mockImplementation(() => [vi.fn(), vi.fn(), vi.fn()]),
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
