import { Typography } from '@signozhq/ui/typography';
import Slack from 'container/SideNav/Slack';
import store from 'store';

import elixirPngUrl from '@/assets/Logos/elixir.png';
import goPngUrl from '@/assets/Logos/go.png';
import javaPngUrl from '@/assets/Logos/java.png';
import javascriptPngUrl from '@/assets/Logos/javascript.png';
import msNetFrameworkPngUrl from '@/assets/Logos/ms-net-framework.png';
import phpPngUrl from '@/assets/Logos/php.png';
import pythonPngUrl from '@/assets/Logos/python.png';
import railsPngUrl from '@/assets/Logos/rails.png';
import rustPngUrl from '@/assets/Logos/rust.png';

import { TGetStartedContentSection } from './types';
import {
	AlignLeft,
	BellRing,
	ChartBar,
	LayoutDashboard,
	Volume2,
	Unplug,
} from '@signozhq/icons';

export const GetStartedContent = (): TGetStartedContentSection[] => {
	const {
		app: { currentVersion },
	} = store.getState();
	return [
		{
			heading: 'Send data from your applications to SigNoz',
			items: [
				{
					title: 'Instrument your Java Application',
					icon: (
						<img src={`${javaPngUrl}?currentVersion=${currentVersion}`} alt="" />
					),
					url: 'https://signoz.io/docs/instrumentation/java/opentelemetry-java/',
				},
				{
					title: 'Instrument your Python Application',
					icon: (
						<img src={`${pythonPngUrl}?currentVersion=${currentVersion}`} alt="" />
					),
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-python/',
				},
				{
					title: 'Instrument your JS Application',
					icon: (
						<img
							src={`${javascriptPngUrl}?currentVersion=${currentVersion}`}
							alt=""
						/>
					),
					url: 'https://signoz.io/docs/instrumentation/javascript/overview/',
				},
				{
					title: 'Instrument your Go Application',
					icon: <img src={`${goPngUrl}?currentVersion=${currentVersion}`} alt="" />,
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-golang/',
				},
				{
					title: 'Instrument your .NET Application',
					icon: (
						<img
							src={`${msNetFrameworkPngUrl}?currentVersion=${currentVersion}`}
							alt=""
						/>
					),
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-dotnet/',
				},
				{
					title: 'Instrument your PHP Application',
					icon: <img src={`${phpPngUrl}?currentVersion=${currentVersion}`} alt="" />,
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-php/',
				},
				{
					title: 'Instrument your Rails Application',
					icon: (
						<img src={`${railsPngUrl}?currentVersion=${currentVersion}`} alt="" />
					),
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-ruby/',
				},
				{
					title: 'Instrument your Rust Application',
					icon: (
						<img src={`${rustPngUrl}?currentVersion=${currentVersion}`} alt="" />
					),
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-rust/',
				},
				{
					title: 'Instrument your Elixir Application',
					icon: (
						<img src={`${elixirPngUrl}?currentVersion=${currentVersion}`} alt="" />
					),
					url: 'https://signoz.io/docs/instrumentation/opentelemetry-elixir/',
				},
			],
		},
		{
			heading: 'Send Metrics from your Infrastructure & create Dashboards',
			items: [
				{
					title: 'Send metrics to SigNoz',
					icon: <ChartBar size="lg" />,
					url: 'https://signoz.io/docs/metrics-management/send-metrics/',
				},
				{
					title: 'Create and Manage Dashboards',
					icon: <LayoutDashboard size="lg" />,
					url: 'https://signoz.io/docs/userguide/manage-dashboards/',
				},
			],
		},
		{
			heading: 'Send your logs to SigNoz',
			items: [
				{
					title: 'Send your logs to SigNoz',
					icon: <AlignLeft size="lg" />,
					url: 'https://signoz.io/docs/userguide/logs_query_builder/',
				},
				{
					title: 'Existing log collectors to SigNoz',
					icon: <Unplug size="lg" />,
					url: 'https://signoz.io/docs/userguide/fluentbit_to_signoz/',
				},
			],
		},
		{
			heading: 'Create alerts on Metrics',
			items: [
				{
					title: 'Create alert rules on metrics',
					icon: <BellRing size="lg" />,
					url: 'https://signoz.io/docs/alerts/',
				},
				{
					title: 'Configure alert notification channels',
					icon: <Volume2 size="lg" />,
					url: 'https://signoz.io/docs/setup-alerts-notification/',
				},
			],
		},
		{
			heading: 'Need help?',
			description: (
				<>
					{'Join our slack community and ask any question you may have on '}
					<Typography.Link
						href="https://signoz-community.slack.com/archives/C01HWUTP4HH"
						target="_blank"
					>
						#support
					</Typography.Link>
					{' or '}
					<Typography.Link
						href="https://signoz-community.slack.com/archives/C01HWQ1R0BC"
						target="_blank"
					>
						#dummy_channel
					</Typography.Link>
				</>
			),

			items: [
				{
					title: 'Join SigNoz slack community ',
					icon: (
						<div style={{ padding: '0.7rem' }}>
							<Slack width={30} height={30} />
						</div>
					),
					url: 'https://signoz.io/slack',
				},
			],
		},
	];
};
