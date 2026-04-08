import { useCallback, useMemo } from 'react';
import { Button } from '@signozhq/button';
import { KeyRound, X } from '@signozhq/icons';
import { Skeleton, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { parseAsBoolean, parseAsString, useQueryState } from 'nuqs';
import { useTimezone } from 'providers/Timezone';

import EditKeyModal from './EditKeyModal';
import RevokeKeyModal from './RevokeKeyModal';
import { formatLastObservedAt } from './utils';

interface KeysTabProps {
	keys: ServiceaccounttypesGettableFactorAPIKeyDTO[];
	isLoading: boolean;
	isDisabled?: boolean;
	currentPage: number;
	pageSize: number;
}

interface BuildColumnsParams {
	isDisabled: boolean;
	onRevokeClick: (keyId: string) => void;
	handleformatLastObservedAt: (
		lastObservedAt: Date | null | undefined,
	) => string;
}

function formatExpiry(expiresAt: number): JSX.Element {
	if (expiresAt === 0) {
		return <span className="keys-tab__expiry--never">Never</span>;
	}
	const expiryDate = dayjs.unix(expiresAt);
	if (expiryDate.isBefore(dayjs())) {
		return <span className="keys-tab__expiry--expired">Expired</span>;
	}
	return <span>{expiryDate.format(DATE_TIME_FORMATS.MONTH_DATE)}</span>;
}

function buildColumns({
	isDisabled,
	onRevokeClick,
	handleformatLastObservedAt,
}: BuildColumnsParams): ColumnsType<ServiceaccounttypesGettableFactorAPIKeyDTO> {
	return [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			className: 'keys-tab__name-column',
			sorter: (a, b): number => (a.name ?? '').localeCompare(b.name ?? ''),
			render: (_, record): JSX.Element => (
				<span className="keys-tab__name-text">{record.name ?? '—'}</span>
			),
		},
		{
			title: 'Expiry',
			dataIndex: 'expiresAt',
			key: 'expiry',
			width: 160,
			align: 'right' as const,
			sorter: (a, b): number => {
				const aVal = a.expiresAt === 0 ? Infinity : a.expiresAt;
				const bVal = b.expiresAt === 0 ? Infinity : b.expiresAt;
				return aVal - bVal;
			},
			render: (expiresAt: number): JSX.Element => formatExpiry(expiresAt),
		},
		{
			title: 'Last Observed At',
			dataIndex: 'lastObservedAt',
			key: 'lastObservedAt',
			width: 220,
			align: 'right' as const,
			sorter: (a, b): number => {
				const aVal = a.lastObservedAt
					? new Date(a.lastObservedAt).getTime()
					: -Infinity;
				const bVal = b.lastObservedAt
					? new Date(b.lastObservedAt).getTime()
					: -Infinity;
				return aVal - bVal;
			},
			render: (lastObservedAt: Date | null | undefined): string =>
				handleformatLastObservedAt(lastObservedAt),
		},
		{
			title: '',
			key: 'action',
			width: 48,
			align: 'right' as const,
			render: (_, record): JSX.Element => (
				<Tooltip title={isDisabled ? 'Service account disabled' : 'Revoke Key'}>
					<Button
						variant="ghost"
						size="xs"
						color="destructive"
						disabled={isDisabled}
						onClick={(e): void => {
							e.stopPropagation();
							onRevokeClick(record.id);
						}}
						className="keys-tab__revoke-btn"
					>
						<X size={12} />
					</Button>
				</Tooltip>
			),
		},
	];
}

function KeysTab({
	keys,
	isLoading,
	isDisabled = false,
	currentPage,
	pageSize,
}: KeysTabProps): JSX.Element {
	const [, setIsAddKeyOpen] = useQueryState(
		'add-key',
		parseAsBoolean.withDefault(false),
	);
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const [editKeyId, setEditKeyId] = useQueryState(
		'edit-key',
		parseAsString.withDefault(''),
	);
	const [, setRevokeKeyId] = useQueryState(
		'revoke-key',
		parseAsString.withDefault(''),
	);
	const editKey = keys.find((k) => k.id === editKeyId) ?? null;

	const handleformatLastObservedAt = useCallback(
		(lastObservedAt: Date | null | undefined): string =>
			formatLastObservedAt(lastObservedAt, formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const onRevokeClick = useCallback(
		(keyId: string): void => {
			setRevokeKeyId(keyId);
		},
		[setRevokeKeyId],
	);

	const columns = useMemo(
		() => buildColumns({ isDisabled, onRevokeClick, handleformatLastObservedAt }),
		[isDisabled, onRevokeClick, handleformatLastObservedAt],
	);

	if (isLoading) {
		return (
			<div className="keys-tab__loading">
				<Skeleton active paragraph={{ rows: 4 }} />
			</div>
		);
	}

	if (keys.length === 0) {
		return (
			<div className="keys-tab__empty">
				<KeyRound size={24} className="keys-tab__empty-icon" />
				<p className="keys-tab__empty-text">
					No keys. Start by creating one.{' '}
					<a
						href="https://signoz.io/docs/manage/administrator-guide/iam/service-accounts/#step-3-generate-an-api-key"
						target="_blank"
						rel="noopener noreferrer"
						className="keys-tab__learn-more"
					>
						Learn more
					</a>
				</p>
				<Button
					type="button"
					className="keys-tab__learn-more"
					onClick={async (): Promise<void> => {
						await setIsAddKeyOpen(true);
					}}
					disabled={isDisabled}
				>
					+ Add your first key
				</Button>
			</div>
		);
	}

	return (
		<>
			{/* Todo: use new table component from periscope when ready */}
			<Table<ServiceaccounttypesGettableFactorAPIKeyDTO>
				columns={columns}
				dataSource={keys}
				rowKey="id"
				pagination={{
					style: { display: 'none' },
					current: currentPage,
					pageSize,
				}}
				showSorterTooltip={false}
				className={`keys-tab__table${
					isDisabled ? ' keys-tab__table--disabled' : ''
				}`}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'keys-tab__table-row--alt' : ''
				}
				onRow={(
					record,
				): {
					onClick: () => void;
					onKeyDown: (e: React.KeyboardEvent) => void;
					role: string;
					tabIndex: number;
					'aria-label': string;
				} => ({
					onClick: async (): Promise<void> => {
						if (!isDisabled) {
							await setEditKeyId(record.id);
						}
					},
					onKeyDown: async (e: React.KeyboardEvent): Promise<void> => {
						if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
							if (e.key === ' ') {
								e.preventDefault();
							}
							await setEditKeyId(record.id);
						}
					},
					role: 'button',
					tabIndex: 0,
					'aria-label': `Edit key ${record.name || 'options'}`,
				})}
			/>

			<EditKeyModal keyItem={editKey} />

			<RevokeKeyModal />
		</>
	);
}

export default KeysTab;
