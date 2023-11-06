import { Code, Pre } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import ReactMarkdown from 'react-markdown';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import DockerDocs from './docker.md';

export default function Docker({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<Header
						entity="docker"
						heading="Collecting Docker container logs"
						imgURL="/Logos/docker.svg"
						docsURL="https://signoz.io/docs/userguide/collect_docker_logs/"
						imgClassName="supported-logs-type-img"
					/>

					<div className="content-container">
						<ReactMarkdown
							components={{
								pre: Pre,
								code: Code,
							}}
						>
							{DockerDocs}
						</ReactMarkdown>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<div className="connection-status-container">
					<ConnectionStatus logType="docker" />
				</div>
			)}
		</>
	);
}
