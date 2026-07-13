import { Input } from '@signozhq/ui/input';
import { Lock } from '@signozhq/icons';
import cx from 'classnames';

import ExtraPricingBuckets from '../ExtraPricingBuckets';
import styles from './PricingFields.module.scss';
import { parsePricingAmount } from '../../../../../utils';
import type { DrawerDraft } from '../../../../../types';
import { Typography } from '@signozhq/ui/typography';

type Pricing = DrawerDraft['pricing'];

interface PricingFieldsProps {
	pricing: Pricing;
	isReadOnly: boolean;
	onChange: (patch: Partial<Pricing>) => void;
}

function PricingFields({
	pricing,
	isReadOnly,
	onChange,
}: PricingFieldsProps): JSX.Element {
	return (
		<div className={cx(styles.drawerSection, styles.drawerSurface)}>
			<div className={styles.drawerSurfaceHead}>
				<Typography.Text size="base" weight="bold">
					Pricing (per 1M tokens, USD)
				</Typography.Text>

				{isReadOnly && (
					<span className={styles.managedLabel} data-testid="drawer-readonly-label">
						<Lock size={12} />

						<Typography.Text color="muted">Read-only</Typography.Text>
					</span>
				)}
			</div>
			<div className={styles.pricingGrid}>
				<div className={styles.pricingField}>
					<label htmlFor="input-cost">
						Input cost{' '}
						<span className={styles.required} aria-hidden="true">
							*
						</span>
					</label>
					<Input
						id="input-cost"
						type="number"
						step={0.01}
						required
						value={pricing.input ?? ''}
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ input: parsePricingAmount(e.target.value) })
						}
						testId="drawer-input-cost"
					/>
				</div>
				<div className={styles.pricingField}>
					<label htmlFor="output-cost">
						Output cost{' '}
						<span className={styles.required} aria-hidden="true">
							*
						</span>
					</label>
					<Input
						id="output-cost"
						type="number"
						step={0.01}
						required
						value={pricing.output ?? ''}
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ output: parsePricingAmount(e.target.value) })
						}
						testId="drawer-output-cost"
					/>
				</div>
			</div>

			<ExtraPricingBuckets
				pricing={pricing}
				isReadOnly={isReadOnly}
				onChange={onChange}
			/>
		</div>
	);
}

export default PricingFields;
