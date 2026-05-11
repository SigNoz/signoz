import { Dispatch, SetStateAction } from 'react';
import { InputNumber, Switch } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import SettingsSection from '../../components/SettingsSection/SettingsSection';

import './HistogramBucketsSection.styles.scss';

interface HistogramBucketsSectionProps {
	bucketCount: number;
	setBucketCount: Dispatch<SetStateAction<number>>;
	bucketWidth: number;
	setBucketWidth: Dispatch<SetStateAction<number>>;
	combineHistogram: boolean;
	setCombineHistogram: Dispatch<SetStateAction<boolean>>;
}

export default function HistogramBucketsSection({
	bucketCount,
	setBucketCount,
	bucketWidth,
	setBucketWidth,
	combineHistogram,
	setCombineHistogram,
}: HistogramBucketsSectionProps): JSX.Element {
	return (
		<SettingsSection title="Histogram / Buckets">
			<section className="histogram-settings__bucket-config control-container">
				<Typography.Text className="section-heading">
					Number of buckets
				</Typography.Text>
				<InputNumber
					value={bucketCount || null}
					type="number"
					min={0}
					rootClassName="bucket-input"
					placeholder="Default: 30"
					onChange={(val): void => {
						setBucketCount(val || 0);
					}}
				/>
				<Typography.Text className="section-heading histogram-settings__bucket-size-label">
					Bucket width
				</Typography.Text>
				<InputNumber
					value={bucketWidth || null}
					type="number"
					precision={2}
					placeholder="Default: Auto"
					step={0.1}
					min={0.0}
					rootClassName="histogram-settings__bucket-input"
					onChange={(val): void => {
						setBucketWidth(val || 0);
					}}
				/>
				<section className="histogram-settings__combine-hist">
					<Typography.Text className="section-heading">
						<span className="histogram-settings__merge-label">
							Merge all series into one
						</span>
					</Typography.Text>
					<Switch
						checked={combineHistogram}
						size="small"
						onChange={(checked): void => setCombineHistogram(checked)}
					/>
				</section>
			</section>
		</SettingsSection>
	);
}
