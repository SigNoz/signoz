import { useMemo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd/lib';

import type { DashboardListItem } from '../../utils/helpers';
import DashboardRow from '../DashboardRow/DashboardRow';

interface Props {
	dashboards: DashboardListItem[];
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	canEdit: boolean;
	showUpdatedAt: boolean;
	showUpdatedBy: boolean;
	loading: boolean;
}

function DashboardsListContent({
	dashboards,
	page,
	pageSize,
	total,
	onPageChange,
	canEdit,
	showUpdatedAt,
	showUpdatedBy,
	loading,
}: Props): JSX.Element {
	const columns: TableProps<DashboardListItem>['columns'] = useMemo(
		() => [
			{
				title: 'Dashboards',
				key: 'dashboard',
				render: (_, dashboard, index): JSX.Element => (
					<DashboardRow
						dashboard={dashboard}
						index={index}
						canEdit={canEdit}
						showUpdatedAt={showUpdatedAt}
						showUpdatedBy={showUpdatedBy}
					/>
				),
			},
		],
		[canEdit, showUpdatedAt, showUpdatedBy],
	);

	const paginationConfig = total > pageSize && {
		pageSize,
		showSizeChanger: false,
		onChange: onPageChange,
		current: page,
		total,
		hideOnSinglePage: true,
	};

	return (
		<Table
			columns={columns}
			dataSource={dashboards.map((d) => ({ ...d, key: d.id }))}
			showSorterTooltip
			loading={loading}
			showHeader={false}
			pagination={paginationConfig}
		/>
	);
}

export default DashboardsListContent;
