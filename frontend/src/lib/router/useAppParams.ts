import { useParams } from 'react-router';

import type { AppParamsResult } from './types';

/**
 * Params are typed `string | undefined`, which is what v6 returns.
 */
export function useAppParams<
	ParamsOrKey extends string | Record<string, string | undefined> = string,
>(): AppParamsResult<ParamsOrKey> {
	return useParams() as AppParamsResult<ParamsOrKey>;
}
