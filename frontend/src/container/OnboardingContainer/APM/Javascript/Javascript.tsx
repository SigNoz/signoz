import './Javascript.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Form, Input, Select } from 'antd';
import { useState } from 'react';

import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import AngularDocs from './md-docs/angular.md';
import ExpressDocs from './md-docs/express.md';
import JavascriptDocs from './md-docs/javascript.md';
import NestJsDocs from './md-docs/nestjs.md';

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
					<div className="header">
						<img
							className="supported-language-img"
							src="/Logos/javascript.png"
							alt=""
						/>
						<div className="title">
							<h1>Javascript OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/javascript/"
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
								defaultValue="express"
								style={{ minWidth: 120 }}
								placeholder="Select Framework"
								onChange={(value): void => setSelectedFrameWork(value)}
								options={[
									{
										value: 'express',
										label: 'Express',
									},
									{
										value: 'nestjs',
										label: 'Nestjs',
									},
									{
										value: 'angular',
										label: 'Angular',
									},
									{
										value: 'other',
										label: 'Other',
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
				<ConnectionStatus language="javascript" activeStep={activeStep} />
			)}
		</>
	);
}
