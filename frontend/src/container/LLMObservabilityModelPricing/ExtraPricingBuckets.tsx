import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Plus, Trash2 } from '@signozhq/icons';
import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import { CACHE_BUCKETS, CACHE_MODE_OPTIONS } from './constants';
import { parsePricingAmount } from './utils';
import type { CacheBucketKey, DrawerDraft } from './types';

type Pricing = DrawerDraft['pricing'];

interface ExtraPricingBucketsProps {
	pricing: Pricing;
	isReadOnly: boolean;
	onChange: (patch: Partial<Pricing>) => void;
}

// Optional, add-on-demand pricing buckets. A bucket is "added" once its value
// is non-null; adding seeds it at 0 and removing clears it back to null. Only
// the cache buckets are backed by the API today (pricing.cache.read/write).
function ExtraPricingBuckets({
	pricing,
	isReadOnly,
	onChange,
}: ExtraPricingBucketsProps): JSX.Element {
	const [isPicking, setIsPicking] = useState<boolean>(false);

	const addedBuckets = CACHE_BUCKETS.filter((b) => pricing[b.key] !== null);
	const availableBuckets = CACHE_BUCKETS.filter((b) => pricing[b.key] === null);

	const addBucket = (key: CacheBucketKey): void => {
		onChange({ [key]: 0 } as Partial<Pricing>);
		// Close the picker once nothing is left to add.
		if (availableBuckets.length <= 1) {
			setIsPicking(false);
		}
	};

	const removeBucket = (key: CacheBucketKey): void => {
		onChange({ [key]: null } as Partial<Pricing>);
	};

	return (
		<div className="extra-buckets-section drawer-section">
			<div className="extra-buckets-section__head">
				<span className="field-label">Extra pricing buckets</span>
				<span className="optional-label">optional</span>
			</div>

			{addedBuckets.map((bucket) => (
				<div className="bucket-row" key={bucket.key}>
					<span className="bucket-row__name">{bucket.label}</span>
					<Input
						type="number"
						min={0}
						step={0.01}
						value={pricing[bucket.key] ?? ''}
						placeholder="0.00"
						disabled={isReadOnly}
						onChange={(e): void =>
							onChange({
								[bucket.key]: parsePricingAmount(e.target.value),
							} as Partial<Pricing>)
						}
						testId={`drawer-${bucket.testId}-cost`}
					/>
					<span className="bucket-row__unit">/ 1M</span>
					{!isReadOnly && (
						<button
							type="button"
							className="bucket-row__remove"
							onClick={(): void => removeBucket(bucket.key)}
							aria-label={`Remove ${bucket.label}`}
							data-testid={`drawer-remove-${bucket.testId}`}
						>
							<Trash2 size={14} />
						</button>
					)}
				</div>
			))}

			{addedBuckets.length > 0 && (
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

			{!isReadOnly && !isPicking && availableBuckets.length > 0 && (
				<Button
					variant="dashed"
					color="secondary"
					className="bucket-add-btn"
					prefix={<Plus size={14} />}
					onClick={(): void => setIsPicking(true)}
					testId="drawer-add-bucket-btn"
				>
					Add pricing bucket
				</Button>
			)}

			{!isReadOnly && isPicking && (
				<div className="bucket-picker" data-testid="drawer-bucket-picker">
					<div className="bucket-picker__title">Add a pricing bucket</div>
					<div className="bucket-picker__chips">
						{availableBuckets.map((bucket) => (
							<Button
								key={bucket.key}
								variant="outlined"
								color="secondary"
								size="sm"
								prefix={<Plus size={12} />}
								onClick={(): void => addBucket(bucket.key)}
								testId={`drawer-add-bucket-${bucket.testId}`}
							>
								{bucket.label}
							</Button>
						))}
					</div>
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						onClick={(): void => setIsPicking(false)}
						testId="drawer-add-bucket-cancel"
					>
						Cancel
					</Button>
				</div>
			)}
		</div>
	);
}

export default ExtraPricingBuckets;
