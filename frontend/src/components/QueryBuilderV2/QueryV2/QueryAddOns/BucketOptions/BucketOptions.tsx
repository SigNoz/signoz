import { useCallback, useMemo, useState } from 'react';
import { Button } from 'antd';
import cx from 'classnames';
import { InputNumber } from '@signozhq/ui/input-number';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import { ChevronUp } from '@signozhq/icons';
import { Querybuildertypesv5BucketOptionsDTO } from 'api/generated/services/sigNoz.schemas';

import {
	BUCKET_KIND_HINTS,
	BUCKET_KIND_OPTIONS,
	DEFAULT_NUM_BUCKETS,
	LOG_BANDS_OPTIONS,
	MAX_NUM_BUCKETS,
} from './constants';
import {
	bandsPerDoublingFromScale,
	BucketKindOption,
	formatUpperBound,
	hasBoundsBeyondPreview,
	isLinearBuckets,
	kindOptionOf,
	linearBuckets,
	logBuckets,
	logScaleOf,
	previewUpperBounds,
	scaleFromBandsPerDoubling,
} from './utils';

import styles from './BucketOptions.module.scss';

function BucketOptions({
	bucketOptions,
	unit,
	onChange,
	onClose,
}: {
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/** The panel's y-axis unit, so the previewed bounds read the way the axis will. */
	unit?: string;
	onChange: (next: Querybuildertypesv5BucketOptionsDTO | undefined) => void;
	/** Omitted where the section isn't dismissable, as on a formula. */
	onClose?: () => void;
}): JSX.Element {
	// A linear axis has no bounds to describe until it has a max value, so the picked
	// kind is held here rather than read back off the emitted options: it has to survive
	// the gap between choosing Linear and filling the field in.
	const [kind, setKind] = useState<BucketKindOption>(
		kindOptionOf(bucketOptions),
	);
	const linearSpec =
		bucketOptions && isLinearBuckets(bucketOptions)
			? bucketOptions.spec
			: undefined;
	const [logScale, setLogScale] = useState<number>(logScaleOf(bucketOptions));
	const [maxValue, setMaxValue] = useState<number | null>(
		linearSpec?.maxValue ?? null,
	);
	const [numBuckets, setNumBuckets] = useState<number | null>(
		linearSpec?.numBuckets ?? null,
	);

	const emitLinear = useCallback(
		(nextMaxValue: number | null, nextNumBuckets: number | null): void => {
			// An incomplete linear axis is sent as no axis at all rather than as a spec the
			// request would reject.
			if (nextMaxValue === null || nextMaxValue <= 0) {
				onChange(undefined);
				return;
			}

			onChange(linearBuckets(nextMaxValue, nextNumBuckets));
		},
		[onChange],
	);

	const handleKindChange = useCallback(
		(value: string): void => {
			// Radix clears the value when the active item is clicked again; a bucket axis is
			// always one of the three, so keep the current pick instead.
			if (!value) {
				return;
			}

			const nextKind = value as BucketKindOption;
			setKind(nextKind);

			if (nextKind === 'auto') {
				onChange(undefined);
			} else if (nextKind === 'log') {
				onChange(logBuckets(logScale));
			} else {
				emitLinear(maxValue, numBuckets);
			}
		},
		[emitLinear, logScale, maxValue, numBuckets, onChange],
	);

	const handleBandsChange = useCallback(
		(value: string): void => {
			if (!value) {
				return;
			}

			const nextScale = scaleFromBandsPerDoubling(Number(value));
			setLogScale(nextScale);
			onChange(logBuckets(nextScale));
		},
		[onChange],
	);

	const handleMaxValueChange = useCallback(
		(value: number | string | null): void => {
			const next = value === null || value === '' ? null : Number(value);
			setMaxValue(next);
			emitLinear(next, numBuckets);
		},
		[emitLinear, numBuckets],
	);

	const handleNumBucketsChange = useCallback(
		(value: number | string | null): void => {
			const next = value === null || value === '' ? null : Number(value);
			setNumBuckets(next);
			emitLinear(maxValue, next);
		},
		[emitLinear, maxValue],
	);

	// The toggle group takes a ReactNode label, which is how each item picks up the
	// query builder's value type — the component exposes no font-family token.
	const kindItems = useMemo(
		() =>
			BUCKET_KIND_OPTIONS.map(({ value, label }) => ({
				value,
				label: <span className={styles.toggleLabel}>{label}</span>,
				'aria-label': label,
			})),
		[],
	);

	const bandItems = useMemo(
		() =>
			LOG_BANDS_OPTIONS.map(({ value, label }) => ({
				value,
				label: <span className={styles.toggleLabel}>{label}</span>,
				'aria-label': label,
			})),
		[],
	);

	// The kind toggle can be ahead of what has been emitted, so the preview describes
	// the picked kind rather than the emitted options.
	const previewedOptions = useMemo(():
		| Querybuildertypesv5BucketOptionsDTO
		| undefined => {
		if (kind === 'log') {
			return logBuckets(logScale);
		}
		if (kind === 'linear' && maxValue !== null) {
			return linearBuckets(maxValue, numBuckets);
		}
		return undefined;
	}, [kind, logScale, maxValue, numBuckets]);

	const bounds =
		kind === 'linear' && !previewedOptions
			? undefined
			: previewUpperBounds(previewedOptions);

	return (
		<div className={styles.bucketOptions} data-testid="bucket-options">
			<div className={styles.controls}>
				<div className={styles.field}>
					<span className={styles.label}>Bucket by</span>
					<ToggleGroupSimple
						type="single"
						value={kind}
						items={kindItems}
						onChange={handleKindChange}
						testId="bucket-options-kind"
					/>
				</div>

				{kind === 'log' && (
					<div className={styles.field}>
						<span className={styles.label}>Bands per doubling</span>
						<ToggleGroupSimple
							type="single"
							value={String(bandsPerDoublingFromScale(logScale))}
							items={bandItems}
							onChange={handleBandsChange}
							testId="bucket-options-bands"
						/>
					</div>
				)}

				{kind === 'linear' && (
					<>
						<div className={styles.field}>
							<span className={styles.label}>Max value</span>
							<InputNumber
								className={styles.numberInput}
								min={0}
								value={maxValue}
								onChange={handleMaxValueChange}
								placeholder="Required"
								status={maxValue !== null && maxValue <= 0 ? 'error' : undefined}
								data-testid="bucket-options-max-value"
							/>
						</div>
						<div className={styles.field}>
							<span className={styles.label}>Buckets</span>
							<InputNumber
								className={styles.numberInput}
								min={1}
								max={MAX_NUM_BUCKETS}
								precision={0}
								value={numBuckets}
								onChange={handleNumBucketsChange}
								placeholder={String(DEFAULT_NUM_BUCKETS)}
								data-testid="bucket-options-num-buckets"
							/>
						</div>
					</>
				)}

				{onClose && (
					<Button
						className={cx('periscope-btn', 'ghost', styles.closeBtn)}
						icon={<ChevronUp size={16} />}
						onClick={onClose}
						data-testid="bucket-options-close"
					/>
				)}
			</div>

			<div className={styles.bounds} data-testid="bucket-options-bounds">
				<span className={styles.label}>Bounds</span>
				{bounds ? (
					<>
						{bounds.map((bound) => (
							<span className={styles.bound} key={bound}>
								{formatUpperBound(bound, unit)}
							</span>
						))}
						{hasBoundsBeyondPreview(previewedOptions) && (
							<span className={styles.muted}>…</span>
						)}
						<span className={cx(styles.bound, styles.overflowBound)}>+Inf</span>
					</>
				) : (
					<span className={styles.muted}>Set a max value to see the bounds</span>
				)}
			</div>

			<p className={styles.hint}>{BUCKET_KIND_HINTS[kind]}</p>
		</div>
	);
}

BucketOptions.defaultProps = {
	bucketOptions: undefined,
	unit: undefined,
	onClose: undefined,
};

export default BucketOptions;
