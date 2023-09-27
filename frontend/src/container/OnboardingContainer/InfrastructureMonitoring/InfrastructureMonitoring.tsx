import './InfrastructureMonitoring.styles.scss';

import { Code, Pre } from 'components/MarkdownRenderer/MarkdownRenderer';
import ReactMarkdown from 'react-markdown';

import InfraMonitoringDocs from './infraMonitoringDocs.md';

export default function InfrastructureMonitoring({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const docsURL = 'https://signoz.io/docs/userguide/send-metrics-cloud/';
	const heading = 'Send Metrics to SigNoz Cloud';
	return (
		<div className="infrastructure-monitoring-module-container">
			{activeStep === 2 && (
				<div className="content-container">
					<div className="header">
						<div className="title">
							<h1>{heading}</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a target="_blank" href={docsURL} rel="noreferrer">
									here
								</a>
							</div>
						</div>
					</div>

					<ReactMarkdown
						components={{
							pre: Pre,
							code: Code,
						}}
					>
						{InfraMonitoringDocs}
					</ReactMarkdown>
				</div>
			)}
			{activeStep === 3 && <div> Infra Monitoring Step 3 </div>}
		</div>
	);
}
