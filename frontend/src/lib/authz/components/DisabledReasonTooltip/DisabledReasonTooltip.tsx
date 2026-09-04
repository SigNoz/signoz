import type { ReactNode } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';

import styles from '../tooltipContent.module.scss';
import ownStyles from './DisabledReasonTooltip.module.scss';

interface DisabledReasonTooltipProps {
	/** Why the wrapped control is unavailable. Empty renders children bare. */
	reason: string;
	children: ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
	/**
	 * Re-enable pointer events on the wrapper. Needed inside a disabled dropdown
	 * row, which sets `pointer-events: none` and would otherwise swallow hover.
	 */
	interactive?: boolean;
	/**
	 * Use the child as the hover target instead of adding a wrapper, for callers
	 * that already wrap the control themselves — ours would override their layout.
	 */
	asChild?: boolean;
	/**
	 * `denied` — an access problem: the user lacks the permission and can only get
	 * it from someone else. Styled as an error, matching `AuthZTooltip`.
	 *
	 * `blocked` — a state problem the user can act on themselves: a locked
	 * dashboard, or an integration-owned or legacy one. Styled neutrally, since
	 * it is not an error.
	 */
	kind?: 'denied' | 'blocked';
}

/**
 * The non-authz counterpart to `AuthZTooltip`: driven by a resolved reason string
 * rather than a permission check, for controls blocked by a lock, an immutable
 * resource, or a permission already resolved upstream.
 *
 * Shares `tooltipContent.module.scss` with `AuthZTooltip`, so the same kind of
 * block always looks the same wherever it surfaces.
 */
function DisabledReasonTooltip({
	reason,
	children,
	side = 'top',
	interactive = false,
	asChild = false,
	kind = 'denied',
}: DisabledReasonTooltipProps): JSX.Element {
	if (!reason) {
		return <>{children}</>;
	}

	return (
		<TooltipSimple
			side={side}
			title={reason}
			arrow
			disableHoverableContent
			tooltipContentProps={{
				className: cx(
					kind === 'denied' ? styles.errorContent : styles.blockedContent,
					styles.aboveOverlay,
				),
			}}
		>
			{asChild ? (
				children
			) : (
				// A disabled control swallows hover, so the wrapper is the trigger.
				<span
					className={cx(ownStyles.trigger, interactive && ownStyles.interactive)}
				>
					{children}
				</span>
			)}
		</TooltipSimple>
	);
}

export default DisabledReasonTooltip;
