import { Code, Pre } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import ReactMarkdown from 'react-markdown';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import LogsFromLogFile from './applicationLogsFromLogFile.md';

interface ApplicationLogsProps {
	type: string;
	activeStep: number;
}

const collectLogsFromFileURL =
	'https://signoz.io/docs/userguide/collect_logs_from_file/';

export default function ApplicationLogs({
	type,
	activeStep,
}: ApplicationLogsProps): JSX.Element {
	const docsURL = collectLogsFromFileURL;

	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<Header
						entity="docker"
						heading="Collecting Application Logs from Log file"
						imgURL={`/Logos/${'software-window'}.svg`}
						docsURL={docsURL}
						imgClassName="supported-logs-type-img"
					/>

					<div className="content-container">
						<ReactMarkdown
							components={{
								pre: Pre,
								code: Code,
							}}
						>
							{LogsFromLogFile}
						</ReactMarkdown>
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
