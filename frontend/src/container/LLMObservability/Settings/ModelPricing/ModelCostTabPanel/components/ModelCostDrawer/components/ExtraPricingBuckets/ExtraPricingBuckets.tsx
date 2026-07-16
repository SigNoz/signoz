import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { Plus, Trash2 } from '@signozhq/icons';
import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';

import { CACHE_BUCKETS, CACHE_MODE_OPTIONS } from '../../../../../constants';
import styles from './ExtraPricingBuckets.module.scss';
import { parsePricingAmount } from '../../../../../utils';
import type { CacheBucketKey, DrawerDraft } from '../../../../../types';
import { Tooltip } from 'antd';

type Pricing = DrawerDraft['pricing'];

interface ExtraPricingBucketsProps {
	pricing: Pricing;
	isReadOnly: boolean;
	onChange: (patch: Partial<Pricing>) => void;
}

function ExtraPricingBuckets({
	pricing,
	isReadOnly,
	onChange,
}: ExtraPricingBucketsProps): JSX.Element {
	const [isExtraPricingBucketOpen, setIsExtraPricingBucketOpen] =
		useState<boolean>(false);

	// Track which buckets are shown separately from their value, so a freshly
	// added bucket can start blank (value null) instead of being seeded to 0.
	// Seeded from buckets that already carry a value (edit mode).
	const [addedKeys, setAddedKeys] = useState<Set<CacheBucketKey>>(
		() =>
			new Set(
				CACHE_BUCKETS.filter((b) => pricing[b.key] !== null).map((b) => b.key),
			),
	);

	const addedBuckets = CACHE_BUCKETS.filter((b) => addedKeys.has(b.key));
	const availableBuckets = CACHE_BUCKETS.filter((b) => !addedKeys.has(b.key));
	const patchBucket = (key: CacheBucketKey, value: number | null): void => {
		const patch: Partial<Pricing> = { [key]: value };
		onChange(patch);
	};

	const addBucket = (key: CacheBucketKey): void => {
		// Leave the value null so the field renders blank until the user types.
		setAddedKeys((prev) => new Set(prev).add(key));
		// Close the picker once nothing is left to add.
		if (availableBuckets.length <= 1) {
			setIsExtraPricingBucketOpen(false);
		}
	};

	const removeBucket = (key: CacheBucketKey): void => {
		setAddedKeys((prev) => {
			const next = new Set(prev);
			next.delete(key);
			return next;
		});
		patchBucket(key, null);
	};

	return (
		<div className={cx(styles.extraBucketsSection, styles.drawerSection)}>
			<div className={styles.extraBucketsSectionHead}>
				<Typography.Text as="span" size="small" color="muted">
					Extra Pricing Buckets
				</Typography.Text>
				<Typography.Text as="span" size="small" color="muted">
					Optional
				</Typography.Text>
			</div>

			{addedBuckets.map((bucket) => (
				<div className={styles.bucketRow} key={bucket.key}>
					<Typography.Text as="span" className={styles.bucketRowName}>
						{bucket.label}
					</Typography.Text>
					<Input
						type="number"
						min={0}
						step={0.01}
						value={pricing[bucket.key] ?? ''}
						disabled={isReadOnly}
						onChange={(e): void =>
							// Clearing the field is allowed — the row stays mounted because
							// presence is tracked in `addedKeys`, not the value. Removal is
							// explicit via the trash button.
							patchBucket(bucket.key, parsePricingAmount(e.target.value))
						}
						testId={`drawer-${bucket.testId}-cost`}
					/>
					<Tooltip title="Pricing per 1M tokens" placement="left">
						<Typography.Text size="xs" color="muted">
							1M
						</Typography.Text>
					</Tooltip>

					{!isReadOnly && (
						<Button
							size="icon"
							variant="ghost"
							color="destructive"
							onClick={(): void => removeBucket(bucket.key)}
							aria-label={`Remove ${bucket.label}`}
							data-testid={`drawer-remove-${bucket.testId}`}
							prefix={<Trash2 size={14} />}
						/>
					)}
				</div>
			))}

			{addedBuckets.length > 0 && (
				<div className={cx(styles.pricingField, styles.cacheModeField)}>
					<label htmlFor="cache-mode">Cache mode</label>
					<SelectSimple
						id="cache-mode"
						value={pricing.cacheMode}
						items={CACHE_MODE_OPTIONS}
						onChange={(v): void => onChange({ cacheMode: v as CacheModeDTO })}
						disabled={isReadOnly}
						className={styles.fullWidth}
						withPortal={false}
						testId="drawer-cache-mode"
					/>
				</div>
			)}

			{!isReadOnly && !isExtraPricingBucketOpen && availableBuckets.length > 0 && (
				<Button
					variant="dashed"
					color="secondary"
					className={styles.bucketAddBtn}
					prefix={<Plus size={14} />}
					onClick={(): void => setIsExtraPricingBucketOpen(true)}
					testId="drawer-add-bucket-btn"
				>
					Add pricing bucket
				</Button>
			)}

			{!isReadOnly && isExtraPricingBucketOpen && (
				<div className={styles.bucketPicker} data-testid="drawer-bucket-picker">
					<div className={styles.bucketPickerTitle}>Add a pricing bucket</div>
					<div className={styles.bucketPickerChips}>
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
						onClick={(): void => setIsExtraPricingBucketOpen(false)}
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
