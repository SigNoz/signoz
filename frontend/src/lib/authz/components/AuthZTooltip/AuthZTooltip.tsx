import {
	cloneElement,
	CSSProperties,
	ReactElement,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	TooltipContent,
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';
import { useAppContext } from 'providers/App/App';
import cx from 'classnames';

import styles from '../tooltipContent.module.scss';

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
	/**
	 * A block the consumer already knows about that is not a permission — a lock,
	 * an immutable resource, a forced read-only mount.
	 *
	 * It takes precedence over the checks, which are skipped entirely: the control
	 * is unavailable either way, so running them would only cost a request. Set it
	 * only when the non-permission block is the real obstacle, so a missing
	 * permission still surfaces its own message.
	 */
	disabledTooltip?: string;
	/** Which side of the control to render against. Defaults to the top. */
	side?: 'top' | 'bottom' | 'left' | 'right';
	/**
	 * Set this false when this button is used inside a modal/drawer of signozhq/ui,
	 * otherwise the tooltip will not have the correct z-index
	 */
	withPortal?: false;
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
	disabledTooltip,
	side,
	withPortal,
}: AuthZTooltipProps): JSX.Element {
	const { user } = useAppContext();
	const isPointerOverRef = useRef(false);
	const [isOpen, setIsOpen] = useState(false);

	// The block the consumer passed is already decisive, so the check is not run.
	const isBlocked = !!disabledTooltip;
	const shouldCheck = enabled && checks.length > 0 && !isBlocked;

	const { permissions, isLoading } = useAuthZ(checks, { enabled: shouldCheck });

	const deniedPermissions = useMemo(() => {
		if (!permissions) {
			return [];
		}
		return checks.filter((p) => permissions[p]?.isGranted === false);
	}, [checks, permissions]);

	/**
	 * Radix closes the tooltip on pointerdown and on click, and merges its own
	 * handlers after the trigger's regardless of `preventDefault`, so the close is
	 * filtered here. Clicking a dead control does nothing, which is exactly when
	 * its reason is still wanted, so a close is ignored while the pointer remains
	 * on it. Everything else stays Radix's to decide.
	 */
	const handleOpenChange = useCallback((next: boolean): void => {
		if (!next && isPointerOverRef.current) {
			return;
		}
		setIsOpen(next);
	}, []);

	if (shouldCheck && isLoading) {
		return cloneElement(children, {
			disabled: true,
			style: DISABLED_STYLE,
			onClick: noOp,
			onMouseDown: noOp,
			onPointerDown: noOp,
		});
	}

	if (!isBlocked && (!shouldCheck || deniedPermissions.length === 0)) {
		return children;
	}

	const childTestId = (children.props as { testId?: string }).testId;

	return (
		<TooltipProvider>
			<TooltipRoot open={isOpen} onOpenChange={handleOpenChange}>
				<TooltipTrigger asChild testId={childTestId}>
					{cloneElement(children, {
						disabled: true,
						style: DISABLED_STYLE,
						onClick: noOp,
						onMouseDown: noOp,
						onPointerDown: noOp,
						onPointerEnter: (): void => {
							isPointerOverRef.current = true;
						},
						onPointerLeave: (): void => {
							isPointerOverRef.current = false;
						},
						...(isBlocked
							? {}
							: { 'data-denied-permissions': deniedPermissions.join(',') }),
					})}
				</TooltipTrigger>
				<TooltipContent
					side={side}
					// A denial has no arrow; a state the user can act on is not an error
					// and reads as a normal tooltip.
					arrow={isBlocked}
					className={cx(
						isBlocked ? styles.blockedContent : styles.errorContent,
						styles.aboveOverlay,
					)}
					withPortal={withPortal}
				>
					{isBlocked
						? disabledTooltip
						: formatDeniedMessage(deniedPermissions, user.id, tooltipMessage)}
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}

export default AuthZTooltip;
