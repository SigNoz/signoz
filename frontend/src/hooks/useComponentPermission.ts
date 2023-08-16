import { useCallback, useMemo } from 'react';
import { ROLES } from 'types/roles';
import { componentPermission, ComponentTypes } from 'utils/permission';

const useComponentPermission = (
	component: ComponentTypes[],
	role: ROLES | null,
): boolean[] => {
	const getComponentPermission = useCallback(
		(component: ComponentTypes): boolean =>
			!!componentPermission[component].find((roles) => role === roles),
		[role],
	);

	return useMemo(() => component.map((e) => getComponentPermission(e)), [
		component,
		getComponentPermission,
	]);
};

export default useComponentPermission;
