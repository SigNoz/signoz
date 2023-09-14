import { MDXProvider } from '@mdx-js/react';
import Header from 'container/OnboardingContainer/common/Header/Header';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import Post from './docker.md';

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
						<MDXProvider>
							<Post />
						</MDXProvider>
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
