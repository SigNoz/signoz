import useUrlQuery from 'hooks/useUrlQuery';

import { TAB_KEY_VS_LABEL } from './types';
import { getMetricsApplicationKey } from './utils';

const useMetricsApplicationTabKey = (): string => {
	const urlParams = useUrlQuery();

	const tab = urlParams.get('tab');

	return TAB_KEY_VS_LABEL[getMetricsApplicationKey(tab)];
};

export default useMetricsApplicationTabKey;
