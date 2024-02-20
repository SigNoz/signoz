// eslint-disable-next-line import/no-extraneous-dependencies
import { metrics } from '@opentelemetry/api';
import { Space } from 'antd';
import ReleaseNote from 'components/ReleaseNote';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { useLocation } from 'react-router-dom';
import { getCLS, getFID, getLCP } from 'web-vitals';

function DashboardsListPage(): JSX.Element {
	const location = useLocation();
	const meter = metrics.getMeter('web-vitals');
	const counter = meter.createHistogram('lcp');

	function sendToAnalytics(metric: any): void {
		// const body = JSON.stringify(metric);
		console.log(metric);
		counter.record(2);
	}

	getCLS(sendToAnalytics);
	getFID(sendToAnalytics);
	getLCP(sendToAnalytics);

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />
			<ListOfAllDashboard />
		</Space>
	);
}

export default DashboardsListPage;
