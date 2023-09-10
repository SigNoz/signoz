import { MDXProvider } from '@mdx-js/react';
import { Tabs, TabsProps } from 'antd';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import LogsFromLogFile from './applicationLogsFromLogFile.md';
import LogsUsingJavaOtelSDK from './applicationLogsUsingJavaOtelSDK.md';
import LogsUsingPythonOtelSDK from './applicationLogsUsingPythonOtelSDK.md';

const items: TabsProps['items'] = [
	{
		key: '1',
		label: 'Java',
		children: 'Content of Tab Pane 1',
	},
	{
		key: '2',
		label: 'Python',
		children: 'Content of Tab Pane 2',
	},
];

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
					<div className="header">
						<img
							className="supported-logs-type-img"
							src={`/Logos/${
								type === ApplicationLogsType.FROM_LOG_FILE
									? 'software-window'
									: 'cmd-terminal'
							}.svg`}
							alt=""
						/>
						<div className="title">
							{type === ApplicationLogsType.FROM_LOG_FILE ? (
								<h1> Collecting Application Logs from Log file </h1>
							) : (
								<h1> Collecting Application Logs Using OTEL SDK </h1>
							)}

							<div className="detailed-docs-link">
								View detailed docs
								<a target="_blank" href={docsURL} rel="noreferrer">
									here
								</a>
							</div>
						</div>
					</div>

					<div className="content-container">
						<MDXProvider>
							{type === ApplicationLogsType.FROM_LOG_FILE && <LogsFromLogFile />}
							{type === ApplicationLogsType.USING_OTEL_COLLECTOR && (
								<Tabs
									defaultActiveKey="1"
									items={['Java', 'Python'].map((language, i) => {
										const id = String(i + 1);

										return {
											label: (
												<div className="language-tab-item">
													{/* <img src={`/Logos/${language}.png`} alt="" /> */}
													{language}
												</div>
											),
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
					<ConnectionStatus
						logType={
							type === ApplicationLogsType.FROM_LOG_FILE
								? 'Application Logs from Log File'
								: 'Application Logs using existing OTEL Collector'
						}
						activeStep={activeStep}
					/>
				</div>
			)}
		</>
	);
}
