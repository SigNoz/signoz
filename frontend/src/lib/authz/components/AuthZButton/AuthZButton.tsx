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
	/**
	 * A non-permission block the consumer already knows about — a lock, an
	 * immutable resource. Takes precedence over `checks`, which are then skipped.
	 */
	disabledTooltip?: string;
	/** Which side of the button to render the tooltip against. */
	side?: 'top' | 'bottom' | 'left' | 'right';
	/**
	 * Set this false when this button is used inside a modal/drawer of signozhq/ui,
	 * otherwise the tooltip will not have the correct z-index
	 */
	withPortal?: false;
};

function AuthZButton({
	checks,
	tooltipMessage,
	authZEnabled = true,
	disabledTooltip,
	side,
	withPortal,
	...buttonProps
}: AuthZButtonProps): JSX.Element {
	return (
		<AuthZTooltip
			checks={checks}
			enabled={authZEnabled}
			tooltipMessage={tooltipMessage}
			disabledTooltip={disabledTooltip}
			side={side}
			withPortal={withPortal}
		>
			<Button {...buttonProps} />
		</AuthZTooltip>
	);
}

export default AuthZButton;
