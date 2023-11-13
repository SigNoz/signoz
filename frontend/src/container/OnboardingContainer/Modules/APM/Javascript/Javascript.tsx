import './Javascript.styles.scss';

import { Form, Input, Select } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useEffect, useState } from 'react';
import { trackEvent } from 'utils/segmentAnalytics';
import { popupContainer } from 'utils/selectPopupContainer';

import { LangProps } from '../APM';
import ConnectionStatus from '../../../common/ConnectionStatus/ConnectionStatus';
import ExpressDocs from './md-docs/express.md';
import JavascriptDocs from './md-docs/javascript.md';
import NestJsDocs from './md-docs/nestjs.md';

const frameworksMap = {
	express: 'Express',
	nestjs: 'Nest JS',
	nodejs: 'Nodejs',
};

export default function Javascript({
	ingestionInfo,
	activeStep,
}: LangProps): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('express');
	const [selectedFrameWorkDocs, setSelectedFrameWorkDocs] = useState(
		ExpressDocs,
	);
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
		trackEvent('Onboarding: APM : Javascript', {
			selectedFrameWork,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFrameWork]);

	const handleFrameworkChange = (selectedFrameWork: string): void => {
		setSelectedFrameWork(selectedFrameWork);

		switch (selectedFrameWork) {
			case 'nodejs':
				setSelectedFrameWorkDocs(JavascriptDocs);
				break;
			case 'nestjs':
				setSelectedFrameWorkDocs(NestJsDocs);
				break;
			default:
				setSelectedFrameWorkDocs(ExpressDocs);
				break;
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
								onChange={(value): void => handleFrameworkChange(value)}
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
					language="javascript"
					framework={selectedFrameWork}
				/>
			)}
		</>
	);
}
