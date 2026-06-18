import { Input } from '@signozhq/ui/input';
import { Lock } from '@signozhq/icons';

import ExtraPricingBuckets from './ExtraPricingBuckets';
import { parsePricingAmount } from './utils';
import type { DrawerDraft } from './types';

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
		<div className="drawer-section drawer-surface">
			<div className="drawer-surface__head">
				<h4>Pricing (per 1M tokens, USD)</h4>
				{isReadOnly && (
					<span className="managed-label" data-testid="drawer-readonly-label">
						<Lock size={12} />
						Read-only
					</span>
				)}
			</div>
			<div className="pricing-grid">
				<div className="pricing-field">
					<label htmlFor="input-cost">
						Input cost <span className="required">*</span>
					</label>
					<Input
						id="input-cost"
						type="number"
						step={0.01}
						value={pricing.input ?? ''}
						placeholder="1.00"
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ input: parsePricingAmount(e.target.value) })
						}
						testId="drawer-input-cost"
					/>
				</div>
				<div className="pricing-field">
					<label htmlFor="output-cost">
						Output cost <span className="required">*</span>
					</label>
					<Input
						id="output-cost"
						type="number"
						step={0.01}
						value={pricing.output ?? ''}
						placeholder="1.00"
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
