import { Button } from '@signozhq/button';

import { AuthZRelation } from '../../hooks/useAuthZ/types';
import { parsePermission } from '../../hooks/useAuthZ/utils';
import {
	ButtonWithTooltip,
	ButtonWithTooltipProps,
} from '../ButtonWithTooltip/ButtonWithTooltip';
import { GuardAuthZ, GuardAuthZProps } from '../GuardAuthZ/GuardAuthZ';

export function GuardButton<R extends AuthZRelation>({
	children,
	tooltipTitle,
	tooltipDisabled = true,
	...props
}: ButtonWithTooltipProps &
	Omit<GuardAuthZProps<R>, 'children'> & {
		tooltipTitle?: string;
	}): JSX.Element {
	return (
		<GuardAuthZ
			relation={props.relation}
			object={props.object}
			fallbackOnLoading={
				<Button {...props} loading={true}>
					{children}
				</Button>
			}
			fallbackOnNoPermissions={({ requiredPermissionName }): JSX.Element => {
				const { relation, object } = parsePermission(requiredPermissionName);

				return (
					<ButtonWithTooltip
						{...props}
						disabled={true}
						tooltipTitle={
							tooltipTitle || `You don't have ${relation}:${object} permission.`
						}
					>
						{children}
					</ButtonWithTooltip>
				);
			}}
		>
			<ButtonWithTooltip
				tooltipDisabled={tooltipDisabled}
				tooltipTitle={tooltipTitle}
				{...props}
			>
				{children}
			</ButtonWithTooltip>
		</GuardAuthZ>
	);
}
