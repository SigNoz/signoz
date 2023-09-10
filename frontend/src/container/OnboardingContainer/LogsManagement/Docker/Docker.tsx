import { MDXProvider } from '@mdx-js/react';

import { Steps } from 'antd';

import Post from './docker.md';
import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';

export default function Docker({ activeStep }): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<div className="header">
						<img
							className={'supported-logs-type-img'}
							src={`/Logos/docker.svg`}
							alt=""
						/>
						<div className="title">
							<h1>Collecting Docker container logs</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/userguide/collect_docker_logs/"
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
					<ConnectionStatus logType="docker" activeStep={activeStep} />
				</div>
			)}
		</>
	);
}
