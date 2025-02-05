import { Skeleton, Typography } from 'antd';
import getIngestionData from 'api/settings/getIngestionData';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
import {
	ArrowUpRight,
	CircleArrowDown,
	Clipboard,
	Copy,
	Info,
	Key,
	TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { IngestionInfo } from 'types/api/settings/ingestion';
import { downloadFile } from 'utils/downloadFile';

function maskKey(key: string, visibleStart = 4, visibleEnd = 4): string {
	if (!key) {
		return '';
	}

	// Ensure the key length is sufficient to be masked
	if (key.length <= visibleStart + visibleEnd) {
		return key; // Return the key as-is if it's too short to mask
	}

	// Calculate the number of characters to mask
	const maskLength = key.length - visibleStart - visibleEnd;
	const maskedSection = '*'.repeat(maskLength);

	// Construct and return the masked key
	return key.slice(0, visibleStart) + maskedSection + key.slice(-visibleEnd);
}

export default function OnboardingIngestionDetails(): JSX.Element {
	const { notifications } = useNotifications();
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const [firstIngestionKey, setFirstIngestionKey] = useState<IngestionInfo>(
		{} as IngestionInfo,
	);

	const {
		status,
		data: ingestionData,
		isLoading: isIngestionKeysLoading,
		error,
		isError,
	} = useQuery({
		queryFn: () => getIngestionData(),
	});

	useEffect(() => {
		console.log('status', status);
		console.log('ingestionData', ingestionData);
	}, [status, ingestionData]);

	const handleCopyKey = (text: string): void => {
		handleCopyToClipboard(text);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	const handleDownloadFile = (text: string): void => {
		downloadFile(text, 'endpoint-details.env')
			.then(() => {
				setTimeout(() => {
					notifications.success({
						message: 'Download successful',
					});
				}, 300);
			})
			.catch(() => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			});
	};

	useEffect(() => {
		if (
			status === 'success' &&
			ingestionData &&
			ingestionData &&
			Array.isArray(ingestionData.payload)
		) {
			const payload = ingestionData.payload[0] || {
				ingestionKey: '',
				ingestionURL: '',
				dataRegion: '',
			};

			setFirstIngestionKey(payload);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, ingestionData?.payload]);

	const ingestionURL = firstIngestionKey?.ingestionURL;
	const ingestionKey = firstIngestionKey?.ingestionKey;

	const endpointDetails = `OTEL_EXPORTER_OTLP_ENDPOINT=${ingestionURL} \nOTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=${ingestionKey}`;

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
					<div className="ingestion-endpoint-section">
						<div className="ingestion-endpoint-section-header">
							<div className="ingestion-endpoint-section-title">
								<Typography.Text>Endpoints</Typography.Text>
							</div>

							{!isIngestionKeysLoading && (
								<div className="ingestion-endpoint-copy-download-section">
									<Typography.Text>
										<CircleArrowDown
											size={14}
											className="download-btn"
											onClick={(): void => handleDownloadFile(endpointDetails)}
										/>

										<Clipboard
											size={14}
											className="copy-btn"
											onClick={(): void => handleCopyKey(endpointDetails)}
										/>
									</Typography.Text>
								</div>
							)}
						</div>

						<div className="ingestion-endpoint-info-section">
							<Typography.Text className="ingestion-endpoint-section-text">
								Copy endpoint variables to your app
							</Typography.Text>
							<div className="ingestion-endpoint-details-section">
								{isIngestionKeysLoading ? (
									<div className="skeleton-container">
										<Skeleton.Input active className="skeleton-input" /> <br />
										<Skeleton.Input active className="skeleton-input" />
									</div>
								) : (
									<Typography.Text className="ingestion-endpoint-section-endpoint-info">
										{endpointDetails}
									</Typography.Text>
								)}
							</div>
						</div>
					</div>

					<div className="ingestion-key-details-section">
						<Typography.Text className="ingestion-key-details-section-text">
							You can use this key to send your telemetry data to SigNoz.
						</Typography.Text>

						<div className="ingestion-key-details-section-key">
							{isIngestionKeysLoading ? (
								<div className="skeleton-container">
									<Skeleton.Input active className="skeleton-input" />
								</div>
							) : (
								<>
									<Typography.Text className="ingestion-key-label">
										<Key size={14} /> Ingestion Key
									</Typography.Text>

									<Typography.Text className="ingestion-key-value-copy">
										{maskKey(firstIngestionKey?.ingestionKey)}

										<Copy
											size={14}
											className="copy-btn"
											onClick={(): void => handleCopyKey(firstIngestionKey?.ingestionKey)}
										/>
									</Typography.Text>
								</>
							)}
						</div>
					</div>

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
				</>
			)}
		</div>
	);
}
