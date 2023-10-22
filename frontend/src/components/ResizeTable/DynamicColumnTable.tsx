/* eslint-disable react/jsx-props-no-spreading */
import { Button, TableProps } from 'antd';

import ResizeTable from './ResizeTable';

function DynamicColumnTable({
	columns,
	onDragColumn,
	...restProps
}: DynamicColumnTableProps): JSX.Element {
	console.log('RestPrps', restProps);

	return (
		<>
			<Button>Hello There</Button>
			<ResizeTable columns={columns} onDragColumn={onDragColumn} {...restProps} />
		</>
	);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DynamicColumnTableProps extends TableProps<any> {
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
}

DynamicColumnTable.defaultProps = {
	onDragColumn: undefined,
};

export default DynamicColumnTable;
