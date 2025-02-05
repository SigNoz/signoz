import { Form, Input } from 'antd';
import { ConnectionParams } from 'types/api/integrations/aws';

function RenderConnectionFields({
	isConnectionParamsLoading,
	connectionParams,
	isFormDisabled,
}: {
	isConnectionParamsLoading: boolean;
	connectionParams?: ConnectionParams | null;
	isFormDisabled?: boolean;
}): JSX.Element | null {
	if (
		isConnectionParamsLoading ||
		!connectionParams ||
		(!!connectionParams?.ingestion_url &&
			!!connectionParams?.ingestion_key &&
			!!connectionParams?.signoz_api_url)
	) {
		return null;
	}

	return (
		<Form.Item name="connection_params">
			{!connectionParams?.ingestion_url && (
				<Form.Item
					name="ingestion_url"
					label="Ingestion URL"
					rules={[{ required: true, message: 'Please enter ingestion URL' }]}
				>
					<Input placeholder="Enter ingestion URL" disabled={isFormDisabled} />
				</Form.Item>
			)}
			{!connectionParams?.ingestion_key && (
				<Form.Item
					name="ingestion_key"
					label="Ingestion Key"
					rules={[{ required: true, message: 'Please enter ingestion key' }]}
				>
					<Input placeholder="Enter ingestion key" disabled={isFormDisabled} />
				</Form.Item>
			)}
			{!connectionParams?.signoz_api_url && (
				<Form.Item
					name="signoz_api_url"
					label="SigNoz API URL"
					rules={[{ required: true, message: 'Please enter SigNoz API URL' }]}
				>
					<Input placeholder="Enter SigNoz API URL" disabled={isFormDisabled} />
				</Form.Item>
			)}
		</Form.Item>
	);
}

RenderConnectionFields.defaultProps = {
	connectionParams: null,
	isFormDisabled: false,
};

export default RenderConnectionFields;
