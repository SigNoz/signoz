import { useCallback, useMemo, useState } from 'react';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { Trash2, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Skeleton, Tooltip } from 'antd';
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

	const paginatedKeys = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return keys.slice(start, start + pageSize);
	}, [keys, currentPage, pageSize]);

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
			<div className="keys-tab__table-wrap">
				<div className="keys-tab__table-header">
					<span className="keys-tab__col-name">Name</span>
					<span className="keys-tab__col-expiry">Expiry</span>
					<span className="keys-tab__col-last-used">Last Used</span>
					<span className="keys-tab__col-action" />
				</div>

				<div className="keys-tab__scroll">
					{paginatedKeys.map((keyItem, idx) => (
						<div
							key={keyItem.id}
							className={`keys-tab__table-row${
								idx % 2 === 0 ? ' keys-tab__table-row--alt' : ''
							}${isDisabled ? ' keys-tab__table-row--disabled' : ''}`}
							onClick={(): void => {
								if (!isDisabled) {
									setEditKey(keyItem);
								}
							}}
							role="button"
							tabIndex={0}
							onKeyDown={(e): void => {
								if (e.key === 'Enter' && !isDisabled) {
									setEditKey(keyItem);
								}
							}}
						>
							<span className="keys-tab__col-name keys-tab__name-text">
								{keyItem.name ?? '—'}
							</span>
							<span className="keys-tab__col-expiry">
								{formatExpiry(keyItem.expires_at)}
							</span>
							<span className="keys-tab__col-last-used">
								{handleFormatLastUsed(keyItem?.last_used ?? null)}
							</span>
							<span className="keys-tab__col-action">
								<Tooltip title={isDisabled ? 'Service account disabled' : 'Revoke Key'}>
									<Button
										variant="ghost"
										size="xs"
										color="destructive"
										disabled={isDisabled}
										onClick={(e): void => {
											e.stopPropagation();
											setRevokeTarget(keyItem);
										}}
										className="keys-tab__revoke-btn"
									>
										<X size={12} />
									</Button>
								</Tooltip>
							</span>
						</div>
					))}
				</div>
			</div>

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
