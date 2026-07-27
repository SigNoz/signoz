import { Button, ButtonProps } from '@signozhq/ui/button';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

export type AuthZButtonProps = ButtonProps & {
	/**
	 * Permissions required to enable the button (AND semantics).
	 */
	checks: BrandedPermission[];
	/**
	 * Override the default denial tooltip message.
	 */
	tooltipMessage?: string;
	/**
	 * Gate the permission check itself. When false, renders a plain button.
	 */
	authZEnabled?: boolean;
};

function AuthZButton({
	checks,
	tooltipMessage,
	authZEnabled = true,
	...buttonProps
}: AuthZButtonProps): JSX.Element {
	return (
		<AuthZTooltip
			checks={checks}
			enabled={authZEnabled}
			tooltipMessage={tooltipMessage}
		>
			<Button {...buttonProps} />
		</AuthZTooltip>
	);
}

export default AuthZButton;
