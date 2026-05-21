import React from 'react';
import { Table } from 'antd';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';

import {
	columns,
	ServiceAccountsEmptyState,
	showPaginationTotal,
} from './utils';

import './ServiceAccountsTable.styles.scss';

export const PAGE_SIZE = 20;

interface ServiceAccountsTableProps {
	data: ServiceAccountRow[];
	loading: boolean;
	onRowClick?: (row: ServiceAccountRow) => void;
}

function ServiceAccountsTable({
	data,
	loading,
	onRowClick,
}: ServiceAccountsTableProps): JSX.Element {
	const [currentPage, setPage] = useQueryState(
		SA_QUERY_PARAMS.PAGE,
		parseAsInteger.withDefault(1),
	);
	const [searchQuery] = useQueryState(
		SA_QUERY_PARAMS.SEARCH,
		parseAsString.withDefault(''),
	);

	return (
		<div className="sa-table-wrapper">
			{/* Todo: use new table component from periscope when ready */}
			<Table<ServiceAccountRow>
				columns={columns}
				dataSource={data}
				rowKey="id"
				loading={loading}
				pagination={
					data.length > PAGE_SIZE
						? {
								current: currentPage,
								pageSize: PAGE_SIZE,
								total: data.length,
								showTotal: showPaginationTotal,
								showSizeChanger: false,
								onChange: (page: number): void => void setPage(page),
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
