import { useParams } from 'react-router';

import type { AppParamsResult } from './types';

/**
 * Params are typed `string | undefined`, which is what v7 returns. Values are
 * fully percent-decoded, `/` and `?` included, so put one back in a URL with
 * `buildRoutePath`, never a template string.
 */
export function useAppParams<
	ParamsOrKey extends string | Record<string, string | undefined> = string,
>(): AppParamsResult<ParamsOrKey> {
	return useParams() as AppParamsResult<ParamsOrKey>;
}
