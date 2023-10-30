import './Python.styles.scss';

import { Form, Input, Select } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useEffect, useState } from 'react';
import { trackEvent } from 'utils/segmentAnalytics';
import { popupContainer } from 'utils/selectPopupContainer';

import { LangProps } from '../APM';
import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import DjangoDocs from './md-docs/django.md';
import FalconDocs from './md-docs/falcon.md';
import FastAPIDocs from './md-docs/fastAPI.md';
import FlaskDocs from './md-docs/flask.md';
import PythonDocs from './md-docs/python.md';

const frameworksMap = {
	django: 'Django',
	fastAPI: 'Fast API',
	flask: 'Flask',
	falcon: 'Falcon',
	other: 'Others',
};

export default function Python({
	ingestionInfo,
	activeStep,
}: LangProps): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('django');
	const [selectedFrameWorkDocs, setSelectedFrameWorkDocs] = useState(DjangoDocs);
	const [form] = Form.useForm();
	const serviceName = Form.useWatch('Service Name', form);

	const variables = {
		MYAPP: serviceName || '<service-name>',
		SIGNOZ_INGESTION_KEY:
			ingestionInfo.SIGNOZ_INGESTION_KEY || '<SIGNOZ_INGESTION_KEY>',
		REGION: ingestionInfo.REGION || 'region',
	};

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: APM : Python', {
			selectedFrameWork,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFrameWork]);

	const handleFrameworkChange = (selectedFrameWork: string): void => {
		setSelectedFrameWork(selectedFrameWork);

		switch (selectedFrameWork) {
			case 'django':
				setSelectedFrameWorkDocs(DjangoDocs);
				break;
			case 'fastAPI':
				setSelectedFrameWorkDocs(FastAPIDocs);
				break;
			case 'flask':
				setSelectedFrameWorkDocs(FlaskDocs);
				break;
			case 'falcon':
				setSelectedFrameWorkDocs(FalconDocs);
				break;
			default:
				setSelectedFrameWorkDocs(PythonDocs);
				break;
		}
	};

	return (
		<>
			{activeStep === 2 && (
				<div className="python-setup-instructions-container">
					<Header
						entity="python"
						heading="Python OpenTelemetry Instrumentation"
						imgURL="/Logos/python.png"
						docsURL="https://signoz.io/docs/instrumentation/python/"
						imgClassName="supported-language-img"
					/>

					<div className="form-container">
						<div className="framework-selector">
							<div className="label"> Select Framework </div>

							<Select
								getPopupContainer={popupContainer}
								defaultValue="Django"
								style={{ minWidth: 120 }}
								placeholder="Select Framework"
								onChange={(value): void => handleFrameworkChange(value)}
								options={[
									{
										value: 'django',
										label: frameworksMap.django,
									},
									{
										value: 'fastAPI',
										label: frameworksMap.fastAPI,
									},
									{
										value: 'flask',
										label: frameworksMap.flask,
									},
									{
										value: 'falcon',
										label: frameworksMap.falcon,
									},
									{
										value: 'other',
										label: frameworksMap.other,
									},
								]}
							/>
						</div>

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
						<MarkdownRenderer
							markdownContent={selectedFrameWorkDocs}
							variables={variables}
						/>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<ConnectionStatus
					serviceName={form.getFieldValue('Service Name')}
					language="python"
					framework={selectedFrameWork}
				/>
			)}
		</>
	);
}
