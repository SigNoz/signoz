import { forwardRef } from 'react';
import { BellOff } from '@signozhq/icons';
import classNames from 'classnames';

import './AlertStateSegmented.styles.scss';

export type AlertSegmentedState = 'active' | 'muted' | 'disabled';

export interface AlertStateSegmentedProps {
	state: AlertSegmentedState;
	onActive: () => void;
	onMute: () => void;
	onDisable: () => void;
	disabled?: boolean;
}

const AlertStateSegmented = forwardRef<
	HTMLDivElement,
	AlertStateSegmentedProps
>(function AlertStateSegmented(props, ref): JSX.Element {
	const { state, onActive, onMute, onDisable, disabled } = props;

	const isMuted = state === 'muted';
	const isDisabled = state === 'disabled';

	return (
		<div
			className="alert-state-segmented"
			role="tablist"
			aria-label="Alert rule state"
			ref={ref}
		>
			<button
				type="button"
				role="tab"
				aria-selected={state === 'active'}
				aria-label="Active"
				className={classNames('alert-state-segmented__pill', {
					'alert-state-segmented__pill--active-active': state === 'active',
				})}
				onClick={onActive}
				// Per spec: when muted, un-muting must happen via Planned Downtimes,
				// so the Active pill is non-interactive while muted.
				disabled={disabled || isMuted}
			>
				{state === 'active' && (
					<span className="alert-state-segmented__dot" aria-hidden />
				)}
				<span className="alert-state-segmented__label">Active</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={state === 'muted'}
				aria-label="Mute"
				className={classNames('alert-state-segmented__pill', {
					'alert-state-segmented__pill--active-muted': state === 'muted',
				})}
				onClick={onMute}
				// Muting a disabled rule wouldn't change observable behavior, so the
				// Mute pill is non-interactive while disabled.
				disabled={disabled || isDisabled}
			>
				{state === 'muted' && (
					<BellOff size={12} className="alert-state-segmented__icon" />
				)}
				<span className="alert-state-segmented__label">Mute</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={state === 'disabled'}
				aria-label="Disable"
				className={classNames('alert-state-segmented__pill', {
					'alert-state-segmented__pill--active-disabled': state === 'disabled',
				})}
				onClick={onDisable}
				disabled={disabled}
			>
				<span className="alert-state-segmented__label">Disable</span>
			</button>
		</div>
	);
});

export default AlertStateSegmented;
