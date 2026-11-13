import { Badge, type BadgeColorType } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { memo, useMemo } from 'react';

import type { BrandedPermission } from '../../hooks/useAuthZ/types';
import { parsePermission } from '../../hooks/useAuthZ/utils';
import { OverrideState, type ObservedPermission } from '../types';

import { OverrideControl } from './OverrideControl';

import styles from './PermissionRow.module.css';

type PermissionRowProps = {
	observed: ObservedPermission;
	override: OverrideState | undefined;
	onSetOverride: (permission: BrandedPermission, state: OverrideState) => void;
};

const ROW_OVERRIDE_CLASSES: Record<OverrideState, string | null> = {
	[OverrideState.Reset]: null,
	[OverrideState.Granted]: styles.rowGranted,
	[OverrideState.Denied]: styles.rowDenied,
	[OverrideState.Delay]: styles.rowDelay,
	[OverrideState.Error]: styles.rowError,
};

export const PermissionRow = memo(function PermissionRow({
	observed,
	override,
	onSetOverride,
}: PermissionRowProps): JSX.Element {
	const currentState = override ?? OverrideState.Reset;

	const { relation, objectId } = useMemo(() => {
		const parsed = parsePermission(observed.permission);
		const separatorIndex = parsed.object.indexOf(':');
		return {
			relation: parsed.relation,
			objectId:
				separatorIndex === -1
					? parsed.object
					: parsed.object.slice(separatorIndex + 1),
		};
	}, [observed.permission]);

	let apiColor: BadgeColorType = 'secondary';
	let apiLabel = 'API ?';
	if (observed.apiValue === true) {
		apiColor = 'success';
		apiLabel = 'API ✓';
	} else if (observed.apiValue === false) {
		apiColor = 'danger';
		apiLabel = 'API ✗';
	}

	return (
		<div
			className={cx(styles.permissionRow, ROW_OVERRIDE_CLASSES[currentState])}
			data-testid={`permission-row-${observed.permission}`}
		>
			<div className={styles.permissionInfo}>
				<span className={styles.relation}>
					<Typography
						variant="paragraph"
						size="small"
						weight="medium"
						color="primary"
						as="span"
						textOverflow="wrap"
					>
						{relation}
					</Typography>
				</span>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					:
				</Typography>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="inherit"
					as="span"
					display="block"
					minWidth={0}
					textOverflow="ellipsis"
				>
					{objectId}
				</Typography>
			</div>
			<div className={styles.permissionMeta}>
				<Badge variant="outlined" color={apiColor}>
					{apiLabel}
				</Badge>
				<OverrideControl
					permission={observed.permission}
					value={currentState}
					onSelect={onSetOverride}
				/>
			</div>
		</div>
	);
});
