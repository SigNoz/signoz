import { useMemo } from 'react';

import { K8sCategories } from '../constants';
import K8sEventsList from '../Events/K8sEventsList';
import { useInfraMonitoringCategory } from '../hooks';
import { getEntityConfig } from './entity.registry';
import { K8sBaseList } from './K8sBaseList';
import K8sBaseDetails from './K8sBaseDetails';

export interface K8sDynamicListProps {
	controlListPrefix?: React.ReactNode;
	leftFilters?: React.ReactNode;
}

export function K8sDynamicList({
	controlListPrefix,
	leftFilters,
}: K8sDynamicListProps): JSX.Element | null {
	const [selectedCategory] = useInfraMonitoringCategory();

	const config = useMemo(
		() => getEntityConfig(selectedCategory),
		[selectedCategory],
	);

	// Events are logs rather than a metrics-backed entity, so they have no
	// registry entry and render their own list instead of list + details.
	if (selectedCategory === K8sCategories.EVENTS) {
		return <K8sEventsList controlListPrefix={controlListPrefix} />;
	}

	if (!config) {
		return null;
	}

	const { list, details } = config;

	return (
		<>
			<K8sBaseList
				{...list}
				controlListPrefix={controlListPrefix}
				leftFilters={leftFilters}
			/>

			<K8sBaseDetails {...details} />
		</>
	);
}

export default K8sDynamicList;
