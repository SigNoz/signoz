import { CSSProperties, ReactElement, cloneElement, useMemo } from 'react';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';
import { useAppContext } from 'providers/App/App';
import styles from './AuthZTooltip.module.scss';

const DISABLED_STYLE: CSSProperties = {
	pointerEvents: 'all',
	cursor: 'not-allowed',
};

const noOp = (): void => {};

interface AuthZTooltipProps {
	checks: BrandedPermission[];
	children: ReactElement;
	enabled?: boolean;
	tooltipMessage?: string;
}

function formatDeniedMessage(
	denied: BrandedPermission[],
	userId: string,
	override?: string,
): string {
	if (override) {
		return override;
	}
	const permissions = denied.map(formatPermission).join(', ');
	return `user/${userId} is not authorized to perform ${permissions}`;
}

function AuthZTooltip({
	checks,
	children,
	enabled = true,
	tooltipMessage,
}: AuthZTooltipProps): JSX.Element {
	const { user } = useAppContext();
	const shouldCheck = enabled && checks.length > 0;

	const { permissions, isLoading } = useAuthZ(checks, { enabled: shouldCheck });

	const deniedPermissions = useMemo(() => {
		if (!permissions) {
			return [];
		}
		return checks.filter((p) => permissions[p]?.isGranted === false);
	}, [checks, permissions]);

	if (shouldCheck && isLoading) {
		return cloneElement(children, {
			disabled: true,
			style: DISABLED_STYLE,
			onClick: noOp,
			onMouseDown: noOp,
			onPointerDown: noOp,
		});
	}

	if (!shouldCheck || deniedPermissions.length === 0) {
		return children;
	}

	return (
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>
					{cloneElement(children, {
						disabled: true,
						style: DISABLED_STYLE,
						onClick: noOp,
						onMouseDown: noOp,
						onPointerDown: noOp,
						'data-denied-permissions': deniedPermissions.join(','),
					})}
				</TooltipTrigger>
				<TooltipContent className={styles.errorContent}>
					{formatDeniedMessage(deniedPermissions, user.id, tooltipMessage)}
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}

export default AuthZTooltip;
