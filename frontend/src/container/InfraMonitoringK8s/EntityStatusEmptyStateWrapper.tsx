import { Typography } from 'antd';
import { K8sEntityStatusResponse } from 'api/infraMonitoring/getK8sEntityStatus';

import { K8sCategory } from './constants';

interface EntityStatusEmptyStateProps {
	category: K8sCategory;
	data: K8sEntityStatusResponse | null | undefined;
	children: JSX.Element;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function EntityStatusEmptyStateWrapper({
	category,
	data,
	children,
}: EntityStatusEmptyStateProps): JSX.Element {
	if (!data) {
		return children;
	}

	const {
		didSendPodMetrics,
		didSendNodeMetrics,
		didSendClusterMetrics,
		isSendingOptionalPodMetrics,
		isSendingRequiredMetadata,
	} = data;

	const metaData = isSendingRequiredMetadata.length
		? isSendingRequiredMetadata[0]
		: undefined;

	const noK8sMetrics = (
		<Typography.Text>
			No k8s metrics were detected. To monitor your k8s infra, you will need to
			send{' '}
			<Typography.Link href="https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kubeletstatsreceiver">
				kubelet
			</Typography.Link>{' '}
			and{' '}
			<Typography.Link href="https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8sclusterreceiver">
				k8scluster
			</Typography.Link>{' '}
			metrics. Check out our k8s infra installation guide{' '}
			<Typography.Link href="https://signoz.io/docs/tutorial/kubernetes-infra-metrics/">
				here
			</Typography.Link>{' '}
			to get started. Reach out to support if you need further assistance.
		</Typography.Text>
	);

	const partialMetrics = (
		<Typography.Text>
			Partial metrics detected. The following metrics from the kubelet metrics are
			not received. They help monitor the resource utilisation to their
			requests/limits. Learn more{' '}
			<Typography.Link
				// TODO: Add link to docs
				href="placeholder"
			>
				here
			</Typography.Link>{' '}
			about how to send them. Reach out to support if you need further assistance.
		</Typography.Text>
	);

	const noMetadata = (
		<Typography>
			The following shows the sample pods without required metadata. Learn more{' '}
			<Typography.Link
				// TODO: Add link to docs
				href="placeholder"
			>
				here
			</Typography.Link>{' '}
			on how to send enriched data for k8s metrics
			<ul>
				{!metaData?.hasClusterName && <li>No cluster name found</li>}
				{!metaData?.hasNodeName && <li>No node name found</li>}
				{!metaData?.hasNamespaceName && <li>No namespace found</li>}
				{!metaData?.hasDeploymentName &&
					!metaData?.hasStatefulsetName &&
					!metaData?.hasDaemonsetName &&
					!metaData?.hasCronjobName &&
					!metaData?.hasJobName && (
						<li>
							Pod doesn&apos;t have any of the following set:
							<ul>
								<li>deployment</li>
								<li>daemonset</li>
								<li>statefulset</li>
								<li>job</li>
								<li>cronjob</li>
							</ul>
						</li>
					)}
			</ul>
		</Typography>
	);

	const noNodeMetrics = (
		<Typography.Text>
			No node metrics were detected. This is likely due to not adding
			&quot;node&quot; to the metric groups of kubelet receiver. Please update the
			config and check back. Learn more{' '}
			<Typography.Link
				// TODO: Add link to docs
				href="placeholder"
			>
				here
			</Typography.Link>
			. Reach out to support if you need further assistance.
		</Typography.Text>
	);

	const noClusterMetrics = (
		<Typography.Text>
			We are receiving kubelet metrics but not k8scluster receiver metrics. Follow
			the cluster metrics setup{' '}
			<Typography.Link
				// TODO: Add link to docs
				href="placeholder"
			>
				here
			</Typography.Link>
			. Reach out to support if you need further assistance.
		</Typography.Text>
	);

	let emptyStateContent;

	if (category === K8sCategory.NODES) {
		console.log({ didSendPodMetrics, didSendNodeMetrics });
		if (didSendPodMetrics && !didSendNodeMetrics) {
			emptyStateContent = noNodeMetrics;
		} else if (!didSendClusterMetrics && !didSendNodeMetrics) {
			emptyStateContent = noK8sMetrics;
		}
	}

	if (category === K8sCategory.NAMESPACES && !didSendPodMetrics) {
		emptyStateContent = noK8sMetrics;
	}

	if (category === K8sCategory.CLUSTERS) {
		if (didSendPodMetrics && !didSendClusterMetrics) {
			emptyStateContent = noClusterMetrics;
		}
		if (!didSendPodMetrics && !didSendClusterMetrics) {
			emptyStateContent = noK8sMetrics;
		}
	}

	if (
		[
			K8sCategory.PODS,
			K8sCategory.NAMESPACES,
			K8sCategory.DEPLOYMENTS,
			K8sCategory.DAEMONSETS,
			K8sCategory.JOBS,
			K8sCategory.STATEFULSETS,
		].includes(category)
	) {
		if (!didSendPodMetrics && !isSendingOptionalPodMetrics) {
			emptyStateContent = noK8sMetrics;
		} else if (didSendPodMetrics && !isSendingOptionalPodMetrics) {
			emptyStateContent = partialMetrics;
		} else if (isSendingRequiredMetadata.length > 0) {
			emptyStateContent = noMetadata;
		}
	}

	if (emptyStateContent) {
		return (
			<div className="entity-status-empty-state-container">
				<img
					src="/Icons/emptyState.svg"
					alt="thinking-emoji"
					className="empty-state-svg"
				/>

				<Typography.Text className="entity-status-empty-state-message">
					{emptyStateContent}
				</Typography.Text>
			</div>
		);
	}

	return children;
}

export default EntityStatusEmptyStateWrapper;
