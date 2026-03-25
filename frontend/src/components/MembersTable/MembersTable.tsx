import type React from 'react';
import { Badge } from '@signozhq/badge';
import { Table, Tooltip } from 'antd';
import type { ColumnsType, SorterResult } from 'antd/es/table/interface';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { MemberStatus } from 'container/MembersSettings/utils';
import { capitalize } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import { ROLES } from 'types/roles';

import './MembersTable.styles.scss';

export interface MemberRow {
	id: string;
	name?: string;
	email: string;
	role: ROLES;
	status: MemberStatus;
	joinedOn: string | null;
	updatedAt?: string | null;
}

interface MembersTableProps {
	data: MemberRow[];
	loading: boolean;
	total: number;
	currentPage: number;
	pageSize: number;
	searchQuery: string;
	onPageChange: (page: number) => void;
	onRowClick?: (member: MemberRow) => void;
	onSortChange?: (
		sorter: SorterResult<MemberRow> | SorterResult<MemberRow>[],
	) => void;
}

function NameEmailCell({
	name,
	email,
}: {
	name?: string;
	email: string;
}): JSX.Element {
	return (
		<div className="member-name-email-cell">
			{name && (
				<span className="member-name" title={name}>
					{name}
				</span>
			)}
			<Tooltip title={email} overlayClassName="member-tooltip">
				<span className="member-email">{email}</span>
			</Tooltip>
		</div>
	);
}

function StatusBadge({ status }: { status: MemberRow['status'] }): JSX.Element {
	if (status === MemberStatus.Active) {
		return (
			<Badge color="forest" variant="outline">
				ACTIVE
			</Badge>
		);
	}
	if (status === MemberStatus.Deleted) {
		return (
			<Badge color="cherry" variant="outline">
				DELETED
			</Badge>
		);
	}

	if (status === MemberStatus.Invited) {
		return (
			<Badge color="amber" variant="outline">
				INVITED
			</Badge>
		);
	}

	return <Badge color="vanilla">⎯</Badge>;
}

function MembersEmptyState({
	searchQuery,
}: {
	searchQuery: string;
}): JSX.Element {
	return (
		<div className="members-empty-state">
			<span
				className="members-empty-state__emoji"
				role="img"
				aria-label="monocle face"
			>
				🧐
			</span>
			{searchQuery ? (
				<p className="members-empty-state__text">
					No results for <strong>{searchQuery}</strong>
				</p>
			) : (
				<p className="members-empty-state__text">No members found</p>
			)}
		</div>
	);
}

function MembersTable({
	data,
	loading,
	total,
	currentPage,
	pageSize,
	searchQuery,
	onPageChange,
	onRowClick,
	onSortChange,
}: MembersTableProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const formatJoinedOn = (date: string | null): string => {
		if (!date) {
			return '—';
		}
		const d = new Date(date);
		if (Number.isNaN(d.getTime())) {
			return '—';
		}
		return formatTimezoneAdjustedTimestamp(date, DATE_TIME_FORMATS.DASH_DATETIME);
	};

	const columns: ColumnsType<MemberRow> = [
		{
			title: 'Name / Email',
			dataIndex: 'name',
			key: 'name',
			sorter: (a, b): number => a.email.localeCompare(b.email),
			render: (_, record): JSX.Element => (
				<NameEmailCell name={record.name} email={record.email} />
			),
		},
		{
			title: 'Roles',
			dataIndex: 'role',
			key: 'role',
			width: 180,
			sorter: (a, b): number => a.role.localeCompare(b.role),
			render: (role: ROLES): JSX.Element => (
				<Badge color="vanilla">{capitalize(role)}</Badge>
			),
		},

		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			width: 100,
			align: 'right' as const,
			className: 'member-status-cell',
			sorter: (a, b): number => a.status.localeCompare(b.status),
			render: (status: MemberRow['status']): JSX.Element => (
				<StatusBadge status={status} />
			),
		},
		{
			title: 'Joined On',
			dataIndex: 'joinedOn',
			key: 'joinedOn',
			width: 250,
			align: 'right' as const,
			sorter: (a, b): number => {
				if (!a.joinedOn && !b.joinedOn) {
					return 0;
				}
				if (!a.joinedOn) {
					return 1;
				}
				if (!b.joinedOn) {
					return -1;
				}
				return new Date(a.joinedOn).getTime() - new Date(b.joinedOn).getTime();
			},
			render: (joinedOn: string | null): JSX.Element => {
				const formatted = formatJoinedOn(joinedOn);
				const isDash = formatted === '—';
				return (
					<span className={isDash ? 'member-joined-dash' : 'member-joined-date'}>
						{formatted}
					</span>
				);
			},
		},
	];

	const showPaginationTotal = (_total: number, range: number[]): JSX.Element => (
		<>
			<span className="members-pagination-range">
				{range[0]} &#8212; {range[1]}
			</span>
			<span className="members-pagination-total"> of {_total}</span>
		</>
	);

	return (
		<div className="members-table-wrapper">
			<Table<MemberRow>
				columns={columns}
				dataSource={data}
				rowKey="id"
				loading={loading}
				pagination={{
					current: currentPage,
					pageSize,
					total,
					showTotal: showPaginationTotal,
					showSizeChanger: false,
					onChange: onPageChange,
					className: 'members-table-pagination',
					hideOnSinglePage: true,
				}}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'members-table-row--tinted' : ''
				}
				onRow={(record): React.HTMLAttributes<HTMLElement> => {
					const isClickable = onRowClick && record.status !== MemberStatus.Deleted;
					return {
						onClick: (): void => {
							if (isClickable) {
								onRowClick(record);
							}
						},
						style: isClickable ? { cursor: 'pointer' } : undefined,
					};
				}}
				onChange={(_, __, sorter): void => {
					if (onSortChange) {
						onSortChange(
							sorter as SorterResult<MemberRow> | SorterResult<MemberRow>[],
						);
					}
				}}
				showSorterTooltip={false}
				locale={{
					emptyText: <MembersEmptyState searchQuery={searchQuery} />,
				}}
				className="members-table"
			/>
		</div>
	);
}

export default MembersTable;
