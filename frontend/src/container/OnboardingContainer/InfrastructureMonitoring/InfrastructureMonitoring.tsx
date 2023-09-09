import './InfrastructureMonitoring.styles.scss';

import { MDXProvider } from '@mdx-js/react';
import { Tabs } from 'antd';

import Prometheus from './prometheus.md';
import SpecificReceiver from './specific-metric-receiver.md';

const enum receiverType {
	specific_metric_receiver = 'Specific Metric Receiver',
	Prometheus = 'Prometheus',
}

const supportedLanguages = [
	{
		name: 'specific_metric_receiver',
		label: 'Specific Metric Receiver',
	},
	{
		name: 'prometheus',
		label: 'Prometheus',
	},
];

export default function InfrastructureMonitoring({
	activeStep,
}: {
	activeStep: number;
}) {
	const renderEnableReceiverByType = (receiverType: string) => {
		if (receiverType === 'specific_metric_receiver') {
			return <SpecificReceiver />;
		} else {
			return <Prometheus />;
		}
	};
	return (
		<div className="infrastructure-monitoring-module-container">
			{activeStep === 2 && (
				<div className="content-container">
					<div className="heading">
						<h2 className="title">
							By default, when you install SigNoz, only the &nbsp;
							<a
								target="_blank"
								href="https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md"
							>
								Hostmetric receiver
							</a>
							&nbsp; is enabled.
						</h2>
					</div>

					<div className="subheading">
						Before you can query other metrics, you must first enable additional
						receivers in SigNoz. There are two ways in which you can send metrics to
						SigNoz using OpenTelemetry:
						<br />
						<div className="recevier-types">
							<small> 1. Enable a Specific Metric Receiver </small>
							<small> 2. Enable a Prometheus Receiver </small>
						</div>
					</div>

					<MDXProvider>
						<Tabs
							defaultActiveKey="1"
							items={supportedLanguages.map((language, i) => {
								const id = String(i + 1);

								return {
									label: <div className="language-tab-item">{language.label}</div>,
									key: id,
									children: renderEnableReceiverByType(language.name),
								};
							})}
						/>
					</MDXProvider>
				</div>
			)}
			{activeStep === 3 && <div> Infra Monitoring Step 3 </div>}
		</div>
	);
}
