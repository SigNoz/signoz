import { Check, Clock, RotateCcw, X, Zap } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import type { BrandedPermission } from '../../hooks/useAuthZ/types';
import { OverrideState } from '../types';

import styles from './OverrideControl.module.css';
import { Button } from '@signozhq/ui/button';

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
		state: OverrideState.Reset,
		label: 'Auto',
		icon: <RotateCcw size={13} />,
		activeClassName: styles.optAuto,
	},
	{
		state: OverrideState.Granted,
		label: 'Grant',
		icon: <Check size={13} />,
		activeClassName: styles.optGranted,
	},
	{
		state: OverrideState.Denied,
		label: 'Deny',
		icon: <X size={13} />,
		activeClassName: styles.optDenied,
	},
	{
		state: OverrideState.Delay,
		label: 'Delay',
		icon: <Clock size={13} />,
		activeClassName: styles.optDelay,
	},
	{
		state: OverrideState.Error,
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
					<Button
						key={option.state}
						type="button"
						aria-pressed={isActive}
						aria-label={option.label}
						title={option.label}
						className={cx(styles.segment, {
							[styles.segmentActive]: isActive,
							[option.activeClassName]: isActive,
						})}
						variant="ghost"
						color="secondary"
						onClick={(): void => onSelect(permission, option.state)}
						data-testid={`override-${option.state}-${permission}`}
					>
						<div className={styles.segmentIcon}>{option.icon}</div>
						{isActive && (
							<Typography.Text as="span" size="small" weight="medium">
								{option.label}
							</Typography.Text>
						)}
					</Button>
				);
			})}
		</div>
	);
}
