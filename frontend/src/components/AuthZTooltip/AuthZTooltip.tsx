import { ReactElement, cloneElement, useMemo } from 'react';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import type { BrandedPermission } from 'hooks/useAuthZ/types';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { parsePermission } from 'hooks/useAuthZ/utils';
import styles from './AuthZTooltip.module.scss';

interface AuthZTooltipProps {
	checks: BrandedPermission[];
	children: ReactElement;
	enabled?: boolean;
	tooltipMessage?: string;
}

function formatDeniedMessage(
	denied: BrandedPermission[],
	override?: string,
): string {
	if (override) {
		return override;
	}
	const labels = denied.map((p) => {
		const { relation, object } = parsePermission(p);
		const resource = object.split(':')[0];
		return `${relation} ${resource}`;
	});
	return labels.length === 1
		? `You don't have ${labels[0]} permission`
		: `You don't have ${labels.join(', ')} permissions`;
}

function AuthZTooltip({
	checks,
	children,
	enabled = true,
	tooltipMessage,
}: AuthZTooltipProps): JSX.Element {
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
					{formatDeniedMessage(deniedPermissions, tooltipMessage)}
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}

export default AuthZTooltip;
