import { Callout } from '@signozhq/ui/callout';

import { PermissionType, TimestampBadge } from '../../utils';
import PermissionItem from './PermissionItem';

interface OverviewTabProps {
	role: {
		description?: string;
		createdAt?: Date | string;
		updatedAt?: Date | string;
	} | null;
	isManaged: boolean;
	permissionTypes: PermissionType[];
	onPermissionClick: (relationKey: string) => void;
}

function OverviewTab({
	role,
	isManaged,
	permissionTypes,
	onPermissionClick,
}: OverviewTabProps): JSX.Element {
	return (
		<div className="role-details-overview">
			{isManaged && (
				<Callout
					type="warning"
					showIcon
					title="This is a managed role. Permissions and settings are view-only and cannot be modified."
				/>
			)}

			<div className="role-details-meta">
				<div>
					<p className="role-details-section-label">Description</p>
					<p className="role-details-description-text">{role?.description || '—'}</p>
				</div>

				<div className="role-details-info-row">
					<div className="role-details-info-col">
						<p className="role-details-section-label">Created At</p>
						<div className="role-details-info-value">
							<TimestampBadge date={role?.createdAt} />
						</div>
					</div>
					<div className="role-details-info-col">
						<p className="role-details-section-label">Last Modified At</p>
						<div className="role-details-info-value">
							<TimestampBadge date={role?.updatedAt} />
						</div>
					</div>
				</div>
			</div>

			<div className="role-details-permissions">
				<div className="role-details-permissions-header">
					<span className="role-details-section-label">Permissions</span>
					<hr className="role-details-permissions-divider" />
				</div>

				<div className="role-details-permission-list">
					{permissionTypes.map((permissionType) => (
						<PermissionItem
							key={permissionType.key}
							permissionType={permissionType}
							isManaged={isManaged}
							onPermissionClick={onPermissionClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

export default OverviewTab;
