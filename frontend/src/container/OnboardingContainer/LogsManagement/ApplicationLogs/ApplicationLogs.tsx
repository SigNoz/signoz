import { MDXProvider } from '@mdx-js/react';
import { Tabs } from 'antd';
import Header from 'container/OnboardingContainer/common/Header/Header';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import LogsFromLogFile from './applicationLogsFromLogFile.md';
import LogsUsingJavaOtelSDK from './applicationLogsUsingJavaOtelSDK.md';
import LogsUsingPythonOtelSDK from './applicationLogsUsingPythonOtelSDK.md';

interface ApplicationLogsProps {
	type: string;
	activeStep: number;
}

const collectLogsFromFileURL =
	'https://signoz.io/docs/userguide/collect_logs_from_file/';
const collectLogsFromOTELSDK =
	'https://signoz.io/docs/userguide/collecting_application_logs_otel_sdk_java/';

export default function ApplicationLogs({
	type,
	activeStep,
}: ApplicationLogsProps): JSX.Element {
	function renderContentForCollectingLogsOtelSDK(language: string): JSX.Element {
		if (language === 'Java') {
			return <LogsUsingJavaOtelSDK />;
		}
		return <LogsUsingPythonOtelSDK />;
	}

	enum ApplicationLogsType {
		FROM_LOG_FILE = 'from-log-file',
		USING_OTEL_COLLECTOR = 'using-otel-sdk',
	}

	const docsURL =
		type === ApplicationLogsType.FROM_LOG_FILE
			? collectLogsFromFileURL
			: collectLogsFromOTELSDK;

	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<Header
						entity="docker"
						heading={
							type === ApplicationLogsType.FROM_LOG_FILE
								? 'Collecting Application Logs from Log file'
								: 'Collecting Application Logs Using OTEL SDK'
						}
						imgURL={`/Logos/${
							type === ApplicationLogsType.FROM_LOG_FILE
								? 'software-window'
								: 'cmd-terminal'
						}.svg`}
						docsURL={docsURL}
						imgClassName="supported-logs-type-img"
					/>

					<div className="content-container">
						<MDXProvider>
							{type === ApplicationLogsType.FROM_LOG_FILE && <LogsFromLogFile />}
							{type === ApplicationLogsType.USING_OTEL_COLLECTOR && (
								<Tabs
									defaultActiveKey="1"
									items={['Java', 'Python'].map((language, i) => {
										const id = String(i + 1);

										return {
											label: <div className="language-tab-item">{language}</div>,
											key: id,
											children: renderContentForCollectingLogsOtelSDK(language),
										};
									})}
								/>
							)}
						</MDXProvider>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<div className="connection-status-container">
					<ConnectionStatus logType={type} />
				</div>
			)}
		</>
	);
}
