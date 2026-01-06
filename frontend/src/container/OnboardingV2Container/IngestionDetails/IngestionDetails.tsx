import './IngestionDetails.styles.scss';

import { Button, Skeleton, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { AxiosError } from 'axios';
import { DOCS_BASE_URL } from 'constants/app';
import { useGetGlobalConfig } from 'hooks/globalConfig/useGetGlobalConfig';
import { useGetAllIngestionsKeys } from 'hooks/IngestionKeys/useGetAllIngestionKeys';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowUpRight, Copy, Info, Key, TriangleAlert } from 'lucide-react';
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
		data: globalConfig,
		isLoading: isLoadingGlobalConfig,
		isError: isErrorGlobalConfig,
		error: globalConfigError,
	} = useGetGlobalConfig();

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
								href={`${DOCS_BASE_URL}/docs/ingestion/signoz-cloud/overview/`}
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
							{isIngestionKeysLoading || isLoadingGlobalConfig ? (
								<div className="skeleton-container">
									<Skeleton.Input active className="skeleton-input" />
									<Skeleton.Input active className="skeleton-input" />
									<Skeleton.Input active className="skeleton-input" />
									<Skeleton.Input active className="skeleton-input" />
								</div>
							) : (
								<div className="ingestion-key-region-details-section">
									{!isLoadingGlobalConfig && (
										<div className="ingestion-region-container">
											<Typography.Text className="ingestion-region-label">
												Ingestion URL
											</Typography.Text>

											{!isErrorGlobalConfig && (
												<Typography.Text className="ingestion-region-value-copy">
													{globalConfig?.data?.ingestion_url}

													<Copy
														size={14}
														className="copy-btn"
														onClick={(): void => {
															logEvent(
																`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.INGESTION_URL_COPIED}`,
																{},
															);

															const ingestionURL = globalConfig?.data?.ingestion_url;

															if (ingestionURL) {
																handleCopyKey(ingestionURL);
															}
														}}
													/>
												</Typography.Text>
											)}

											{isErrorGlobalConfig && (
												<Tooltip
													rootClassName="ingestion-url-error-tooltip"
													arrow={false}
													title={
														<div className="ingestion-url-error-content">
															<Typography.Text className="ingestion-url-error-code">
																{globalConfigError?.getErrorCode()}
															</Typography.Text>

															<Typography.Text className="ingestion-url-error-message">
																{globalConfigError?.getErrorMessage()}
															</Typography.Text>
														</div>
													}
													placement="topLeft"
												>
													<Button type="text" icon={<TriangleAlert size={14} />} />
												</Tooltip>
											)}
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
								href={`${DOCS_BASE_URL}/docs/ingestion/signoz-cloud/keys/`}
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
