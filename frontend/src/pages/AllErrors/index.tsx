import RouteTab from 'components/RouteTab';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { useLocation } from 'react-router-dom';

import { routes } from './config';

function AllErrors(): JSX.Element {
	const { pathname } = useLocation();

	return (
		<>
			<ResourceAttributesFilter />
			<RouteTab routes={routes} activeKey={pathname} />
		</>
	);
}

export default AllErrors;
