import { Badge } from '@signozhq/badge';
import { Pagination, Table, Tooltip } from 'antd';
import type { ColumnsType, SorterResult } from 'antd/es/table/interface';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';
import { ROLES } from 'types/roles';

import './MembersTable.styles.scss';

export interface MemberRow {
	id: string;
	name: string;
	email: string;
	role: ROLES;
	status: 'Active' | 'Invited';
	joinedOn: string | null;
}

interface MembersTableProps {
	data: MemberRow[];
	loading: boolean;
	total: number;
	currentPage: number;
	pageSize: number;
	searchQuery: string;
	onPageChange: (page: number) => void;
	onSortChange?: (
		sorter: SorterResult<MemberRow> | SorterResult<MemberRow>[],
	) => void;
}

function formatRoleLabel(role: string): string {
	return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function NameEmailCell({
	name,
	email,
}: {
	name: string;
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
	if (status === 'Active') {
		return (
			<Badge color="forest" variant="outline">
				ACTIVE
			</Badge>
		);
	}
	return (
		<Badge color="amber" variant="outline">
			INVITED
		</Badge>
	);
}

function MembersEmptyState({
	searchQuery,
}: {
	searchQuery: string;
}): JSX.Element {
	return (
		<div className="members-empty-state">
			<span className="members-empty-state__emoji">🧐</span>
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
			render: (_, record): JSX.Element => (
				<NameEmailCell name={record.name} email={record.email} />
			),
		},
		{
			title: 'Roles',
			dataIndex: 'role',
			key: 'role',
			width: 180,
			render: (role: ROLES): JSX.Element => (
				<Badge color="vanilla">{formatRoleLabel(role)}</Badge>
			),
		},
		{
			title: 'Permissions',
			key: 'permissions',
			width: 250,
			render: (): JSX.Element => <span className="member-dash">&#8213;</span>,
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
			width: 220,
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
				pagination={false}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'members-table-row--tinted' : ''
				}
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
			{total > pageSize && (
				<Pagination
					current={currentPage}
					pageSize={pageSize}
					total={total}
					showTotal={showPaginationTotal}
					showSizeChanger={false}
					onChange={onPageChange}
					className="members-table-pagination"
				/>
			)}
		</div>
	);
}

export default MembersTable;
