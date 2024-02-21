// eslint-disable-next-line import/no-extraneous-dependencies
import { metrics } from '@opentelemetry/api';
import { Space } from 'antd';
import ReleaseNote from 'components/ReleaseNote';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

function DashboardsListPage(): JSX.Element {
	const location = useLocation();
	const meter = metrics.getMeter('web-vitals');
	const lcp = meter.createObservableGauge('lcp-dashboard');
	const cls = meter.createObservableGauge('cls-dashboard');
	const fid = meter.createObservableGauge('fid-dashboard');
	const ttfb = meter.createObservableGauge('ttfb-dashboard');
	const fcp = meter.createObservableGauge('fcp-dashboard');

	function sendToAnalytics(metric: any): void {
		// const body = JSON.stringify(metric);
		console.log(metric);
		switch (metric.name) {
			case 'TTFB': {
				console.log('ttfb', metric.value);
				ttfb.addCallback((result) => {
					result.observe(metric.value);
				});
				break;
			}
			case 'FCP': {
				console.log('fcp', metric.value);
				fcp.addCallback((result) => {
					result.observe(metric.value);
				});
				break;
			}
			case 'LCP': {
				console.log('lcp', metric.value);
				lcp.addCallback((result) => {
					result.observe(metric.value);
				});
				break;
			}
			case 'FID': {
				fid.addCallback((result) => {
					result.observe(metric.value);
				});
				break;
			}
			case 'CLS': {
				cls.addCallback((result) => {
					result.observe(metric.value);
				});
				break;
			}
			default: {
				console.log('un-expected metric name');
			}
		}
	}

	useEffect(() => {
		getCLS(sendToAnalytics);
		getFID(sendToAnalytics);
		getLCP(sendToAnalytics);
		getTTFB(sendToAnalytics);
		getFCP(sendToAnalytics);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />
			<ListOfAllDashboard />
		</Space>
	);
}

export default DashboardsListPage;
