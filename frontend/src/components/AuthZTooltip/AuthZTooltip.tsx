import { ReactElement, cloneElement, useMemo } from 'react';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import type {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
} from 'hooks/useAuthZ/types';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { buildPermission } from 'hooks/useAuthZ/utils';
import styles from './AuthZTooltip.module.scss';

type AuthZCheck = {
	relation: AuthZRelation;
	object: string;
	permissionName: string;
};

interface AuthZTooltipProps {
	relation?: AuthZRelation;
	object?: string;
	permissionName?: string;
	checks?: AuthZCheck[];
	children: ReactElement;
	enabled?: boolean;
}

function buildPermissionFromCheck(check: AuthZCheck): BrandedPermission {
	return buildPermission(
		check.relation,
		check.object as AuthZObject<typeof check.relation>,
	);
}

function AuthZTooltip({
	relation,
	object,
	permissionName,
	checks,
	children,
	enabled = true,
}: AuthZTooltipProps): JSX.Element {
	const normalisedChecks: AuthZCheck[] = useMemo(() => {
		if (checks && checks.length > 0) {
			return checks;
		}
		if (relation && object && permissionName) {
			return [{ relation, object, permissionName }];
		}
		return [];
	}, [checks, relation, object, permissionName]);

	const permissions = useMemo(
		() => normalisedChecks.map(buildPermissionFromCheck),
		[normalisedChecks],
	);

	const { permissions: authZResult, isLoading } = useAuthZ(
		permissions as BrandedPermission[],
		{ enabled: enabled && normalisedChecks.length > 0 },
	);

	const deniedChecks = useMemo(() => {
		if (isLoading || !authZResult) {
			return [];
		}
		return normalisedChecks.filter((c) => {
			const perm = buildPermissionFromCheck(c);
			return authZResult[perm as BrandedPermission]?.isGranted === false;
		});
	}, [authZResult, isLoading, normalisedChecks]);

	if (isLoading || deniedChecks.length === 0) {
		return children;
	}

	const deniedNames = deniedChecks.map((c) => c.permissionName);
	const tooltipMessage =
		deniedNames.length === 1
			? `You don't have ${deniedNames[0]} permission`
			: `You don't have ${deniedNames.join(', ')} permissions`;

	return (
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>
					<span className={styles.wrapper}>
						<fieldset
							disabled
							className={styles.disabledFieldset}
							data-denied-permissions={deniedNames.join(',')}
						>
							{cloneElement(children, {
								disabled: true,
							})}
						</fieldset>
					</span>
				</TooltipTrigger>
				<TooltipContent className={styles.errorContent}>
					{tooltipMessage}
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}

export default AuthZTooltip;
