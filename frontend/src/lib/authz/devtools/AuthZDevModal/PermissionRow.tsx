import { Badge, BadgeColor } from '@signozhq/ui/badge';
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

	let apiColor: BadgeColor = 'secondary';
	let apiLabel = 'API ?';
	if (observed.apiValue === true) {
		apiColor = 'success';
		apiLabel = 'API ✓';
	} else if (observed.apiValue === false) {
		apiColor = 'error';
		apiLabel = 'API ✗';
	}

	return (
		<div
			className={cx(styles.permissionRow, ROW_OVERRIDE_CLASSES[currentState])}
			data-testid={`permission-row-${observed.permission}`}
		>
			<div className={styles.permissionInfo}>
				<Typography.Text
					as="span"
					size="small"
					weight="medium"
					className={styles.relation}
				>
					{relation}
				</Typography.Text>
				<Typography.Text
					as="span"
					size="small"
					color="muted"
					className={styles.separator}
				>
					:
				</Typography.Text>
				<Typography.Text
					as="span"
					size="small"
					truncate={1}
					className={styles.object}
				>
					{objectId}
				</Typography.Text>
			</div>
			<div className={styles.permissionMeta}>
				<Badge variant="outline" color={apiColor}>
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
