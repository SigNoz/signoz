import './Java.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Form, Input, Select } from 'antd';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useState } from 'react';

import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
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
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('spring_boot');

	const [form] = Form.useForm();

	const renderDocs = (): JSX.Element => {
		switch (selectedFrameWork) {
			case 'tomcat':
				return <TomcatDocs />;
			case 'spring_boot':
				return <SprintBootDocs />;
			case 'jboss':
				return <JbossDocs />;
			default:
				return <JavaDocs />;
		}
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
								defaultValue="spring_boot"
								style={{ minWidth: 120 }}
								placeholder="Select Framework"
								onChange={(value): void => setSelectedFrameWork(value)}
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
						<MDXProvider>{renderDocs()}</MDXProvider>
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
