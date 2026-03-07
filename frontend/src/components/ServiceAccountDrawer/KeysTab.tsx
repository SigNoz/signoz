import { useCallback, useEffect, useState } from 'react';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { Trash2, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Tooltip } from 'antd';
import {
	useListServiceAccountKeys,
	useRevokeServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import type { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { format } from 'date-fns';
import { useTimezone } from 'providers/Timezone';

import EditKeyModal from './EditKeyModal';

interface KeysTabProps {
	accountId: string;
	onKeyCountChange: (n: number) => void;
	onAddKeyClick: () => void;
}

function formatExpiry(expiresAt: number): JSX.Element {
	if (expiresAt === 0) {
		return <span className="keys-tab__expiry--never">Never</span>;
	}
	const expiryDate = new Date(expiresAt * 1000);
	if (expiryDate < new Date()) {
		return (
			<span className="keys-tab__expiry--expired">
				{format(expiryDate, 'MMM d, yyyy')}
			</span>
		);
	}
	return <span>{format(expiryDate, 'MMM d, yyyy')}</span>;
}

function KeysTab({
	accountId,
	onKeyCountChange,
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

	const { data: keysData, refetch } = useListServiceAccountKeys({
		id: accountId,
	});

	const keys = keysData?.data ?? [];

	useEffect(() => {
		onKeyCountChange(keys.length);
	}, [keys.length, onKeyCountChange]);

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
			refetch();
		} catch {
			toast.error('Failed to revoke key', { richColors: true });
		} finally {
			setIsRevoking(false);
		}
	}, [revokeTarget, revokeKey, accountId, refetch]);

	const handleKeySuccess = useCallback((): void => {
		setEditKey(null);
		refetch();
	}, [refetch]);

	const formatLastUsed = useCallback(
		(lastUsed: Date | null | undefined): string => {
			if (!lastUsed) {
				return '—';
			}
			try {
				return formatTimezoneAdjustedTimestamp(
					String(lastUsed),
					DATE_TIME_FORMATS.DASH_DATETIME,
				);
			} catch {
				return '—';
			}
		},
		[formatTimezoneAdjustedTimestamp],
	);

	if (keys.length === 0) {
		return (
			<div className="keys-tab__empty">
				<span className="keys-tab__empty-emoji" role="img" aria-label="searching">
					🧐
				</span>
				<p className="keys-tab__empty-text">No keys. Start by creating one.</p>
				<button
					type="button"
					className="keys-tab__learn-more"
					onClick={onAddKeyClick}
				>
					+ Add your first key
				</button>
			</div>
		);
	}

	return (
		<>
			<div className="keys-tab__table-wrap">
				{/* Header row */}
				<div className="keys-tab__table-header">
					<span className="keys-tab__col-name">Name</span>
					<span className="keys-tab__col-expiry">Expiry</span>
					<span className="keys-tab__col-last-used">Last Used</span>
					<span className="keys-tab__col-action" />
				</div>

				{/* Data rows */}
				{keys.map((keyItem, idx) => (
					<div
						key={keyItem.id}
						className={`keys-tab__table-row${
							idx % 2 === 1 ? ' keys-tab__table-row--alt' : ''
						}`}
						onClick={(): void => setEditKey(keyItem)}
						role="button"
						tabIndex={0}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
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
							{formatLastUsed(keyItem.last_used ?? null)}
						</span>
						<span className="keys-tab__col-action">
							<Tooltip title="Revoke Key">
								<Button
									variant="ghost"
									size="xs"
									color="destructive"
									onClick={(e): void => {
										e.stopPropagation();
										setRevokeTarget(keyItem);
									}}
									className="keys-tab__revoke-btn"
								>
									<X size={14} />
								</Button>
							</Tooltip>
						</span>
					</div>
				))}

				{/* Count footer */}
				<div className="keys-tab__table-footer">
					<span className="keys-tab__count">
						1 — {keys.length} of {keys.length}
					</span>
				</div>
			</div>

			{/* Revoke confirm dialog */}
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
					Revoking this key will permanently invalidate it. Any systems using
					this key will lose access immediately.
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
