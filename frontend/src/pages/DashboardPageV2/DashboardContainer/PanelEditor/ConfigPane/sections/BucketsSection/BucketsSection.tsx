import type { ChangeEvent } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardtypesHistogramBucketsDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';

import styles from './BucketsSection.module.scss';

// The two numeric bounds of the histogram-buckets spec (derived from the BE DTO).
type NumericBound = keyof Pick<
	DashboardtypesHistogramBucketsDTO,
	'bucketCount' | 'bucketWidth'
>;

/**
 * Edits the `histogramBuckets` slice of a Histogram panel spec: bucket count / width
 * and whether to merge all active queries into one set of buckets. Each control is gated
 * by its `controls` flag.
 */
function BucketsSection({
	value,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Buckets>): JSX.Element {
	// Empty clears the bound to null (chart auto-sizes); otherwise parse to a number,
	// ignoring transient non-numeric input by leaving it unset.
	const handleNumber =
		(bound: NumericBound) =>
		(e: ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			const next = raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw);
			onChange({ ...value, [bound]: next });
		};

	return (
		<>
			{controls.count && (
				<div className={styles.field}>
					<Typography.Text>Bucket count</Typography.Text>
					<Input
						data-testid="panel-editor-v2-bucket-count"
						type="number"
						placeholder="Auto"
						value={value?.bucketCount ?? ''}
						onChange={handleNumber('bucketCount')}
					/>
				</div>
			)}

			{controls.width && (
				<div className={styles.field}>
					<Typography.Text>Bucket width</Typography.Text>
					<Input
						data-testid="panel-editor-v2-bucket-width"
						type="number"
						placeholder="Auto"
						value={value?.bucketWidth ?? ''}
						onChange={handleNumber('bucketWidth')}
					/>
				</div>
			)}

			{controls.mergeQueries && (
				<ConfigSwitch
					testId="panel-editor-v2-merge-queries"
					title="Merge active queries"
					description="Bucket all active queries together into one distribution"
					value={value?.mergeAllActiveQueries ?? false}
					onChange={(checked): void =>
						onChange({ ...value, mergeAllActiveQueries: checked })
					}
				/>
			)}
		</>
	);
}

export default BucketsSection;
