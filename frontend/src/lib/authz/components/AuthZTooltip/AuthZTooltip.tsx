import {
	cloneElement,
	CSSProperties,
	ReactElement,
	useMemo,
	useRef,
} from 'react';
import { Tooltip } from '@signozhq/ui/tooltip';
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
	/**
	 * Replace the standard denial wording. Prefer the default — it names the exact
	 * scopes — and reach for this only when a surface genuinely needs its own.
	 */
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
	const inlineContainerRef = useRef<HTMLSpanElement>(null);

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

	const tooltip = (
		<Tooltip
			title={
				isBlocked
					? disabledTooltip
					: formatDeniedMessage(deniedPermissions, user.id, tooltipMessage)
			}
			side={side}
			className={cx(
				isBlocked ? styles.blockedContent : styles.errorContent,
				styles.aboveOverlay,
			)}
			container={withPortal === false ? inlineContainerRef : undefined}
		>
			{/*
			 * A natively disabled control receives no hover, so the popup never
			 * opens. The span is the trigger; the control stays disabled.
			 */}
			<span style={{ display: 'inline-flex' }}>
				{cloneElement(children, {
					disabled: true,
					style: DISABLED_STYLE,
					onClick: noOp,
					onMouseDown: noOp,
					onPointerDown: noOp,
					...(isBlocked
						? {}
						: { 'data-denied-permissions': deniedPermissions.join(',') }),
				})}
			</span>
		</Tooltip>
	);

	// A modal stacks above a body portal. Keep the popup in this subtree so it
	// shares that stacking context.
	if (withPortal === false) {
		return (
			<span ref={inlineContainerRef} style={{ display: 'contents' }}>
				{tooltip}
			</span>
		);
	}

	return tooltip;
}

export default AuthZTooltip;
