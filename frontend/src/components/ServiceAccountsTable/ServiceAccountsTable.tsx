import React from 'react';
import { Table } from 'antd';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';

import {
	columns,
	ServiceAccountsEmptyState,
	showPaginationTotal,
} from './utils';

import './ServiceAccountsTable.styles.scss';

interface ServiceAccountsTableProps {
	data: ServiceAccountRow[];
	loading: boolean;
	total: number;
	currentPage: number;
	pageSize: number;
	searchQuery: string;
	onPageChange: (page: number) => void;
	onRowClick?: (row: ServiceAccountRow) => void;
}

function ServiceAccountsTable({
	data,
	loading,
	total,
	currentPage,
	pageSize,
	searchQuery,
	onPageChange,
	onRowClick,
}: ServiceAccountsTableProps): JSX.Element {
	return (
		<div className="sa-table-wrapper">
			{/* Todo: use new table component from periscope when ready */}
			<Table<ServiceAccountRow>
				columns={columns}
				dataSource={data}
				rowKey="id"
				loading={loading}
				pagination={
					total > pageSize
						? {
								current: currentPage,
								pageSize,
								total,
								showTotal: showPaginationTotal,
								showSizeChanger: false,
								onChange: onPageChange,
								className: 'sa-table-pagination',
						  }
						: false
				}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'sa-table-row--tinted' : ''
				}
				showSorterTooltip={false}
				locale={{
					emptyText: <ServiceAccountsEmptyState searchQuery={searchQuery} />,
				}}
				className="sa-table"
				onRow={(
					record,
				): {
					onClick?: () => void;
					onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
					style?: React.CSSProperties;
					tabIndex?: number;
					role?: string;
					'aria-label'?: string;
				} => {
					if (!onRowClick) {
						return {};
					}

					return {
						onClick: (): void => onRowClick(record),
						onKeyDown: (e: React.KeyboardEvent<HTMLElement>): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onRowClick(record);
							}
						},
						style: { cursor: 'pointer' },
						tabIndex: 0,
						role: 'button',
						'aria-label': `View service account ${record.name || record.email}`,
					};
				}}
			/>
		</div>
	);
}

export default ServiceAccountsTable;
