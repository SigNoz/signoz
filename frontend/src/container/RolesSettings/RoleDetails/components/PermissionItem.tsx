import { ChevronRight } from '@signozhq/icons';

import { PermissionType } from '../../utils';

interface PermissionItemProps {
	permissionType: PermissionType;
	isManaged: boolean;
	onPermissionClick: (key: string) => void;
}

function PermissionItem({
	permissionType,
	isManaged,
	onPermissionClick,
}: PermissionItemProps): JSX.Element {
	const { key, label, icon } = permissionType;

	if (isManaged) {
		return (
			<div
				key={key}
				className="role-details-permission-item role-details-permission-item--readonly"
			>
				<div className="role-details-permission-item-left">
					{icon}
					<span className="role-details-permission-item-label">{label}</span>
				</div>
			</div>
		);
	}

	return (
		<div
			key={key}
			className="role-details-permission-item"
			role="button"
			tabIndex={0}
			onClick={(): void => onPermissionClick(key)}
			onKeyDown={(e): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					onPermissionClick(key);
				}
			}}
		>
			<div className="role-details-permission-item-left">
				{icon}
				<span className="role-details-permission-item-label">{label}</span>
			</div>
			<ChevronRight size={14} color="var(--foreground)" />
		</div>
	);
}

export default PermissionItem;
