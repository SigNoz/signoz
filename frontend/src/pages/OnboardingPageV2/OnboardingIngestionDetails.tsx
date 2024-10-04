import { Typography } from 'antd';
import getIngestionData from 'api/settings/getIngestionData';
import { CircleArrowDown, Clipboard, Copy, Key } from 'lucide-react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

export default function OnboardingIngestionDetails(): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const { data: ingestionData, isFetching } = useQuery({
		queryFn: getIngestionData,
		queryKey: ['getIngestionData', user?.userId],
	});

	const injectionDataPayload =
		ingestionData &&
		ingestionData.payload &&
		Array.isArray(ingestionData.payload) &&
		ingestionData?.payload[0];

	console.log('injectionDataPayload', injectionDataPayload);

	return (
		<div className="configure-product-ingestion-section-content">
			<div className="ingestion-endpoint-section">
				<div className="ingestion-endpoint-section-header">
					<div className="ingestion-endpoint-section-title">
						<Typography.Text>Endpoints</Typography.Text>
					</div>

					<div className="ingestion-endpoint-copy-download-section">
						<Typography.Text>
							<CircleArrowDown size={14} />
							<Clipboard size={14} />
						</Typography.Text>
					</div>
				</div>

				<div className="ingestion-endpoint-info-section">
					<Typography.Text className="ingestion-endpoint-section-text">
						Copy endpoint variables to your app
					</Typography.Text>
					<div className="ingestion-endpoint-details-section">
						<Typography.Text className="ingestion-endpoint-section-endpoint-info">
							OTEL_EXPORTER_OTLP_ENDPOINT={injectionDataPayload?.ingestionURL} <br />
							OTEL_EXPORTER_OTLP_HEADERS=
							{`signoz-access-token=${injectionDataPayload?.ingestionKey}`}
						</Typography.Text>
					</div>
				</div>
			</div>

			<div className="ingestion-key-details-section">
				<Typography.Text className="ingestion-key-details-section-text">
					You can use this key to send your telemetry data to SigNoz.
				</Typography.Text>

				<div className="ingestion-key-details-section-key">
					<Typography.Text className="ingestion-key-label">
						<Key size={14} /> Ingestion Key
					</Typography.Text>

					<Typography.Text className="ingestion-key-value-copy">
						{injectionDataPayload?.ingestionKey}
						<Copy size={14} className="copy-btn" />
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}
