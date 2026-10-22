import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import type {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

/**
 * The keys the legacy v3 query builder offers per signal, so a page that reaches
 * it without declaring its own autocomplete opens on a list that looks like the
 * product's rather than on a failed request.
 */
const ATTRIBUTE_KEYS: Record<DataSource, BaseAutocompleteData[]> = {
	[DataSource.LOGS]: [
		{ key: 'body', dataType: DataTypes.String, type: '' },
		{ key: 'severity_text', dataType: DataTypes.String, type: '' },
		{ key: 'trace_id', dataType: DataTypes.String, type: '' },
		{ key: 'service.name', dataType: DataTypes.String, type: 'resource' },
		{
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
		},
		{ key: 'k8s.namespace.name', dataType: DataTypes.String, type: 'resource' },
		{ key: 'k8s.pod.name', dataType: DataTypes.String, type: 'resource' },
		{ key: 'http.status_code', dataType: DataTypes.Int64, type: 'tag' },
		{ key: 'http.method', dataType: DataTypes.String, type: 'tag' },
		{ key: 'log.level', dataType: DataTypes.String, type: 'tag' },
	],
	[DataSource.TRACES]: [
		{ key: 'name', dataType: DataTypes.String, type: '' },
		{ key: 'durationNano', dataType: DataTypes.Int64, type: '' },
		{ key: 'hasError', dataType: DataTypes.bool, type: '' },
		{ key: 'service.name', dataType: DataTypes.String, type: 'resource' },
		{
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
		},
		{ key: 'host.name', dataType: DataTypes.String, type: 'resource' },
		{ key: 'http.method', dataType: DataTypes.String, type: 'tag' },
		{ key: 'http.route', dataType: DataTypes.String, type: 'tag' },
		{ key: 'response_status_code', dataType: DataTypes.String, type: 'tag' },
		{ key: 'rpc.method', dataType: DataTypes.String, type: 'tag' },
	],
	[DataSource.METRICS]: [
		{ key: 'service_name', dataType: DataTypes.String, type: 'tag' },
		{ key: 'operation', dataType: DataTypes.String, type: 'tag' },
		{ key: 'status_code', dataType: DataTypes.String, type: 'tag' },
		{ key: 'le', dataType: DataTypes.String, type: 'tag' },
		{
			key: 'resource_deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
		},
		{ key: 'resource_host.name', dataType: DataTypes.String, type: 'resource' },
		{
			key: 'resource_k8s.cluster.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
	],
};

/**
 * Values per key, keyed on the last segment so `resource_service.name`,
 * `service.name` and `serviceName` all answer with the same list.
 */
const ATTRIBUTE_VALUES: Record<string, string[]> = {
	'service.name': ['checkout', 'frontend', 'payments', 'cart', 'shipping'],
	service_name: ['checkout', 'frontend', 'payments', 'cart', 'shipping'],
	servicename: ['checkout', 'frontend', 'payments', 'cart', 'shipping'],
	'deployment.environment': ['production', 'staging', 'canary'],
	'k8s.namespace.name': ['default', 'observability', 'payments'],
	'k8s.pod.name': ['checkout-7d9f', 'frontend-5b21', 'payments-0c4a'],
	'host.name': ['ip-10-0-1-14', 'ip-10-0-2-31', 'ip-10-0-3-77'],
	'k8s.cluster.name': ['prod-us-east-1', 'staging-eu-west-1'],
	'http.status_code': ['200', '301', '404', '500'],
	status_code: ['200', '301', '404', '500'],
	response_status_code: ['200', '301', '404', '500'],
	'http.method': ['GET', 'POST', 'PUT', 'DELETE'],
	'http.route': ['/api/cart', '/api/checkout', '/api/products'],
	'rpc.method': ['GetCart', 'PlaceOrder', 'ListProducts'],
	'log.level': ['debug', 'info', 'warn', 'error'],
	severity_text: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
	operation: ['HTTP GET', 'HTTP POST', 'grpc.Execute'],
	le: ['0.1', '0.5', '1', '5', '+Inf'],
};

const DEFAULT_VALUES = ['value-01', 'value-02', 'value-03'];

const isDataSource = (value: string | null): value is DataSource =>
	value !== null && value in ATTRIBUTE_KEYS;

const matches = (candidate: string, searchText: string): boolean =>
	candidate.toLowerCase().includes(searchText.toLowerCase());

export const autocompleteKeysResponse = (
	dataSource: string | null,
	searchText: string,
): { status: string; data: IQueryAutocompleteResponse } => ({
	status: 'success',
	data: {
		attributeKeys: ATTRIBUTE_KEYS[
			isDataSource(dataSource) ? dataSource : DataSource.LOGS
		].filter((attribute) => matches(attribute.key, searchText)),
	},
});

export const autocompleteValuesResponse = (
	attributeKey: string | null,
	searchText: string,
): { status: string; data: IAttributeValuesResponse } => {
	const normalized = (attributeKey ?? '')
		.replace(/^resource_/, '')
		.toLowerCase();

	return {
		status: 'success',
		data: {
			stringAttributeValues: (
				ATTRIBUTE_VALUES[normalized] ?? DEFAULT_VALUES
			).filter((value) => matches(value, searchText)),
			numberAttributeValues: null,
			boolAttributeValues: null,
		},
	};
};
