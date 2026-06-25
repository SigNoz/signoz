import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, LockKeyhole } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { useCopyToClipboard } from 'react-use';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import AuthZTooltip from 'components/AuthZTooltip/AuthZTooltip';
import RolesSelect from 'components/RolesSelect';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { buildSAUpdatePermission } from 'hooks/useAuthZ/permissions/service-account.permissions';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';

import SaveErrorItem from './SaveErrorItem';
import type { SaveError } from './utils';

interface OverviewTabProps {
	account: ServiceAccountRow;
	localName: string;
	onNameChange: (v: string) => void;
	localRoles: string[];
	onRolesChange: (v: string[]) => void;
	isDisabled: boolean;
	canUpdate?: boolean;
	availableRoles: AuthtypesRoleDTO[];
	rolesLoading?: boolean;
	rolesError?: boolean;
	rolesErrorObj?: APIError | undefined;
	onRefetchRoles?: () => void;
	saveErrors?: SaveError[];
}

function OverviewTab({
	account,
	localName,
	onNameChange,
	localRoles,
	onRolesChange,
	isDisabled,
	canUpdate = true,
	availableRoles,
	rolesLoading,
	rolesError,
	rolesErrorObj,
	onRefetchRoles,
	saveErrors = [],
}: OverviewTabProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const [, copyToClipboard] = useCopyToClipboard();
	const [hasCopiedId, setHasCopiedId] = useState(false);

	const handleCopyId = useCallback((): void => {
		if (account.id) {
			copyToClipboard(account.id);
			setHasCopiedId(true);
		}
	}, [account.id, copyToClipboard]);

	useEffect(() => {
		if (hasCopiedId) {
			const timer = setTimeout(() => setHasCopiedId(false), 2000);
			return (): void => clearTimeout(timer);
		}
		return undefined;
	}, [hasCopiedId]);

	const formatTimestamp = useCallback(
		(ts: string | null | undefined): string => {
			if (!ts) {
				return '—';
			}
			const d = new Date(ts);
			if (Number.isNaN(d.getTime())) {
				return '—';
			}
			return formatTimezoneAdjustedTimestamp(ts, DATE_TIME_FORMATS.DASH_DATETIME);
		},
		[formatTimezoneAdjustedTimestamp],
	);

	return (
		<>
			<div className="sa-drawer__field">
				<label className="sa-drawer__label" htmlFor="sa-name">
					Name
				</label>
				{isDisabled || !canUpdate ? (
					<AuthZTooltip
						checks={[buildSAUpdatePermission(account.id)]}
						enabled={!isDisabled && !canUpdate}
					>
						<div className="sa-drawer__input-wrapper sa-drawer__input-wrapper--disabled">
							<span className="sa-drawer__input-text">{localName || '—'}</span>
							<LockKeyhole size={14} className="sa-drawer__lock-icon" />
						</div>
					</AuthZTooltip>
				) : (
					<Input
						id="sa-name"
						value={localName}
						onChange={(e): void => onNameChange(e.target.value)}
						placeholder="Enter name"
					/>
				)}
			</div>

			<div className="sa-drawer__field">
				<label className="sa-drawer__label" htmlFor="sa-id">
					ID
				</label>
				<div className="sa-drawer__input-wrapper sa-drawer__input-wrapper--disabled">
					<span className="sa-drawer__input-text">{account.id || '—'}</span>
					{account.id && (
						<Button
							variant="link"
							color="secondary"
							onClick={handleCopyId}
							className="sa-drawer__copy-btn"
							data-testid="copy-id-btn"
						>
							{hasCopiedId ? <Check size={14} /> : <Copy size={14} />}
						</Button>
					)}
					<LockKeyhole size={14} className="sa-drawer__lock-icon" />
				</div>
			</div>

			<div className="sa-drawer__field">
				<label className="sa-drawer__label" htmlFor="sa-email">
					Email Address
				</label>
				<div className="sa-drawer__input-wrapper sa-drawer__input-wrapper--disabled">
					<span className="sa-drawer__input-text">{account.email || '—'}</span>
					<LockKeyhole size={14} className="sa-drawer__lock-icon" />
				</div>
			</div>

			<div className="sa-drawer__field">
				<label className="sa-drawer__label" htmlFor="sa-roles">
					Roles
				</label>
				{isDisabled ? (
					<div className="sa-drawer__input-wrapper sa-drawer__input-wrapper--disabled">
						<div className="sa-drawer__disabled-roles">
							{localRoles.length > 0 ? (
								localRoles.map((roleId) => {
									const role = availableRoles.find((r) => r.id === roleId);
									return (
										<Badge key={roleId} color="vanilla">
											{role?.name ?? roleId}
										</Badge>
									);
								})
							) : (
								<span className="sa-drawer__input-text">—</span>
							)}
						</div>
						<LockKeyhole size={14} className="sa-drawer__lock-icon" />
					</div>
				) : (
					<RolesSelect
						id="sa-roles"
						mode="multiple"
						roles={availableRoles}
						loading={rolesLoading}
						isError={rolesError}
						error={rolesErrorObj}
						onRefetch={onRefetchRoles}
						value={localRoles}
						onChange={onRolesChange}
						placeholder="Select roles"
					/>
				)}
			</div>

			<div className="sa-drawer__meta">
				<div className="sa-drawer__meta-item">
					<span className="sa-drawer__meta-label">Status</span>
					{account.status?.toUpperCase() === 'ACTIVE' ? (
						<Badge color="forest" variant="outline">
							ACTIVE
						</Badge>
					) : account.status?.toUpperCase() === 'DELETED' ? (
						<Badge color="cherry" variant="outline">
							DELETED
						</Badge>
					) : (
						<Badge color="vanilla" variant="outline" className="sa-status-badge">
							{account.status ? account.status.toUpperCase() : 'UNKNOWN'}
						</Badge>
					)}
				</div>

				<div className="sa-drawer__meta-item">
					<span className="sa-drawer__meta-label">Created At</span>
					<Badge color="vanilla">{formatTimestamp(account.createdAt)}</Badge>
				</div>

				<div className="sa-drawer__meta-item">
					<span className="sa-drawer__meta-label">Updated At</span>
					<Badge color="vanilla">{formatTimestamp(account.updatedAt)}</Badge>
				</div>
			</div>

			{saveErrors.length > 0 && (
				<div className="sa-drawer__save-errors">
					{saveErrors.map(({ context, apiError, onRetry }) => (
						<SaveErrorItem
							key={context}
							context={context}
							apiError={apiError}
							onRetry={onRetry}
						/>
					))}
				</div>
			)}
		</>
	);
}

export default OverviewTab;
