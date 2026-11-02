import { useParams } from 'react-router-dom';

import type { AppParamsResult } from './types';

/**
 * Types every param `string | undefined`, as v6 does. v5 types them as required
 * strings.
 */
export function useAppParams<
	ParamsOrKey extends string | Record<string, string | undefined> = string,
>(): AppParamsResult<ParamsOrKey> {
	return useParams() as AppParamsResult<ParamsOrKey>;
}
