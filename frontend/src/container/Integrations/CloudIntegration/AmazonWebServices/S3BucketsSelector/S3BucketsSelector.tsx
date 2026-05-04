import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select, Skeleton } from 'antd';
import { useListAccounts } from 'api/generated/services/cloudintegration';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import useUrlQuery from 'hooks/useUrlQuery';

import { mapAccountDtoToAwsCloudAccount } from '../../mapCloudAccountFromDto';
import { CloudAccount } from '../types';

import './S3BucketsSelector.styles.scss';

interface S3BucketsSelectorProps {
	onChange?: (bucketsByRegion: Record<string, string[]>) => void;
	initialBucketsByRegion?: Record<string, string[]>;
	disabled?: boolean;
}

/**
 * Component for selecting S3 buckets by AWS region
 * Displays a multi-select input for each region in the active AWS account
 */
function S3BucketsSelector({
	onChange,
	initialBucketsByRegion = {},
	disabled: isSelectorDisabled = false,
}: S3BucketsSelectorProps): JSX.Element {
	const cloudAccountId = useUrlQuery().get('cloudAccountId');
	const { data: listAccountsResponse, isLoading } = useListAccounts({
		cloudProvider: INTEGRATION_TYPES.AWS,
	});
	const accounts = useMemo((): CloudAccount[] | undefined => {
		const raw = listAccountsResponse?.data?.accounts;
		if (!raw) {
			return undefined;
		}
		return raw
			.map(mapAccountDtoToAwsCloudAccount)
			.filter((account): account is CloudAccount => account !== null);
	}, [listAccountsResponse]);
	const [bucketsByRegion, setBucketsByRegion] = useState<
		Record<string, string[]>
	>(initialBucketsByRegion);

	useEffect(() => {
		setBucketsByRegion(initialBucketsByRegion);
	}, [initialBucketsByRegion]);

	// Find the active AWS account based on the URL query parameter
	const activeAccount = useMemo(
		() =>
			accounts?.find((account) => account.cloud_account_id === cloudAccountId),
		[accounts, cloudAccountId],
	);

	// Get all regions to display (union of account regions and initialBucketsByRegion regions)
	const allRegions = useMemo(() => {
		if (!activeAccount) {
			return [];
		}

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
			<div className="s3-buckets-selector-title">Select S3 Buckets by Region</div>
			<div className="s3-buckets-selector-content">
				{allRegions.map((region) => {
					const isRegionUnavailable = isRegionDisabled(region);

					return (
						<div key={region} className="s3-buckets-selector-region">
							<div className="s3-buckets-selector-region-header">
								<div className="s3-buckets-selector-region-label">{region}</div>
								{isRegionUnavailable && (
									<div className="s3-buckets-selector-region-help">
										Region disabled in account settings; S3 buckets here will not be
										synced.
									</div>
								)}
							</div>
							<div className="s3-buckets-selector-region-select">
								<Select
									mode="tags"
									placeholder={`Enter S3 bucket names for ${region}`}
									value={bucketsByRegion[region] || []}
									onChange={(value): void => handleRegionBucketsChange(region, value)}
									tokenSeparators={[',']}
									allowClear
									disabled={isSelectorDisabled || isRegionUnavailable}
									suffixIcon={null}
									notFoundContent={null}
									filterOption={false}
									showSearch
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

S3BucketsSelector.defaultProps = {
	onChange: undefined,
	initialBucketsByRegion: undefined,
};

export default S3BucketsSelector;
