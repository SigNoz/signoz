import { Code, Pre } from 'components/MarkdownRenderer/MarkdownRenderer';
import Header from 'container/OnboardingContainer/common/Header/Header';
import ReactMarkdown from 'react-markdown';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import SysLogsDocs from './syslogs.md';

export default function SysLogs({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<Header
						entity="syslogs"
						heading="Collecting Syslogs"
						imgURL="/Logos/syslogs.svg"
						docsURL="https://signoz.io/docs/userguide/collecting_syslogs/"
						imgClassName="supported-logs-type-img"
					/>

					<div className="content-container">
						<ReactMarkdown
							components={{
								pre: Pre,
								code: Code,
							}}
						>
							{SysLogsDocs}
						</ReactMarkdown>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<div className="connection-status-container">
					<ConnectionStatus logType="syslogs" />
				</div>
			)}
		</>
	);
}
