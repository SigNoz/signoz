import { Typography } from '@signozhq/ui/typography';

import { BrandedPermission } from '../../hooks/useAuthZ/types';
import { ObservedPermission, OverrideState } from '../types';

import { PermissionRow } from './PermissionRow';

import styles from './AuthZDevModal.module.css';

export interface PermissionGroup {
	resource: string;
	items: string[];
}

export interface AuthZDevModalContentProps {
	observedListLength: number;
	orderedPermissions: string[];
	groups: PermissionGroup[];
	observed: Record<string, ObservedPermission>;
	overrides: Record<string, OverrideState>;
	onSetOverride: (permission: BrandedPermission, state: OverrideState) => void;
}

export function AuthZDevModalContent({
	observedListLength,
	orderedPermissions,
	groups,
	observed,
	overrides,
	onSetOverride,
}: AuthZDevModalContentProps): JSX.Element {
	return (
		<div className={styles.list} data-testid="authz-dev-permission-list">
			{orderedPermissions.length === 0 ? (
				<div className={styles.empty}>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						display="inline-block"
						align="center"
						textOverflow="wrap"
					>
						{observedListLength === 0
							? 'No permissions observed yet. Navigate the app to trigger permission checks.'
							: 'No permissions match your search.'}
					</Typography>
				</div>
			) : (
				groups.map((group) => (
					<div key={group.resource} className={styles.section}>
						<div className={styles.sectionHeader}>
							<Typography
								variant="paragraph"
								size="medium"
								weight="bold"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								{group.resource}
							</Typography>
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								{group.items.length}
							</Typography>
						</div>
						{group.items.map((permission) => (
							<PermissionRow
								key={permission}
								observed={observed[permission]}
								override={overrides[permission]}
								onSetOverride={onSetOverride}
							/>
						))}
					</div>
				))
			)}
		</div>
	);
}
