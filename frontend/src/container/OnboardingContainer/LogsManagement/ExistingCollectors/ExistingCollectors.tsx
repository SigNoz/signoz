import { Select } from 'antd';
import { Code, Pre } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { trackEvent } from 'utils/segmentAnalytics';
import { popupContainer } from 'utils/selectPopupContainer';

import FluentBit from './md-docs/fluentBit.md';
import FluentD from './md-docs/fluentD.md';
import LogStashDocs from './md-docs/logStash.md';

enum FrameworksMap {
	fluent_d = 'FluentD',
	fluent_bit = 'FluentBit',
	logstash = 'Logstash',
}

export default function ExistingCollectors(): JSX.Element {
	const [selectedFrameWork, setSelectedFrameWork] = useState('fluent_d');
	const [selectedFrameWorkDocs, setSelectedFrameWorkDocs] = useState(FluentD);

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: Logs Management: Existing Collectors', {
			selectedFrameWork,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFrameWork]);

	const handleFrameworkChange = (selectedFrameWork: string): void => {
		setSelectedFrameWork(selectedFrameWork);

		switch (selectedFrameWork) {
			case 'fluent_d':
				setSelectedFrameWorkDocs(FluentD);
				break;
			case 'fluent_bit':
				setSelectedFrameWorkDocs(FluentBit);
				break;
			default:
				setSelectedFrameWorkDocs(LogStashDocs);
				break;
		}
	};

	return (
		<div className="java-setup-instructions-container">
			<Header
				entity="existing_collectors"
				heading="Logs from existing collectors"
				imgURL="/Logos/cmd-terminal.svg"
				docsURL="https://signoz.io/docs/userguide/fluentbit_to_signoz/"
				imgClassName="supported-language-img"
			/>

			<div className="form-container">
				<div className="framework-selector">
					<div className="label"> Select Framework </div>

					<Select
						getPopupContainer={popupContainer}
						defaultValue="fluent_d"
						style={{ minWidth: 120 }}
						placeholder="Select Framework"
						onChange={(value): void => handleFrameworkChange(value)}
						options={[
							{
								value: 'fluent_d',
								label: FrameworksMap.fluent_d,
							},
							{
								value: 'fluent_bit',
								label: FrameworksMap.fluent_bit,
							},
							{
								value: 'logstash',
								label: FrameworksMap.logstash,
							},
						]}
					/>
				</div>
			</div>

			<div className="content-container">
				<ReactMarkdown
					components={{
						pre: Pre,
						code: Code,
					}}
				>
					{selectedFrameWorkDocs}
				</ReactMarkdown>
			</div>
		</div>
	);
}
