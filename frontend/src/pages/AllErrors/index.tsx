import RouteTab from 'components/RouteTab';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

import { routes } from './config';

function AllErrors(): JSX.Element {
	const { pathname } = useLocation();

	return (
		<>
			<ResourceAttributesFilter />
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</>
	);
}

export default AllErrors;
