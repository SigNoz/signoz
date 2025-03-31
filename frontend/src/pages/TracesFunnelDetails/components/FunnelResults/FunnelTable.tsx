import './FunnelTable.styles.scss';

import { Empty, Table, Tooltip } from 'antd';
import { ColumnProps } from 'antd/es/table';

interface FunnelTableProps {
	loading?: boolean;
	data?: any[];
	columns: Array<ColumnProps<any>>;
	title: string;
	tooltip?: string;
}

function FunnelTable({
	loading = false,
	data = [],
	columns = [],
	title,
	tooltip,
}: FunnelTableProps): JSX.Element {
	return (
		<div className="funnel-table">
			<div className="funnel-table__header">
				<div className="funnel-table__title">{title}</div>
				<div className="funnel-table__actions">
					<Tooltip title={tooltip ?? null}>
						<img src="/Icons/solid-info-circle.svg" alt="info" />
					</Tooltip>
				</div>
			</div>
			<Table
				columns={columns}
				dataSource={data}
				loading={loading}
				pagination={false}
				locale={{
					emptyText: loading ? null : <Empty />,
				}}
				scroll={{ x: true }}
				tableLayout="fixed"
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
				}
			/>
		</div>
	);
}

FunnelTable.defaultProps = {
	loading: false,
	data: [],
	tooltip: '',
};

export default FunnelTable;
