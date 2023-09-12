import { MDXProvider } from '@mdx-js/react';
import Header from 'container/OnboardingContainer/common/Header/Header';

import ConnectionStatus from '../common/LogsConnectionStatus/LogsConnectionStatus';
import Post from './kubernetes.md';

export default function Kubernetes({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="golang-setup-instructions-container">
					<Header
						entity="kubernetes"
						heading="Collecting Kubernetes Pod logs"
						imgURL="/Logos/kubernetes.svg"
						docsURL="https://signoz.io/docs/userguide/collect_kubernetes_pod_logs/#collect-kubernetes-pod-logs-in-signoz-cloud"
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
					<ConnectionStatus logType="kubernetes" />
				</div>
			)}
		</>
	);
}
