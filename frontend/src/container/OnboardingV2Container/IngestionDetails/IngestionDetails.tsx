import { Skeleton, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { AxiosError } from 'axios';
import { useGetDeploymentsData } from 'hooks/CustomDomain/useGetDeploymentsData';
import { useGetAllIngestionsKeys } from 'hooks/IngestionKeys/useGetAllIngestionKeys';
import { useNotifications } from 'hooks/useNotifications';
import {
	ArrowUpRight,
	Copy,
	Info,
	Key,
	MapPin,
	TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { IngestionKeyProps } from 'types/api/ingestionKeys/types';

function maskKey(key: string, visibleStart = 4, visibleEnd = 4): string {
	if (!key) {
		return '';
	}

	// Ensure the key length is sufficient to be masked
	if (key.length <= visibleStart + visibleEnd) {
		return key; // Return the key as-is if it's too short to mask
	}

	const maskedSection = '*'.repeat(5);

	// Construct and return the masked key
	return key.slice(0, visibleStart) + maskedSection + key.slice(-visibleEnd);
}

const ONBOARDING_V3_ANALYTICS_EVENTS_MAP = {
	BASE: 'Onboarding V3',
	INGESTION_KEY_COPIED: 'Ingestion key copied',
	INGESTION_URL_COPIED: 'Ingestion URL copied',
	REGION_COPIED: 'Region copied',
};

export default function OnboardingIngestionDetails(): JSX.Element {
	const { notifications } = useNotifications();
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const [firstIngestionKey, setFirstIngestionKey] = useState<IngestionKeyProps>(
		{} as IngestionKeyProps,
	);

	const {
		data: ingestionKeys,
		isLoading: isIngestionKeysLoading,
		error,
		isError,
	} = useGetAllIngestionsKeys({
		search: '',
		page: 1,
		per_page: 10,
	});

	const {
		data: deploymentsData,
		isLoading: isLoadingDeploymentsData,
		isFetching: isFetchingDeploymentsData,
		isError: isDeploymentsDataError,
	} = useGetDeploymentsData(true);

	const handleCopyKey = (text: string): void => {
		handleCopyToClipboard(text);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	useEffect(() => {
		if (ingestionKeys?.data.data && ingestionKeys?.data.data.length > 0) {
			setFirstIngestionKey(ingestionKeys?.data.data[0]);
		}
	}, [ingestionKeys]);

	return (
		<div className="configure-product-ingestion-section-content">
			{isError && (
				<div className="ingestion-endpoint-section-error-container">
					<Typography.Text className="ingestion-endpoint-section-error-text error">
						<TriangleAlert size={14} />{' '}
						{(error as AxiosError)?.message || 'Something went wrong'}
					</Typography.Text>

					<div className="ingestion-setup-details-links">
						<Info size={14} />

						<span>
							Find your ingestion URL and learn more about sending data to SigNoz{' '}
							<a
								href="https://signoz.io/docs/ingestion/signoz-cloud/overview/"
								target="_blank"
								className="learn-more"
								rel="noreferrer"
							>
								here <ArrowUpRight size={14} />
							</a>
						</span>
					</div>
				</div>
			)}

			{(isIngestionKeysLoading || !isError) && (
				<>
					<div className="ingestion-key-details-section">
						<Typography.Text className="ingestion-key-details-section-text">
							You can use this key to send your telemetry data to SigNoz.
						</Typography.Text>

						<div className="ingestion-key-details-section-key">
							{isIngestionKeysLoading ||
							isLoadingDeploymentsData ||
							isFetchingDeploymentsData ? (
								<div className="skeleton-container">
									<Skeleton.Input active className="skeleton-input" />
									<Skeleton.Input active className="skeleton-input" />
									<Skeleton.Input active className="skeleton-input" />
									<Skeleton.Input active className="skeleton-input" />
								</div>
							) : (
								<div className="ingestion-key-region-details-section">
									{!isDeploymentsDataError &&
										!isLoadingDeploymentsData &&
										!isFetchingDeploymentsData && (
											<div className="ingestion-region-container">
												<Typography.Text className="ingestion-region-label">
													<MapPin size={14} /> Region
												</Typography.Text>

												<Typography.Text className="ingestion-region-value-copy">
													{deploymentsData?.data?.data?.cluster.region.name}

													<Copy
														size={14}
														className="copy-btn"
														onClick={(): void => {
															logEvent(
																`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.REGION_COPIED}`,
																{},
															);

															handleCopyKey(
																deploymentsData?.data?.data?.cluster.region.name || '',
															);
														}}
													/>
												</Typography.Text>
											</div>
										)}
									<div className="ingestion-key-container">
										<Typography.Text className="ingestion-key-label">
											<Key size={14} /> Ingestion Key
										</Typography.Text>

										<Typography.Text className="ingestion-key-value-copy">
											{maskKey(firstIngestionKey?.value)}

											<Copy
												size={14}
												className="copy-btn"
												onClick={(): void => {
													logEvent(
														`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.INGESTION_KEY_COPIED}`,
														{},
													);
													handleCopyKey(firstIngestionKey?.value);
												}}
											/>
										</Typography.Text>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="ingestion-setup-details-links">
						<Info size={14} />

						<span>
							We support{' '}
							<a
								href="https://signoz.io/docs/ingestion/signoz-cloud/keys/"
								target="_blank"
								className="learn-more"
								rel="noreferrer"
							>
								multiple ingestions keys
							</a>
							. To create a new one,{' '}
							<a
								href="/settings/ingestion-settings"
								target="_blank"
								className="learn-more"
								rel="noreferrer"
							>
								click here <ArrowUpRight size={14} />
							</a>
						</span>
					</div>
				</>
			)}
		</div>
	);
}
