import { Input } from '@signozhq/ui/input';
import { Form } from 'antd';
import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';

function RenderConnectionFields({
	isConnectionParamsLoading,
	connectionParams,
}: {
	isConnectionParamsLoading?: boolean;
	connectionParams?: CloudintegrationtypesCredentialsDTO | null;
}): JSX.Element | null {
	if (
		isConnectionParamsLoading ||
		(!!connectionParams?.ingestionUrl &&
			!!connectionParams?.ingestionKey &&
			!!connectionParams?.sigNozApiUrl &&
			!!connectionParams?.sigNozApiKey)
	) {
		return null;
	}

	return (
		<Form.Item name="connectionParams">
			{!connectionParams?.ingestionUrl && (
				<Form.Item
					name="ingestionUrl"
					label="Ingestion URL"
					rules={[{ required: true, message: 'Please enter ingestion URL' }]}
				>
					<Input placeholder="Enter ingestion URL" />
				</Form.Item>
			)}
			{!connectionParams?.ingestionKey && (
				<Form.Item
					name="ingestionKey"
					label="Ingestion Key"
					rules={[{ required: true, message: 'Please enter ingestion key' }]}
				>
					<Input placeholder="Enter ingestion key" />
				</Form.Item>
			)}
			{!connectionParams?.sigNozApiUrl && (
				<Form.Item
					name="sigNozApiUrl"
					label="SigNoz API URL"
					rules={[{ required: true, message: 'Please enter SigNoz API URL' }]}
				>
					<Input placeholder="Enter SigNoz API URL" />
				</Form.Item>
			)}
			{!connectionParams?.sigNozApiKey && (
				<Form.Item
					name="sigNozApiKey"
					label="SigNoz API KEY"
					rules={[{ required: true, message: 'Please enter SigNoz API Key' }]}
				>
					<Input placeholder="Enter SigNoz API Key" />
				</Form.Item>
			)}
		</Form.Item>
	);
}

RenderConnectionFields.defaultProps = {
	connectionParams: null,
	isConnectionParamsLoading: false,
};

export default RenderConnectionFields;
