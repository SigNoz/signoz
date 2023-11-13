import './Java.styles.scss';

import { Form, Input, Select } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useEffect, useState } from 'react';
import { trackEvent } from 'utils/segmentAnalytics';
import { popupContainer } from 'utils/selectPopupContainer';

import ConnectionStatus from '../../../common/ConnectionStatus/ConnectionStatus';
import { LangProps } from '../APM';
import JavaDocs from './md-docs/java.md';
import JbossDocs from './md-docs/jboss.md';
import SprintBootDocs from './md-docs/spring_boot.md';
import TomcatDocs from './md-docs/tomcat.md';

enum FrameworksMap {
	tomcat = 'Tomcat',
	spring_boot = 'Spring Boot',
	jboss = 'JBoss',
	other = 'Others',
}

export default function Java({
	ingestionInfo,
	activeStep,
}: LangProps): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('spring_boot');
	const [selectedFrameWorkDocs, setSelectedFrameWorkDocs] = useState(
		SprintBootDocs,
	);

	const [form] = Form.useForm();
	const serviceName = Form.useWatch('Service Name', form);

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: APM : Java', {
			selectedFrameWork,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFrameWork]);

	const handleFrameworkChange = (selectedFrameWork: string): void => {
		setSelectedFrameWork(selectedFrameWork);

		switch (selectedFrameWork) {
			case 'tomcat':
				setSelectedFrameWorkDocs(TomcatDocs);
				break;
			case 'spring_boot':
				setSelectedFrameWorkDocs(SprintBootDocs);
				break;
			case 'jboss':
				setSelectedFrameWorkDocs(JbossDocs);
				break;
			default:
				setSelectedFrameWorkDocs(JavaDocs);
				break;
		}
	};

	const variables = {
		MYAPP: serviceName || '<service-name>',
		SIGNOZ_INGESTION_KEY:
			ingestionInfo.SIGNOZ_INGESTION_KEY || '<SIGNOZ_INGESTION_KEY>',
		REGION: ingestionInfo.REGION || 'region',
	};

	return (
		<>
			{activeStep === 2 && (
				<div className="java-setup-instructions-container">
					<Header
						entity="java"
						heading="Java OpenTelemetry Instrumentation"
						imgURL="/Logos/java.png"
						docsURL="https://signoz.io/docs/instrumentation/java/"
						imgClassName="supported-language-img"
					/>

					<div className="form-container">
						<div className="framework-selector">
							<div className="label"> Select Framework </div>

							<Select
								getPopupContainer={popupContainer}
								defaultValue="spring_boot"
								style={{ minWidth: 120 }}
								placeholder="Select Framework"
								onChange={(value): void => handleFrameworkChange(value)}
								options={[
									{
										value: 'spring_boot',
										label: FrameworksMap.spring_boot,
									},
									{
										value: 'tomcat',
										label: FrameworksMap.tomcat,
									},
									{
										value: 'jboss',
										label: FrameworksMap.jboss,
									},
									{
										value: 'other',
										label: FrameworksMap.other,
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
					language="java"
					framework={(FrameworksMap as any)[selectedFrameWork]}
				/>
			)}
		</>
	);
}
