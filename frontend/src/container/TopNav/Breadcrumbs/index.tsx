import { Breadcrumb } from 'antd';
import ROUTES from 'constants/routes';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';

const breadcrumbNameMap: Record<string, string> = {
	[ROUTES.APPLICATION]: 'Services',
	[ROUTES.TRACE]: 'Traces',
	[ROUTES.TRACES_EXPLORER]: 'Traces Explorer',
	[ROUTES.SERVICE_MAP]: 'Service Map',
	[ROUTES.USAGE_EXPLORER]: 'Usage Explorer',
	[ROUTES.GET_STARTED]: 'Get Started',
	[ROUTES.ALL_CHANNELS]: 'Channels',
	[ROUTES.SETTINGS]: 'Settings',
	[ROUTES.DASHBOARD]: 'Dashboard',
	[ROUTES.ALL_ERROR]: 'Exceptions',
	[ROUTES.VERSION]: 'Status',
	[ROUTES.ORG_SETTINGS]: 'Organization Settings',
	[ROUTES.INGESTION_SETTINGS]: 'Ingestion Settings',
	[ROUTES.MY_SETTINGS]: 'My Settings',
	[ROUTES.CUSTOM_DOMAIN_SETTINGS]: 'Custom Domain Settings',
	[ROUTES.ERROR_DETAIL]: 'Exceptions',
	[ROUTES.LIST_ALL_ALERT]: 'Alerts',
	[ROUTES.ALL_DASHBOARD]: 'Dashboard',
	[ROUTES.LOGS_EXPLORER]: 'Logs Explorer',
	[ROUTES.OLD_LOGS_EXPLORER]: 'Old Logs Explorer',
	[ROUTES.LIVE_LOGS]: 'Live View',
	[ROUTES.LOGS_PIPELINES]: 'Logs Pipelines',
	[ROUTES.BILLING]: 'Billing',
	[ROUTES.SUPPORT]: 'Support',
	[ROUTES.WORKSPACE_LOCKED]: 'Workspace Locked',
	[ROUTES.WORKSPACE_SUSPENDED]: 'Workspace Suspended',
	[ROUTES.MESSAGING_QUEUES_OVERVIEW]: 'Messaging Queues',
};

function ShowBreadcrumbs(props: RouteComponentProps): JSX.Element {
	const { location } = props;

	const pathArray = location.pathname.split('/').filter((i) => i);

	const extraBreadcrumbItems = pathArray.map((_, index) => {
		const url = `/${pathArray.slice(0, index + 1).join('/')}`;

		if (breadcrumbNameMap[url] === undefined) {
			return (
				<Breadcrumb.Item key={url}>
					<Link to={url}>{url.split('/').slice(-1)[0]}</Link>
				</Breadcrumb.Item>
			);
		}
		return (
			<Breadcrumb.Item key={url}>
				<Link to={url}>{breadcrumbNameMap[url]}</Link>
			</Breadcrumb.Item>
		);
	});

	const breadcrumbItems = [
		<Breadcrumb.Item key="home">
			<Link to="/services">Home</Link>
		</Breadcrumb.Item>,
	].concat(extraBreadcrumbItems);

	return <Breadcrumb>{breadcrumbItems}</Breadcrumb>;
}

export default withRouter(ShowBreadcrumbs);
