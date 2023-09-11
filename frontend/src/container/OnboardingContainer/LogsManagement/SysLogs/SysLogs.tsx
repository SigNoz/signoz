import { MDXProvider } from '@mdx-js/react';

import { Steps } from 'antd';

import Post from './syslogs.md';
import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';

export default function SysLogs({ activeStep }): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<div className="header">
						<img
							className={'supported-logs-type-img'}
							src={`/Logos/syslogs.svg`}
							alt=""
						/>
						<div className="title">
							<h1>Collecting Syslogs</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/userguide/collecting_syslogs/"
								>
									here
								</a>
							</div>
						</div>
					</div>

					<div className="content-container">
						<MDXProvider>
							<Post />
						</MDXProvider>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<div className="connection-status-container">
					<ConnectionStatus logType="syslogs" activeStep={activeStep} />
				</div>
			)}
		</>
	);
}
