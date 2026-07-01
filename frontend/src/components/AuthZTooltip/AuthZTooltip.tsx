import { ReactElement, cloneElement, useMemo } from 'react';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import type { BrandedPermission } from 'hooks/useAuthZ/types';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { formatPermission } from 'hooks/useAuthZ/utils';
import { useAppContext } from 'providers/App/App';
import styles from './AuthZTooltip.module.scss';

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
		return (
			<span className={styles.wrapper}>
				{cloneElement(children, { disabled: true })}
			</span>
		);
	}

	if (!shouldCheck || deniedPermissions.length === 0) {
		return children;
	}

	return (
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>
					<span
						className={styles.wrapper}
						data-denied-permissions={deniedPermissions.join(',')}
					>
						{cloneElement(children, { disabled: true })}
					</span>
				</TooltipTrigger>
				<TooltipContent className={styles.errorContent}>
					{formatDeniedMessage(deniedPermissions, user.id, tooltipMessage)}
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}

export default AuthZTooltip;
