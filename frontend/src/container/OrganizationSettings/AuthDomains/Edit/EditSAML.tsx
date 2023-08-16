import { InfoCircleFilled } from '@ant-design/icons';
import { Card, Form, Input, Space, Typography } from 'antd';

function EditSAML(): JSX.Element {
	return (
		<>
			<Form.Item
				label="SAML ACS URL"
				name={['samlConfig', 'samlIdp']}
				rules={[{ required: true, message: 'Please input your ACS URL!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="SAML Entity ID"
				name={['samlConfig', 'samlEntity']}
				rules={[{ required: true, message: 'Please input your Entity Id!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				rules={[{ required: true, message: 'Please input your Certificate!' }]}
				label="SAML X.509 Certificate"
				name={['samlConfig', 'samlCert']}
			>
				<Input.TextArea rows={4} />
			</Form.Item>

			<Card style={{ marginBottom: '1rem' }}>
				<Space>
					<InfoCircleFilled />
					<Typography>
						SAML won’t be enabled unless you enter all the attributes above
					</Typography>
				</Space>
			</Card>
		</>
	);
}

export default EditSAML;
