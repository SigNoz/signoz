import { useParams } from 'react-router-dom';

import type { AppParamsResult } from './types';

/**
 * v5 types every param as a required string; v6 types it `string | undefined`.
 * The facade returns the v6 shape so missing-param handling surfaces as a type
 * error now rather than at the version flip.
 */
export function useAppParams<
	ParamsOrKey extends string | Record<string, string | undefined> = string,
>(): AppParamsResult<ParamsOrKey> {
	return useParams() as AppParamsResult<ParamsOrKey>;
}
