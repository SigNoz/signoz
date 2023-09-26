import './Javascript.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Form, Input, Select } from 'antd';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useEffect, useState } from 'react';
import { trackEvent } from 'utils/segmentAnalytics';
import { popupContainer } from 'utils/selectPopupContainer';

import ConnectionStatus from '../common/ConnectionStatus/ConnectionStatus';
import ExpressDocs from './md-docs/express.md';
import JavascriptDocs from './md-docs/javascript.md';
import NestJsDocs from './md-docs/nestjs.md';

const frameworksMap = {
	express: 'Express',
	nestjs: 'Nest JS',
	nodejs: 'Nodejs',
};

export default function Javascript({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('express');

	const [form] = Form.useForm();

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: APM : Javascript', {
			selectedFrameWork,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFrameWork]);

	const renderDocs = (): JSX.Element => {
		switch (selectedFrameWork) {
			case 'nodejs':
				return <JavascriptDocs />;
			case 'nestjs':
				return <NestJsDocs />;
			default:
				return <ExpressDocs />;
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
								getPopupContainer={popupContainer}
								defaultValue="express"
								style={{ minWidth: 120 }}
								placeholder="Select Framework"
								onChange={(value): void => setSelectedFrameWork(value)}
								options={[
									{
										value: 'nodejs',
										label: frameworksMap.nodejs,
									},
									{
										value: 'express',
										label: frameworksMap.express,
									},
									{
										value: 'nestjs',
										label: frameworksMap.nestjs,
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
