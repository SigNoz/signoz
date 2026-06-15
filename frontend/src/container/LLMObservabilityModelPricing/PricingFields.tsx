import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Lock } from '@signozhq/icons';
import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import { CACHE_MODE_OPTIONS } from './constants';
import type { DrawerDraft } from './types';

type Pricing = DrawerDraft['pricing'];

interface PricingFieldsProps {
	pricing: Pricing;
	isReadOnly: boolean;
	onChange: (patch: Partial<Pricing>) => void;
}

// Parses a number input's raw string. Empty → null (used by optional buckets),
// otherwise a finite number (NaN coerced to 0).
function parseAmount(raw: string): number | null {
	if (raw.trim() === '') {
		return null;
	}
	const value = Number(raw);
	return Number.isFinite(value) ? value : 0;
}

function PricingFields({
	pricing,
	isReadOnly,
	onChange,
}: PricingFieldsProps): JSX.Element {
	const hasCacheBucket =
		pricing.cacheRead !== null || pricing.cacheWrite !== null;

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
						min={0}
						step={0.01}
						value={pricing.input}
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ input: parseAmount(e.target.value) ?? 0 })
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
						min={0}
						step={0.01}
						value={pricing.output}
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ output: parseAmount(e.target.value) ?? 0 })
						}
						testId="drawer-output-cost"
					/>
				</div>
			</div>

			<div className="extras-divider">Extra pricing buckets</div>
			<div className="pricing-grid">
				<div className="pricing-field">
					<label htmlFor="cache-read">cache_read</label>
					<Input
						id="cache-read"
						type="number"
						min={0}
						step={0.01}
						value={pricing.cacheRead ?? ''}
						placeholder="—"
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ cacheRead: parseAmount(e.target.value) })
						}
						testId="drawer-cache-read-cost"
					/>
				</div>
				<div className="pricing-field">
					<label htmlFor="cache-write">cache_write</label>
					<Input
						id="cache-write"
						type="number"
						min={0}
						step={0.01}
						value={pricing.cacheWrite ?? ''}
						placeholder="—"
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({ cacheWrite: parseAmount(e.target.value) })
						}
						testId="drawer-cache-write-cost"
					/>
				</div>
			</div>
			{hasCacheBucket && (
				<div className="pricing-field cache-mode-field">
					<label htmlFor="cache-mode">Cache mode</label>
					<SelectSimple
						id="cache-mode"
						value={pricing.cacheMode}
						items={CACHE_MODE_OPTIONS}
						onChange={(v): void => onChange({ cacheMode: v as CacheModeDTO })}
						disabled={isReadOnly}
						className="full-width"
						withPortal={false}
						testId="drawer-cache-mode"
					/>
				</div>
			)}
		</div>
	);
}

export default PricingFields;
