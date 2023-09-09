import './GoLang.styles.scss';

import { InfoCircleOutlined } from '@ant-design/icons';
import { MDXProvider } from '@mdx-js/react';
import { Form, Input } from 'antd';

import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import GoLangDocs from './goLang.md';

export default function GoLang({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const [form] = Form.useForm();

	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<div className="header">
						<img className="supported-language-img" src="/Logos/go.png" alt="" />
						<div className="title">
							<h1>Go OpenTelemetry Instrumentation</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/golang/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>

					<div className="form-container">
						<div className="service-name-container">
							<div className="label"> Service Name </div>

							<Form form={form} name="service-name" style={{ minWidth: '300px' }}>
								<Form.Item
									hasFeedback
									name="Service Name"
									rules={[{ required: true }]}
									validateTrigger="onBlur"
								>
									<Input autoFocus />
								</Form.Item>
							</Form>
						</div>
					</div>

					<div className="content-container">
						<MDXProvider>
							<GoLangDocs />
						</MDXProvider>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<ConnectionStatus language="go" activeStep={activeStep} />
			)}
		</>
	);
}
