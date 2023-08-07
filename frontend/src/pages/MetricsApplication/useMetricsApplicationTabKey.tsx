import useUrlQuery from 'hooks/useUrlQuery';

import { getMetricsApplicationKey } from './utils';

const useMetricsApplicationTabKey = (): string => {
	const urlParams = useUrlQuery();

	const tab = urlParams.get('tab');

	return getMetricsApplicationKey(tab);
};

export default useMetricsApplicationTabKey;
