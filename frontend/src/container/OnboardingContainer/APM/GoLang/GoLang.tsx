import './GoLang.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Form, Input } from 'antd';
import Header from 'container/OnboardingContainer/common/Header/Header';

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
					<Header
						entity="go"
						heading="Go OpenTelemetry Instrumentation"
						imgURL="/Logos/go.png"
						docsURL="https://signoz.io/docs/instrumentation/golang/"
						imgClassName="supported-language-img"
					/>

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
				<ConnectionStatus
					serviceName={form.getFieldValue('Service Name')}
					framework="go"
					language="go"
				/>
			)}
		</>
	);
}
