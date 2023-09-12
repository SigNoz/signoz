import './Javascript.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Form, Input, Select } from 'antd';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useState } from 'react';

import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import AngularDocs from './md-docs/angular.md';
import ExpressDocs from './md-docs/express.md';
import JavascriptDocs from './md-docs/javascript.md';
import NestJsDocs from './md-docs/nestjs.md';

const frameworksMap = {
	express: 'Express',
	nestjs: 'Nest JS',
	angular: 'Angular',
	other: 'Others',
};

export default function Javascript({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('express');

	const [form] = Form.useForm();

	const renderDocs = (): JSX.Element => {
		switch (selectedFrameWork) {
			case 'express':
				return <ExpressDocs />;
			case 'nestjs':
				return <NestJsDocs />;
			case 'angular':
				return <AngularDocs />;
			default:
				return <JavascriptDocs />;
		}
	};

	return (
		<>
			{activeStep === 2 && (
				<div className="javascript-setup-instructions-container">
					<Header
						entity="javascript"
						heading="Javascript OpenTelemetry Instrumentation"
						imgURL="/Logos/javascript.png"
						docsURL="https://signoz.io/docs/instrumentation/javascript/"
						imgClassName="supported-language-img"
					/>

					<div className="form-container">
						<div className="framework-selector">
							<div className="label"> Select Framework </div>

							<Select
								defaultValue="express"
								style={{ minWidth: 120 }}
								placeholder="Select Framework"
								onChange={(value): void => setSelectedFrameWork(value)}
								options={[
									{
										value: 'express',
										label: frameworksMap.express,
									},
									{
										value: 'nestjs',
										label: frameworksMap.nestjs,
									},
									{
										value: 'angular',
										label: frameworksMap.angular,
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

							<Form
								form={form}
								name="service-name"
								style={{ minWidth: '300px' }}
								scrollToFirstError
							>
								<Form.Item
									hasFeedback
									name="Service Name"
									rules={[{ required: true }]}
									validateTrigger="onBlur"
									requiredMark
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
					language="javascript"
					framework={selectedFrameWork}
				/>
			)}
		</>
	);
}
