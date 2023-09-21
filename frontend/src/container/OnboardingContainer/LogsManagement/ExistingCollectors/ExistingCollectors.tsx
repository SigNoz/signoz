import { MDXProvider } from '@mdx-js/react';
import { Select } from 'antd';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useEffect, useState } from 'react';
import { trackEvent } from 'utils/segmentAnalytics';

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

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: Logs Management: Existing Collectors', {
			selectedFrameWork,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFrameWork]);

	const renderDocs = (): JSX.Element => {
		switch (selectedFrameWork) {
			case 'fluent_d':
				return <FluentD />;
			case 'fluent_bit':
				return <FluentBit />;
			default:
				return <LogStashDocs />;
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
						defaultValue="fluent_d"
						style={{ minWidth: 120 }}
						placeholder="Select Framework"
						onChange={(value): void => setSelectedFrameWork(value)}
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
				<MDXProvider>{renderDocs()}</MDXProvider>
			</div>
		</div>
	);
}
