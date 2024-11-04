import { Skeleton, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useGetAllIngestionsKeys } from 'hooks/IngestionKeys/useGetAllIngestionKeys';
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
import { useCopyToClipboard } from 'react-use';
import { IngestionKeyProps } from 'types/api/ingestionKeys/types';
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
	const {
		data: ingestionKeys,
		isLoading: isIngestionKeysLoading,
		error,
		isError,
	} = useGetAllIngestionsKeys({
		search: '',
		page: 1,
		per_page: 1,
	});

	const { notifications } = useNotifications();
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const [firstIngestionKey, setFirstIngestionKey] = useState<IngestionKeyProps>(
		{} as IngestionKeyProps,
	);

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
		const firstKey =
			ingestionKeys?.data.data &&
			Array.isArray(ingestionKeys.data.data) &&
			ingestionKeys?.data.data[0];

		setFirstIngestionKey(firstKey || ({} as IngestionKeyProps));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ingestionKeys?.data?.data]);

	const ingestionURL = '';
	const ingestionKey = firstIngestionKey?.value;

	const endpointDetails = `OTEL_EXPORTER_OTLP_ENDPOINT=${ingestionURL} \nOTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=${ingestionKey}`;

	return (
		<div className="configure-product-ingestion-section-content">
			{isError && (
				<div className="ingestion-endpoint-section-error-container">
					<Typography.Text className="ingestion-endpoint-section-error-text error">
						<TriangleAlert size={14} /> {error?.message}
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
										{maskKey(firstIngestionKey?.value)}
										<Copy
											size={14}
											className="copy-btn"
											onClick={(): void => handleCopyKey(firstIngestionKey?.value)}
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
