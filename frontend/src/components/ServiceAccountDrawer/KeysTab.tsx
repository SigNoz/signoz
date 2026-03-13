import { useCallback, useState } from 'react';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { Trash2, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Skeleton, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useRevokeServiceAccountKey } from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesFactorAPIKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { useTimezone } from 'providers/Timezone';

import EditKeyModal from './EditKeyModal';
import { formatLastUsed } from './utils';

interface KeysTabProps {
	accountId: string;
	keys: ServiceaccounttypesFactorAPIKeyDTO[];
	isLoading: boolean;
	isDisabled?: boolean;
	currentPage: number;
	pageSize: number;
	onRefetch: () => void;
	onAddKeyClick: () => void;
}

function formatExpiry(expiresAt: number): JSX.Element {
	if (expiresAt === 0) {
		return <span className="keys-tab__expiry--never">Never</span>;
	}
	const expiryDate = dayjs.unix(expiresAt);
	if (expiryDate.isBefore(dayjs())) {
		return <span className="keys-tab__expiry--expired">Expired</span>;
	}
	return <span>{expiryDate.format('MMM D, YYYY')}</span>;
}

function KeysTab({
	accountId,
	keys,
	isLoading,
	isDisabled = false,
	currentPage,
	pageSize,
	onRefetch,
	onAddKeyClick,
}: KeysTabProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const [
		editKey,
		setEditKey,
	] = useState<ServiceaccounttypesFactorAPIKeyDTO | null>(null);
	const [
		revokeTarget,
		setRevokeTarget,
	] = useState<ServiceaccounttypesFactorAPIKeyDTO | null>(null);
	const [isRevoking, setIsRevoking] = useState(false);

	const { mutateAsync: revokeKey } = useRevokeServiceAccountKey();

	const handleRevoke = useCallback(async (): Promise<void> => {
		if (!revokeTarget) {
			return;
		}
		setIsRevoking(true);
		try {
			await revokeKey({
				pathParams: { id: accountId, fid: revokeTarget.id },
			});
			toast.success('Key revoked successfully', { richColors: true });
			setRevokeTarget(null);
			onRefetch();
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to revoke key';
			toast.error(errMessage, { richColors: true });
		} finally {
			setIsRevoking(false);
		}
	}, [revokeTarget, revokeKey, accountId, onRefetch]);

	const handleKeySuccess = useCallback((): void => {
		setEditKey(null);
		onRefetch();
	}, [onRefetch]);

	const handleFormatLastUsed = useCallback(
		(lastUsed: Date | null | undefined): string =>
			formatLastUsed(lastUsed, formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const columns: ColumnsType<ServiceaccounttypesFactorAPIKeyDTO> = [
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
			dataIndex: 'expires_at',
			key: 'expiry',
			width: 160,
			align: 'right' as const,
			sorter: (a, b): number => {
				const aVal = a.expires_at === 0 ? Infinity : a.expires_at;
				const bVal = b.expires_at === 0 ? Infinity : b.expires_at;
				return aVal - bVal;
			},
			render: (expiresAt: number): JSX.Element => formatExpiry(expiresAt),
		},
		{
			title: 'Last Used',
			dataIndex: 'last_observed_at',
			key: 'lastUsed',
			width: 220,
			align: 'right' as const,
			sorter: (a, b): number => {
				const aVal = a.last_observed_at
					? new Date(a.last_observed_at).getTime()
					: -Infinity;
				const bVal = b.last_observed_at
					? new Date(b.last_observed_at).getTime()
					: -Infinity;
				return aVal - bVal;
			},
			render: (lastUsed: Date | null | undefined): string =>
				handleFormatLastUsed(lastUsed),
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
							setRevokeTarget(record);
						}}
						className="keys-tab__revoke-btn"
					>
						<X size={12} />
					</Button>
				</Tooltip>
			),
		},
	];

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
				<span className="keys-tab__empty-emoji" role="img" aria-label="searching">
					🧐
				</span>
				<p className="keys-tab__empty-text">No keys. Start by creating one.</p>
				<Button
					type="button"
					className="keys-tab__learn-more"
					onClick={onAddKeyClick}
					disabled={isDisabled}
				>
					+ Add your first key
				</Button>
			</div>
		);
	}

	return (
		<>
			<Table<ServiceaccounttypesFactorAPIKeyDTO>
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
				} => ({
					onClick: (): void => {
						if (!isDisabled) {
							setEditKey(record);
						}
					},
					onKeyDown: (e: React.KeyboardEvent): void => {
						if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
							if (e.key === ' ') {
								e.preventDefault();
							}
							setEditKey(record);
						}
					},
					role: 'button',
					tabIndex: 0,
				})}
			/>

			<DialogWrapper
				open={revokeTarget !== null}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						setRevokeTarget(null);
					}
				}}
				title={`Revoke ${revokeTarget?.name ?? 'key'}?`}
				width="narrow"
				className="alert-dialog delete-dialog"
				showCloseButton={false}
				disableOutsideClick={false}
			>
				<p className="delete-dialog__body">
					Revoking this key will permanently invalidate it. Any systems using this
					key will lose access immediately.
				</p>
				<DialogFooter className="delete-dialog__footer">
					<Button
						variant="solid"
						color="secondary"
						size="sm"
						onClick={(): void => setRevokeTarget(null)}
					>
						<X size={12} />
						Cancel
					</Button>
					<Button
						variant="solid"
						color="destructive"
						size="sm"
						disabled={isRevoking}
						onClick={handleRevoke}
					>
						<Trash2 size={12} />
						{isRevoking ? 'Revoking...' : 'Revoke Key'}
					</Button>
				</DialogFooter>
			</DialogWrapper>

			<EditKeyModal
				open={editKey !== null}
				accountId={accountId}
				keyItem={editKey}
				onClose={(): void => setEditKey(null)}
				onSuccess={handleKeySuccess}
			/>
		</>
	);
}

export default KeysTab;
