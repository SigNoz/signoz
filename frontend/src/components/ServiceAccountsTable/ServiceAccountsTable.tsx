import React from 'react';
import { Badge } from '@signozhq/badge';
import { Pagination, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { useTimezone } from 'providers/Timezone';

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

function NameEmailCell({
	name,
	email,
}: {
	name: string;
	email: string;
}): JSX.Element {
	return (
		<div className="sa-name-email-cell">
			{name && (
				<span className="sa-name" title={name}>
					{name}
				</span>
			)}
			<Tooltip title={email} overlayClassName="sa-tooltip">
				<span className="sa-email">{email}</span>
			</Tooltip>
		</div>
	);
}

function RolesCell({ roles }: { roles: string[] }): JSX.Element {
	if (!roles || roles.length === 0) {
		return <span className="sa-dash">—</span>;
	}
	const first = roles[0];
	const overflow = roles.length - 1;
	const tooltipContent = roles.slice(1).join(', ');

	return (
		<div className="sa-roles-cell">
			<Badge color="vanilla">{first}</Badge>
			{overflow > 0 && (
				<Tooltip
					title={tooltipContent}
					overlayClassName="sa-tooltip"
					overlayStyle={{ maxWidth: '600px' }}
				>
					<Badge color="vanilla" variant="outline" className="sa-status-badge">
						+{overflow}
					</Badge>
				</Tooltip>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: string }): JSX.Element {
	if (status?.toUpperCase() === 'ACTIVE') {
		return (
			<Badge color="forest" variant="outline">
				ACTIVE
			</Badge>
		);
	}
	return (
		<Badge color="vanilla" variant="outline" className="sa-status-badge">
			DISABLED
		</Badge>
	);
}

function ServiceAccountsEmptyState({
	searchQuery,
}: {
	searchQuery: string;
}): JSX.Element {
	return (
		<div className="sa-empty-state">
			<span className="sa-empty-state__emoji" role="img" aria-label="monocle face">
				🧐
			</span>
			{searchQuery ? (
				<p className="sa-empty-state__text">
					No results for <strong>{searchQuery}</strong>
				</p>
			) : (
				<p className="sa-empty-state__text">
					No service accounts. Start by creating one to manage keys.
				</p>
			)}
		</div>
	);
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
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const formatCreatedAt = (date: string | null): string => {
		if (!date) {
			return '—';
		}
		const d = new Date(date);
		if (Number.isNaN(d.getTime())) {
			return '—';
		}
		return formatTimezoneAdjustedTimestamp(date, DATE_TIME_FORMATS.DASH_DATETIME);
	};

	const columns: ColumnsType<ServiceAccountRow> = [
		{
			title: 'Name / Email',
			dataIndex: 'name',
			key: 'name',
			render: (_, record): JSX.Element => (
				<NameEmailCell name={record.name} email={record.email} />
			),
		},
		{
			title: 'Roles',
			dataIndex: 'roles',
			key: 'roles',
			width: 420,
			render: (roles: string[]): JSX.Element => <RolesCell roles={roles} />,
		},
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			width: 120,
			align: 'right' as const,
			className: 'sa-status-cell',
			render: (status: string): JSX.Element => <StatusBadge status={status} />,
		},
	];

	const showPaginationTotal = (_total: number, range: number[]): JSX.Element => (
		<>
			<span className="sa-pagination-range">
				{range[0]} &#8212; {range[1]}
			</span>
			<span className="sa-pagination-total"> of {_total}</span>
		</>
	);

	// Silence unused import warning — formatCreatedAt used by future columns
	void formatCreatedAt;

	return (
		<div className="sa-table-wrapper">
			<Table<ServiceAccountRow>
				columns={columns}
				dataSource={data}
				rowKey="id"
				loading={loading}
				pagination={false}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'sa-table-row--tinted' : ''
				}
				showSorterTooltip={false}
				locale={{
					emptyText: <ServiceAccountsEmptyState searchQuery={searchQuery} />,
				}}
				className="sa-table"
				onRow={(record): { onClick: () => void; style?: React.CSSProperties } => ({
					onClick: (): void => onRowClick?.(record),
					style: onRowClick ? { cursor: 'pointer' } : undefined,
				})}
			/>
			{total > pageSize && (
				<Pagination
					current={currentPage}
					pageSize={pageSize}
					total={total}
					showTotal={showPaginationTotal}
					showSizeChanger={false}
					onChange={onPageChange}
					className="sa-table-pagination"
				/>
			)}
		</div>
	);
}

export default ServiceAccountsTable;
