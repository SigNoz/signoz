import { MDXProvider } from '@mdx-js/react';

import { Steps } from 'antd';

import Post from './kubernetes.md';

export default function Kubernetes({ activeStep }): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<div className="header">
						<img
							className={'supported-logs-type-img'}
							src={`/Logos/kubernetes.svg`}
							alt=""
						/>
						<div className="title">
							<h1>Collecting Kubernetes Pod logs</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/userguide/collect_kubernetes_pod_logs/#collect-kubernetes-pod-logs-in-signoz-cloud"
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
					<Steps
						progressDot
						current={1}
						direction="vertical"
						items={[
							{
								title: 'Finished',
								description: 'Ping Successful',
							},
							{
								title: 'Waiting',
								description: 'Receiving Data from the application',
							},
						]}
					/>
				</div>
			)}
		</>
	);
}
