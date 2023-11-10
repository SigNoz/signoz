import './ROR.styles.scss';

import { Form, Input } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';

import { LangProps } from '../APM';
import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import RORDocs from './RubyOnRails.md';

export default function RoR({
	ingestionInfo,
	activeStep,
}: LangProps): JSX.Element {
	const [form] = Form.useForm();
	const serviceName = Form.useWatch('Service Name', form);

	const variables = {
		MYAPP: serviceName || '<service-name>',
		SIGNOZ_INGESTION_KEY:
			ingestionInfo.SIGNOZ_INGESTION_KEY || '<SIGNOZ_INGESTION_KEY>',
		REGION: ingestionInfo.REGION || 'region',
	};

	return (
		<>
			{activeStep === 2 && (
				<div className="ror-setup-instructions-container">
					<Header
						entity="rails"
						heading="Ruby on Rails OpenTelemetry Instrumentation"
						imgURL="/Logos/rails.png"
						docsURL="https://signoz.io/docs/instrumentation/ruby-on-rails/"
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
						<MarkdownRenderer markdownContent={RORDocs} variables={variables} />
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<ConnectionStatus
					serviceName={form.getFieldValue('Service Name')}
					framework="rails"
					language="rails"
				/>
			)}
		</>
	);
}
