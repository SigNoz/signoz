import { Form, Select, Skeleton, Typography } from 'antd';
import { useAwsAccounts } from 'hooks/integration/aws/useAwsAccounts';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo, useState } from 'react';

const { Title } = Typography;

interface S3BucketsSelectorProps {
	onChange?: (bucketsByRegion: Record<string, string[]>) => void;
	initialBucketsByRegion?: Record<string, string[]>;
}

/**
 * Component for selecting S3 buckets by AWS region
 * Displays a multi-select input for each region in the active AWS account
 */
function S3BucketsSelector({
	onChange,
	initialBucketsByRegion = {},
}: S3BucketsSelectorProps): JSX.Element {
	const cloudAccountId = useUrlQuery().get('cloudAccountId');
	const { data: accounts, isLoading } = useAwsAccounts();
	const [bucketsByRegion, setBucketsByRegion] = useState<
		Record<string, string[]>
	>(initialBucketsByRegion);

	// Find the active AWS account based on the URL query parameter
	const activeAccount = useMemo(
		() =>
			accounts?.find((account) => account.cloud_account_id === cloudAccountId),
		[accounts, cloudAccountId],
	);

	// Get all regions to display (union of account regions and initialBucketsByRegion regions)
	const allRegions = useMemo(() => {
		if (!activeAccount) return [];

		// Get unique regions from both sources
		const initialRegions = Object.keys(initialBucketsByRegion);
		const accountRegions = activeAccount.config.regions;

		// Create a Set to get unique values
		const uniqueRegions = new Set([...accountRegions, ...initialRegions]);

		return Array.from(uniqueRegions);
	}, [activeAccount, initialBucketsByRegion]);

	// Check if a region is disabled (not in account's regions)
	const isRegionDisabled = useCallback(
		(region: string) => !activeAccount?.config.regions.includes(region),
		[activeAccount],
	);

	// Handle changes to bucket selections for a specific region
	const handleRegionBucketsChange = useCallback(
		(region: string, buckets: string[]): void => {
			setBucketsByRegion((prevBuckets) => {
				const updatedBuckets = { ...prevBuckets };

				if (buckets.length === 0) {
					// Remove empty bucket arrays
					delete updatedBuckets[region];
				} else {
					updatedBuckets[region] = buckets;
				}

				// Notify parent component of changes
				onChange?.(updatedBuckets);
				return updatedBuckets;
			});
		},
		[onChange],
	);

	// Show loading state while fetching account data
	if (isLoading || !activeAccount) {
		return <Skeleton active />;
	}

	return (
		<div className="s3-buckets-selector">
			<Title level={5}>Select S3 Buckets by Region</Title>

			{allRegions.map((region) => {
				const disabled = isRegionDisabled(region);

				return (
					<Form.Item
						key={region}
						label={region}
						// eslint-disable-next-line react/jsx-props-no-spreading
						{...(disabled && {
							help:
								'Region disabled in account settings; S3 buckets here will not be synced.',
							validateStatus: 'warning',
						})}
					>
						<Select
							mode="tags"
							placeholder={`Enter S3 bucket names for ${region}`}
							value={bucketsByRegion[region] || []}
							onChange={(value): void => handleRegionBucketsChange(region, value)}
							tokenSeparators={[',']}
							allowClear
							disabled={disabled}
							suffixIcon={null}
							notFoundContent={null}
							filterOption={false}
							showSearch
						/>
					</Form.Item>
				);
			})}
		</div>
	);
}

S3BucketsSelector.defaultProps = {
	onChange: undefined,
	initialBucketsByRegion: undefined,
};

export default S3BucketsSelector;
