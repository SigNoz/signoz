/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type BaseAutocompleteData,
	DataTypes,
	type IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { Exception, Order, OrderBy } from 'types/api/errors/getAll';
import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import type { Filter } from 'types/api/quickFilters/getCustomFilters';

export interface ExceptionShape {
	exceptionType: string;
	exceptionMessage: string;
	exceptionCount: number;
	serviceName: string;
	groupID: string;
}

/**
 * Ordered by count, the way the backend answers an unsorted request, so a slice
 * keeps a spread of services, languages and counts.
 */
export const EXCEPTION_CATALOGUE: ExceptionShape[] = [
	{
		exceptionType: '*errors.errorString',
		exceptionMessage: 'redis timeout',
		exceptionCount: 2510,
		serviceName: 'redis-manual',
		groupID: '511b9c91a92b9c5166ecb77235f5743b',
	},
	{
		exceptionType: 'ConnectionError',
		exceptionMessage:
			"HTTPConnectionPool(host='payments', port=8080): Read timed out. (read timeout=2)",
		exceptionCount: 1834,
		serviceName: 'checkout',
		groupID: '6a1f0c2d8e4b7a935c10d4f6b8e2a771',
	},
	{
		exceptionType: 'java.net.SocketTimeoutException',
		exceptionMessage: 'Read timed out',
		exceptionCount: 1290,
		serviceName: 'payment-java',
		groupID: 'c93d2f81a0b64e7f95d31c8e7a4b0d26',
	},
	{
		exceptionType: 'TypeError',
		exceptionMessage: "Cannot read properties of undefined (reading 'id')",
		exceptionCount: 964,
		serviceName: 'frontend',
		groupID: '1d7e4b93c05f8a26e91b4d70c3f85a12',
	},
	{
		exceptionType: 'psycopg2.OperationalError',
		exceptionMessage: 'could not connect to server: Connection refused',
		exceptionCount: 742,
		serviceName: 'orders',
		groupID: 'ab3c5d7e9f10234567890bcdef123456',
	},
	{
		exceptionType: 'KeyError',
		exceptionMessage: "'customer_id'",
		exceptionCount: 611,
		serviceName: 'cart',
		groupID: '77e0a1b2c3d4e5f60718293a4b5c6d7e',
	},
	{
		exceptionType: '*net.OpError',
		exceptionMessage: 'dial tcp 10.0.4.11:9092: connect: connection refused',
		exceptionCount: 508,
		serviceName: 'kafka-producer',
		groupID: '2f4a6c8e0b1d3f5709a2b4c6d8e0f135',
	},
	{
		exceptionType: 'ValidationError',
		exceptionMessage:
			'1 validation error for Order\nquantity: value is not a valid integer',
		exceptionCount: 402,
		serviceName: 'orders',
		groupID: '9b8a7c6d5e4f30211f2e3d4c5b6a7988',
	},
	{
		exceptionType: 'java.lang.NullPointerException',
		exceptionMessage: 'Cannot invoke "String.length()" because "sku" is null',
		exceptionCount: 355,
		serviceName: 'inventory-java',
		groupID: '3c1e5a79b2d4f68008a1c3e5b7d9f012',
	},
	{
		exceptionType: 'RuntimeError',
		exceptionMessage: 'Event loop is closed',
		exceptionCount: 287,
		serviceName: 'notifications',
		groupID: 'e5d4c3b2a1908f7e6d5c4b3a29180706',
	},
	{
		exceptionType: 'sqlalchemy.exc.IntegrityError',
		exceptionMessage:
			'duplicate key value violates unique constraint "orders_pkey"',
		exceptionCount: 213,
		serviceName: 'orders',
		groupID: '0a1b2c3d4e5f60718293a4b5c6d7e8f9',
	},
	{
		exceptionType: 'AxiosError',
		exceptionMessage: 'Request failed with status code 503',
		exceptionCount: 168,
		serviceName: 'frontend',
		groupID: '4d6f8a0c2e4b6d8f0a1c3e5b7d9f1113',
	},
	{
		exceptionType: '*fmt.wrapError',
		exceptionMessage: 'publish message: context deadline exceeded',
		exceptionCount: 96,
		serviceName: 'kafka-producer',
		groupID: 'bb0a99887766554433221100ffeeddcc',
	},
	{
		exceptionType: 'RedisTimeoutError',
		exceptionMessage: 'Command timed out after 1000ms',
		exceptionCount: 41,
		serviceName: 'session-store',
		groupID: '8e7d6c5b4a39281706f5e4d3c2b1a099',
	},
];

export const EXCEPTION_CATALOGUE_SIZE = EXCEPTION_CATALOGUE.length;

export const EXCEPTION_SERVICE_NAMES = Array.from(
	new Set(EXCEPTION_CATALOGUE.map(({ serviceName }) => serviceName)),
);

export const EXCEPTION_TYPES = EXCEPTION_CATALOGUE.map(
	({ exceptionType }) => exceptionType,
);

/** The nanoseconds every row carries, so `firstSeen` stays the table's row key. */
const SUBSECOND_NANOS = '797616374';

/**
 * `lastSeen` and `firstSeen` come back as RFC 3339 with nanoseconds, which is
 * what `getNanoSeconds` parses to build the link to the detail page.
 */
const seenAt = (atMs: number): string =>
	`${new Date(atMs).toISOString().slice(0, 19)}.${SUBSECOND_NANOS}Z`;

export interface ListErrorsBody {
	start: string;
	end: string;
	order?: Order;
	orderParam?: OrderBy;
	limit?: number;
	offset?: number;
	exceptionType?: string;
	serviceName?: string;
}

const MINUTE_MS = 60 * 1000;

const contains = (value: string, search: string | undefined): boolean =>
	!search || value.toLowerCase().includes(search.toLowerCase());

const compare = (left: Exception, right: Exception, by: OrderBy): number => {
	if (by === 'exceptionCount') {
		return left.exceptionCount - right.exceptionCount;
	}

	if (by === 'lastSeen' || by === 'firstSeen') {
		return Date.parse(left[by]) - Date.parse(right[by]);
	}

	return left[by].localeCompare(right[by]);
};

/**
 * The exception groups the endpoint holds for one request. The timestamps land
 * inside the window the time picker asked for, and the sorting and the column
 * searches are applied here: the table writes both into the query string and
 * sends them along, rather than sorting or filtering what it already has.
 */
const selectExceptions = (count: number, body: ListErrorsBody): Exception[] => {
	const endMs = Number(body.end) / 1e6;

	const rows: Exception[] = EXCEPTION_CATALOGUE.slice(0, count).map(
		(exception, index) => ({
			...exception,
			lastSeen: seenAt(endMs - index * MINUTE_MS),
			firstSeen: seenAt(endMs - (index + 1) * 30 * MINUTE_MS),
		}),
	);

	const filtered = rows.filter(
		(row) =>
			contains(row.exceptionType, body.exceptionType) &&
			contains(row.serviceName, body.serviceName),
	);

	const orderParam = body.orderParam ?? 'serviceName';
	const direction = body.order === 'descending' ? -1 : 1;

	return filtered.sort(
		(left, right) => direction * compare(left, right, orderParam),
	);
};

export const exceptionRows = (
	count: number,
	body: ListErrorsBody,
): Exception[] => {
	const offset = body.offset ?? 0;
	const limit = body.limit ?? 10;

	return selectExceptions(count, body).slice(offset, offset + limit);
};

/** `/countErrors` answers the bare total the table pages against. */
export const exceptionTotal = (count: number, body: ListErrorsBody): number =>
	selectExceptions(count, body).length;

const QUICK_FILTERS: Filter[] = [
	{ key: 'service.name', dataType: 'string', type: 'resource' },
	{ key: 'exceptionType', dataType: 'string', type: 'tag' },
	{ key: 'deployment.environment', dataType: 'string', type: 'resource' },
	{ key: 'telemetry.sdk.language', dataType: 'string', type: 'resource' },
	{ key: 'host.name', dataType: 'string', type: 'resource' },
	{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
	{ key: 'os.type', dataType: 'string', type: 'resource' },
	{ key: 'hasError', dataType: 'bool', type: 'tag' },
];

export const EXCEPTION_QUICK_FILTER_CAP = QUICK_FILTERS.length;

export const exceptionQuickFiltersResponse = (
	count: number,
): { status: string; data: { filters: Filter[]; signal: string } } => ({
	status: 'success',
	data: { filters: QUICK_FILTERS.slice(0, count), signal: 'exceptions' },
});

const ATTRIBUTE_VALUES: Record<string, string[]> = {
	'service.name': EXCEPTION_SERVICE_NAMES,
	exceptionType: EXCEPTION_TYPES,
	'deployment.environment': ['production', 'staging', 'canary'],
	'telemetry.sdk.language': ['go', 'python', 'java', 'nodejs'],
	'host.name': ['ip-10-0-4-11', 'ip-10-0-4-12', 'ip-10-0-5-31'],
	'k8s.namespace.name': ['default', 'otel-demo', 'payments'],
	'os.type': ['linux', 'darwin'],
};

export const exceptionAttributeValuesResponse = (
	attributeKey: string | null,
	searchText: string | null,
): { status: string; data: IAttributeValuesResponse } => {
	const search = (searchText ?? '').toLowerCase();
	const values = (ATTRIBUTE_VALUES[attributeKey ?? ''] ?? []).filter((value) =>
		value.toLowerCase().includes(search),
	);

	return {
		status: 'success',
		data: {
			stringAttributeValues: values,
			numberAttributeValues: null,
			boolAttributeValues: attributeKey === 'hasError' ? ['true', 'false'] : null,
		},
	};
};

const ATTRIBUTE_KEYS: BaseAutocompleteData[] = [
	...QUICK_FILTERS.map(({ key, dataType, type }) => ({
		key,
		dataType: dataType === 'bool' ? DataTypes.bool : DataTypes.String,
		type,
	})),
	{ key: 'service.namespace', dataType: DataTypes.String, type: 'resource' },
	{ key: 'k8s.pod.name', dataType: DataTypes.String, type: 'resource' },
	{ key: 'k8s.cluster.name', dataType: DataTypes.String, type: 'resource' },
	{ key: 'cloud.region', dataType: DataTypes.String, type: 'resource' },
];

export const exceptionAttributeKeysResponse = (
	searchText: string | null,
): { status: string; data: IQueryAutocompleteResponse } => {
	const search = (searchText ?? '').toLowerCase();

	return {
		status: 'success',
		data: {
			attributeKeys: ATTRIBUTE_KEYS.filter(({ key }) =>
				key.toLowerCase().includes(search),
			),
		},
	};
};
