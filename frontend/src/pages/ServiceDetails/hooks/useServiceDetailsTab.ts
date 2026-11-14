import { parseAsStringEnum, useQueryState } from 'nuqs';

import { ServiceDetailsTab } from '../serviceDetailsTabs';

export function useServiceDetailsTab(): [
	ServiceDetailsTab,
	(tab: ServiceDetailsTab) => void,
] {
	const [tab, setTab] = useQueryState(
		'tab',
		parseAsStringEnum(Object.values(ServiceDetailsTab)).withDefault(
			ServiceDetailsTab.Overview,
		),
	);
	return [tab, (next): void => void setTab(next)];
}
