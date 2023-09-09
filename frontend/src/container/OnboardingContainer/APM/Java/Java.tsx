import './Java.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Form, Input, Select } from 'antd';
import { useState } from 'react';

import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import JavaDocs from './md-docs/java.md';
import JbossDocs from './md-docs/jboss.md';
import SprintBootDocs from './md-docs/spring_boot.md';
import TomcatDocs from './md-docs/tomcat.md';

const frameworksMap = {
	tomcat: 'Tomcat',
	spring_boot: 'Spring Boot',
	jboss: 'JBoss',
	other: 'Others',
};

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
					<div className="header">
						<img className="supported-language-img" src="/Logos/java.png" alt="" />
						<div className="title">
							<h1>Java OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/java/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>

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
										label: frameworksMap.spring_boot,
									},
									{
										value: 'tomcat',
										label: frameworksMap.tomcat,
									},
									{
										value: 'jboss',
										label: frameworksMap.jboss,
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
						<MDXProvider>{renderDocs()}</MDXProvider>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<ConnectionStatus
					serviceName={form.getFieldValue('Service Name')}
					language="java"
					framework={frameworksMap[selectedFrameWork]}
					activeStep={activeStep}
				/>
			)}
		</>
	);
}
