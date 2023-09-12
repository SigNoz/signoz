import { MDXProvider } from '@mdx-js/react';
import Header from 'container/OnboardingContainer/common/Header/Header';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import Post from './nodejs.md';

export default function Nodejs({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<Header
						entity="nodejs"
						heading="Collecting NodeJS winston logs"
						imgURL="/Logos/node-js.svg"
						docsURL="https://signoz.io/docs/userguide/collecting_nodejs_winston_logs/"
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
					<ConnectionStatus logType="nodejs" />
				</div>
			)}
		</>
	);
}
