import { Badge } from '@signozhq/badge';
import { ScanSearch } from '@signozhq/icons';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';

export function NameEmailCell({
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

export function RolesCell({ roles }: { roles: string[] }): JSX.Element {
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

export function StatusBadge({ status }: { status: string }): JSX.Element {
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

export function ServiceAccountsEmptyState({
	searchQuery,
}: {
	searchQuery: string;
}): JSX.Element {
	return (
		<div className="sa-empty-state">
			<ScanSearch size={24} className="sa-empty-state__icon" />
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

export const columns: ColumnsType<ServiceAccountRow> = [
	{
		title: 'Name / Email',
		dataIndex: 'name',
		key: 'name',
		className: 'sa-name-column',
		sorter: (a, b): number => a.email.localeCompare(b.email),
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
		sorter: (a, b): number =>
			(a.status?.toUpperCase() === 'ACTIVE' ? 0 : 1) -
			(b.status?.toUpperCase() === 'ACTIVE' ? 0 : 1),
		render: (status: string): JSX.Element => <StatusBadge status={status} />,
	},
];

export const showPaginationTotal = (
	_total: number,
	range: number[],
): JSX.Element => (
	<>
		<span className="sa-pagination-range">
			{range[0]} &#8212; {range[1]}
		</span>
		<span className="sa-pagination-total"> of {_total}</span>
	</>
);
