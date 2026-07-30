import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Lock } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './SourceSelector.module.scss';

interface SourceSelectorProps {
	isOverride: boolean;
	isReadOnly: boolean;
	disableAuto?: boolean;
	onChange: (isOverride: boolean) => void;
}

// Auto-populated vs user-override selector, with a confirm step before
// discarding custom values back to defaults.
function SourceSelector({
	isOverride,
	isReadOnly,
	disableAuto = false,
	onChange,
}: SourceSelectorProps): JSX.Element {
	const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

	const handleSourceChange = (value: 'auto' | 'override'): void => {
		if (value === 'auto' && isOverride) {
			setShowResetConfirm(true);
			return;
		}
		if (value === 'override' && !isOverride) {
			onChange(true);
		}
	};

	const confirmReset = (): void => {
		onChange(false);
		setShowResetConfirm(false);
	};

	return (
		<div className={cx(styles.drawerSection, styles.drawerSurface)}>
			<div className={styles.drawerSurfaceHead}>
				<Typography.Text weight="bold" size="base">
					Source
				</Typography.Text>

				{isReadOnly && (
					<span className={styles.managedLabel} data-testid="drawer-managed-label">
						<Lock size={12} />
						Managed by SigNoz
					</span>
				)}
			</div>
			<RadioGroup
				value={isOverride ? 'override' : 'auto'}
				onChange={(value): void => handleSourceChange(value as 'auto' | 'override')}
				className={styles.sourceRadioGroup}
			>
				<RadioGroupItem
					value="auto"
					containerClassName={styles.sourceRadio}
					testId="drawer-source-auto"
					disabled={disableAuto}
				>
					<div className={styles.sourceRadioTitle}>Auto-populated</div>
					<div className={styles.sourceRadioDesc}>
						{disableAuto
							? 'Available once SigNoz has default pricing for this model.'
							: 'Default pricing from SigNoz.'}
					</div>
				</RadioGroupItem>
				<RadioGroupItem
					value="override"
					containerClassName={styles.sourceRadio}
					testId="drawer-source-override"
				>
					<div className={styles.sourceRadioTitle}>User override</div>
					<div className={styles.sourceRadioDesc}>
						Custom pricing. Takes precedence.
					</div>
				</RadioGroupItem>
			</RadioGroup>
			{showResetConfirm && (
				<div className={styles.resetConfirm} aria-label="Reset to default pricing">
					<p>
						Reset to default pricing? Custom values will be discarded. It might take
						24 hours for changes to take effect.
					</p>
					<div className={styles.resetConfirmActions}>
						<Button
							variant="outlined"
							color="secondary"
							onClick={(): void => setShowResetConfirm(false)}
							testId="drawer-reset-keep-btn"
						>
							Keep
						</Button>
						<Button
							variant="solid"
							color="primary"
							onClick={confirmReset}
							testId="drawer-reset-confirm-btn"
						>
							Reset
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default SourceSelector;
