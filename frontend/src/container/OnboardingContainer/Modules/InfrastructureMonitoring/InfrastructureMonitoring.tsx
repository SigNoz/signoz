/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './InfrastructureMonitoring.styles.scss';

import cx from 'classnames';
import { Code, Pre } from 'components/MarkdownRenderer/MarkdownRenderer';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { trackEvent } from 'utils/segmentAnalytics';

import Header from '../common/Header/Header';
import hostMetricsMonitoring from './md-docs/hostMetricsMonitoring.md';
import k8sInfraMonitoringDocs from './md-docs/kubernetesInfraMonitoring.md';
import otherMetrics from './md-docs/otherMetrics.md';

export default function InfrastructureMonitoring({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const [selectedInfraMetrics, setSelectedInfraMetrics] = useState('kubernetes');
	const [selectedInfraMetricsDocs, setSelectedInfraMetricsDocs] = useState(
		k8sInfraMonitoringDocs,
	);

	useEffect(() => {
		// on metrics Type select
		trackEvent('Onboarding: APM : Java', {
			selectedInfraMetrics,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedInfraMetrics]);

	const supportedInfraMetrics = [
		{
			name: 'Kubernetes Infra Metrics',
			id: 'kubernetes',
			imgURL: `Logos/kubernetes.svg`,
		},
		{
			name: 'HostMetrics',
			id: 'hostMetrics',
			imgURL: `Logos/software-window.svg`,
		},
		{
			name: 'Other Metrics',
			id: 'otherMetrics',
			imgURL: `Logos/cmd-terminal.svg`,
		},
	];

	const handleMetricsTypeChange = (selectedMetricsType: string): void => {
		setSelectedInfraMetrics(selectedMetricsType);

		switch (selectedMetricsType) {
			case 'kubernetes':
				setSelectedInfraMetricsDocs(k8sInfraMonitoringDocs);
				break;
			case 'hostMetrics':
				setSelectedInfraMetricsDocs(hostMetricsMonitoring);
				break;
			case 'otherMetrics':
				setSelectedInfraMetricsDocs(otherMetrics);
				break;
			default:
				setSelectedInfraMetricsDocs(otherMetrics);
				break;
		}
	};

	const getHeaderBasedOnType = (): JSX.Element => {
		switch (selectedInfraMetrics) {
			case 'hostMetrics':
				return (
					<Header
						entity="hostMetrics"
						heading="Host Metrics"
						imgURL="/Logos/software-window.svg"
						docsURL="https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/"
						imgClassName="supported-logs-type-img"
					/>
				);

			case 'otherMetrics':
				return (
					<Header
						entity="otherMetrics"
						heading="Other Metrics"
						imgURL="/Logos/cmd-terminal.svg"
						docsURL="https://signoz.io/docs/userguide/send-metrics-cloud/"
						imgClassName="supported-logs-type-img"
					/>
				);

			default:
				return (
					<Header
						entity="kubernetes"
						heading="Kubernetes Metrics"
						imgURL="/Logos/kubernetes.svg"
						docsURL="https://signoz.io/docs/tutorial/kubernetes-infra-metrics/"
						imgClassName="supported-logs-type-img"
					/>
				);
		}
	};

	return (
		<div className="infrastructure-monitoring-module-container">
			{activeStep === 2 && (
				<>
					<div className="module-header">
						<h1>Select an Infra Metrics type</h1>
						{/* <h4> Choose the logs that you want to receive on SigNoz </h4> */}
					</div>

					<div className="supported-logs-type-container">
						{supportedInfraMetrics.map((logType) => (
							<div
								className={cx(
									'supported-logs-type',
									selectedInfraMetrics === logType.id ? 'selected' : '',
								)}
								key={logType.name}
								onClick={(): void => handleMetricsTypeChange(logType.id)}
							>
								<img
									className={cx('supported-logs-type-img')}
									src={`${logType.imgURL}`}
									alt=""
								/>

								<div> {logType.name} </div>
							</div>
						))}
					</div>

					{getHeaderBasedOnType()}

					<div className="content-container">
						<ReactMarkdown
							components={{
								pre: Pre,
								code: Code,
							}}
						>
							{selectedInfraMetricsDocs}
						</ReactMarkdown>
					</div>
				</>
			)}
		</div>
	);
}
