import { Table } from 'antd';

// config
import { tableScroll } from './config';
import { LogsTableViewProps } from './types';
import { useTableView } from './useTableView';

function LogsTableView(props: LogsTableViewProps): JSX.Element {
	const { dataSource, columns } = useTableView(props);

	return (
		<Table
			size="small"
			columns={columns}
			dataSource={dataSource}
			pagination={false}
			rowKey="id"
			bordered
			scroll={tableScroll}
		/>
	);
}

export default LogsTableView;
