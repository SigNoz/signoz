/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import type { Request } from '@playwright/test';

import { isQueryRange } from '../../helpers/query-range-mock';

interface QueryEnvelope {
	type: string;
	spec: {
		name?: string;
		signal?: string;
		filter?: { expression?: string };
		aggregations?: { expression?: string }[];
		groupBy?: { name: string }[];
	};
}

export interface QueryRangeRequest {
	start: number;
	end: number;
	requestType: string;
	compositeQuery: { queries: QueryEnvelope[] };
}

export function isQueryRangeRequest(request: Request): boolean {
	return request.method() === 'POST' && isQueryRange(request.url());
}

export function queryRangeBody(request: Request): QueryRangeRequest {
	return request.postDataJSON() as QueryRangeRequest;
}

/** The filter of every query in the request, in order. */
export function filterExpressions(request: Request): string[] {
	return queryRangeBody(request).compositeQuery.queries.map(
		(query) => query.spec.filter?.expression ?? '',
	);
}
