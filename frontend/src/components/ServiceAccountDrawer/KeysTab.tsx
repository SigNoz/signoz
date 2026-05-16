import React, { useCallback, useMemo } from 'react';
import { KeyRound, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import AuthZTooltip from 'components/AuthZTooltip/AuthZTooltip';
import {
	APIKeyCreatePermission,
	buildAPIKeyDeletePermission,
	buildSAAttachPermission,
	buildSADetachPermission,
} from 'hooks/useAuthZ/permissions/service-account.permissions';
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
	canUpdate?: boolean;
	accountId?: string;
	currentPage: number;
	pageSize: number;
}

interface BuildColumnsParams {
	isDisabled: boolean;
	accountId: string;
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
	accountId,
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
			onCell: (): {
				onClick: (e: React.MouseEvent) => void;
				style: React.CSSProperties;
			} => ({
				onClick: (e): void => e.stopPropagation(),
				style: { cursor: 'default' },
			}),
			render: (_, record): JSX.Element => (
				<AuthZTooltip
					checks={[
						buildAPIKeyDeletePermission(record.id),
						buildSADetachPermission(accountId),
					]}
					enabled={!isDisabled && !!accountId}
				>
					<Button
						variant="ghost"
						size="sm"
						color="destructive"
						disabled={isDisabled}
						onClick={(): void => {
							onRevokeClick(record.id);
						}}
						className="keys-tab__revoke-btn"
					>
						<X size={12} />
					</Button>
				</AuthZTooltip>
			),
		},
	];
}

function KeysTab({
	keys,
	isLoading,
	isDisabled = false,
	accountId = '',
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
			void setRevokeKeyId(keyId);
		},
		[setRevokeKeyId],
	);

	const columns = useMemo(
		() =>
			buildColumns({
				isDisabled,
				accountId,
				onRevokeClick,
				handleformatLastObservedAt,
			}),
		[isDisabled, accountId, onRevokeClick, handleformatLastObservedAt],
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
				<AuthZTooltip
					checks={[APIKeyCreatePermission, buildSAAttachPermission(accountId)]}
					enabled={!isDisabled && !!accountId}
				>
					<Button
						variant="link"
						color="primary"
						onClick={async (): Promise<void> => {
							await setIsAddKeyOpen(true);
						}}
						disabled={isDisabled}
					>
						+ Add your first key
					</Button>
				</AuthZTooltip>
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
