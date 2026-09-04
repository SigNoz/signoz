import {
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type SyntheticEvent,
	useCallback,
	useRef,
	useState,
} from 'react';
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

interface TriggerProps {
	onPointerEnter?: (event: SyntheticEvent) => void;
	onPointerLeave?: (event: SyntheticEvent) => void;
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
	const isPointerOverRef = useRef(false);
	const [isOpen, setIsOpen] = useState(false);

	/**
	 * Radix closes the tooltip on pointerdown and on click, and merges its own
	 * handlers after the trigger's regardless of `preventDefault`, so the close
	 * has to be filtered here instead. Clicking a disabled control does nothing,
	 * which is exactly when its reason is still wanted, so a close is ignored
	 * while the pointer remains on the control. Everything else — the open
	 * delay, focus, pointer leave — stays Radix's to decide.
	 */
	const handleOpenChange = useCallback((next: boolean): void => {
		if (!next && isPointerOverRef.current) {
			return;
		}
		setIsOpen(next);
	}, []);

	const trackPointer = useCallback(
		(element: ReactElement<TriggerProps>): ReactElement => {
			const { onPointerEnter, onPointerLeave } = element.props;

			return cloneElement(element, {
				onPointerEnter: (event: SyntheticEvent): void => {
					onPointerEnter?.(event);
					isPointerOverRef.current = true;
				},
				onPointerLeave: (event: SyntheticEvent): void => {
					onPointerLeave?.(event);
					isPointerOverRef.current = false;
				},
			});
		},
		[],
	);

	if (!reason) {
		return <>{children}</>;
	}

	return (
		<TooltipSimple
			side={side}
			title={reason}
			open={isOpen}
			onOpenChange={handleOpenChange}
			// A denial has no arrow, matching AuthZTooltip, which is the same
			// presentation elsewhere in the product.
			arrow={kind === 'blocked'}
			disableHoverableContent
			tooltipContentProps={{
				className: cx(
					kind === 'denied' ? styles.errorContent : styles.blockedContent,
					styles.aboveOverlay,
				),
			}}
		>
			{trackPointer(
				asChild && isValidElement<TriggerProps>(children) ? (
					children
				) : (
					// A disabled control swallows hover, so the wrapper is the trigger.
					<span
						className={cx(ownStyles.trigger, interactive && ownStyles.interactive)}
					>
						{children}
					</span>
				),
			)}
		</TooltipSimple>
	);
}

export default DisabledReasonTooltip;
