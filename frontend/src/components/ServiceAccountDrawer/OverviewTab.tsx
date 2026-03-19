import { useCallback } from 'react';
import { Badge } from '@signozhq/badge';
import { LockKeyhole } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import RolesSelect from 'components/RolesSelect';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';

interface OverviewTabProps {
	account: ServiceAccountRow;
	localName: string;
	onNameChange: (v: string) => void;
	localRoles: string[];
	onRolesChange: (v: string[]) => void;
	isDisabled: boolean;
	availableRoles: AuthtypesRoleDTO[];
	rolesLoading?: boolean;
	rolesError?: boolean;
	rolesErrorObj?: APIError | undefined;
	onRefetchRoles?: () => void;
}

function OverviewTab({
	account,
	localName,
	onNameChange,
	localRoles,
	onRolesChange,
	isDisabled,
	availableRoles,
	rolesLoading,
	rolesError,
	rolesErrorObj,
	onRefetchRoles,
}: OverviewTabProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

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
				{isDisabled ? (
					<div className="sa-drawer__input-wrapper sa-drawer__input-wrapper--disabled">
						<span className="sa-drawer__input-text">{localName || '—'}</span>
						<LockKeyhole size={14} className="sa-drawer__lock-icon" />
					</div>
				) : (
					<Input
						id="sa-name"
						value={localName}
						onChange={(e): void => onNameChange(e.target.value)}
						className="sa-drawer__input"
						placeholder="Enter name"
					/>
				)}
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
								localRoles.map((r) => (
									<Badge key={r} color="vanilla">
										{r}
									</Badge>
								))
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
					) : (
						<Badge color="vanilla" variant="outline" className="sa-status-badge">
							DISABLED
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
		</>
	);
}

export default OverviewTab;
