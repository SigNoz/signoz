import { Check, Clock, RotateCcw, X, Zap } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import type { BrandedPermission } from '../../hooks/useAuthZ/types';
import type { OverrideState } from '../types';

import styles from './OverrideControl.module.css';

type OverrideControlProps = {
	permission: BrandedPermission;
	value: OverrideState;
	onSelect: (permission: BrandedPermission, state: OverrideState) => void;
};

type OverrideOption = {
	state: OverrideState;
	label: string;
	icon: React.ReactNode;
	activeClassName: string;
};

const OVERRIDE_OPTIONS: OverrideOption[] = [
	{
		state: 'reset',
		label: 'Auto',
		icon: <RotateCcw size={13} />,
		activeClassName: styles.optAuto,
	},
	{
		state: 'granted',
		label: 'Grant',
		icon: <Check size={13} />,
		activeClassName: styles.optGranted,
	},
	{
		state: 'denied',
		label: 'Deny',
		icon: <X size={13} />,
		activeClassName: styles.optDenied,
	},
	{
		state: 'delay',
		label: 'Delay',
		icon: <Clock size={13} />,
		activeClassName: styles.optDelay,
	},
	{
		state: 'error',
		label: 'Error',
		icon: <Zap size={13} />,
		activeClassName: styles.optError,
	},
];

export function OverrideControl({
	permission,
	value,
	onSelect,
}: OverrideControlProps): JSX.Element {
	return (
		<div className={styles.segmented}>
			{OVERRIDE_OPTIONS.map((option) => {
				const isActive = value === option.state;
				return (
					<button
						key={option.state}
						type="button"
						aria-pressed={isActive}
						aria-label={option.label}
						title={option.label}
						className={cx(styles.segment, {
							[styles.segmentActive]: isActive,
							[option.activeClassName]: isActive,
						})}
						onClick={(): void => onSelect(permission, option.state)}
						data-testid={`override-${option.state}-${permission}`}
					>
						<span className={styles.segmentIcon}>{option.icon}</span>
						{isActive && (
							<Typography.Text as="span" size="small" weight="medium">
								{option.label}
							</Typography.Text>
						)}
					</button>
				);
			})}
		</div>
	);
}
