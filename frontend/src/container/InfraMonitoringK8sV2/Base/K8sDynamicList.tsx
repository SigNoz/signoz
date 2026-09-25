import { useMemo } from 'react';

import {
	useInfraMonitoringCategory,
	useInfraMonitoringSelectedItemParams,
} from '../hooks';
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
	const [selectedItemParams] = useInfraMonitoringSelectedItemParams();

	const config = useMemo(
		() => getEntityConfig(selectedCategory),
		[selectedCategory],
	);

	// A row opened from the drawer's overview tab belongs to another category
	const drawerCategory = selectedItemParams.category ?? selectedCategory;
	const drawerConfig = useMemo(
		() => getEntityConfig(drawerCategory),
		[drawerCategory],
	);

	if (!config) {
		return null;
	}

	return (
		<>
			<K8sBaseList
				{...config.list}
				controlListPrefix={controlListPrefix}
				leftFilters={leftFilters}
			/>

			{drawerConfig && (
				<K8sBaseDetails key={drawerCategory} {...drawerConfig.details} />
			)}
		</>
	);
}

export default K8sDynamicList;
