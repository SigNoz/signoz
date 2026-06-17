import { CompositeQueryAdapter } from 'lib/compositeQuery/types';
import { decode, encode } from './codec';

const TAG_KEY = '_t';
const TAG_PREFIX = 'QA';

/**
 * qsAlias (QA~): readable URL serialization with prefix substitution
 * and field aliasing. Outputs multiple query params instead of single
 * compositeQuery param.
 *
 * Format: _t=QAm&query0.ds=traces&query0.aa.key=http.status_code...
 *
 * Tags: QAm (metrics), QAl (logs), QAt (traces)
 */
export const qsAliasAdapter: CompositeQueryAdapter = {
	name: 'qs-alias',
	encode: (query) => {
		const { params } = encode(query);
		return params;
	},
	matches: (params) => {
		const tag = params.get(TAG_KEY) ?? '';
		return (
			tag === `${TAG_PREFIX}m` ||
			tag === `${TAG_PREFIX}l` ||
			tag === `${TAG_PREFIX}t`
		);
	},
	decode: (params) => decode(params),
};

export { encode as encodeQsAlias, decode as decodeQsAlias } from './codec';
