import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

export const mockLog: ILog = {
	id: 'test-log-id',
	date: '2024-03-20T10:00:00Z',
	timestamp: '2024-03-20T10:00:00Z',
	body: 'Test log message',
	attributesString: {},
	attributesInt: {},
	attributesFloat: {},
	attributes_string: {},
	severityText: 'info',
	severityNumber: 0,
	traceId: '',
	spanID: '',
	traceFlags: 0,
	resources_string: {},
	scope_string: {},
	severity_text: 'info',
	severity_number: 0,
};

export const mockQuery: Query = {
	queryType: EQueryType.QUERY_BUILDER,
	builder: {
		queryData: [
			{
				aggregateOperator: 'count',
				disabled: false,
				queryName: 'A',
				groupBy: [],
				orderBy: [],
				limit: 100,
				dataSource: DataSource.LOGS,
				aggregateAttribute: {
					key: 'body',
					type: 'string',
					dataType: DataTypes.String,
				},
				timeAggregation: 'sum',
				functions: [],
				having: [],
				stepInterval: 60,
				legend: '',
				filters: {
					items: [],
					op: 'AND',
				},
				expression: 'A',
				reduceTo: 'sum',
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	clickhouse_sql: [],
	id: 'test-query-id',
	promql: [],
};

const mockBaseAutocompleteData: BaseAutocompleteData = {
	key: 'service',
	type: 'string',
	dataType: DataTypes.String,
};

export const mockTagFilter: TagFilter = {
	items: [
		{
			id: 'test-filter-id',
			key: mockBaseAutocompleteData,
			op: '=',
			value: 'test-service',
		},
	],
	op: 'AND',
};

export const mockQueryRangeResponse = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				list: [
					{
						timestamp: '2025-04-29T09:55:22.462039242Z',
						data: {
							attributes_bool: {},
							attributes_number: {},
							attributes_string: {
								'log.file.path':
									'/var/log/pods/generator_mongodb-0_755b8973-28c1-4698-a20f-22ee85c52c3f/mongodb/0.log',
								'log.iostream': 'stdout',
								logtag: 'F',
							},
							body:
								'{"t":{"$date":"2025-04-29T09:55:22.461+00:00"},"s":"I",  "c":"ACCESS",   "id":5286307, "ctx":"conn231150","msg":"Failed to authenticate","attr":{"client":"10.32.2.33:58258","isSpeculative":false,"isClusterMember":false,"mechanism":"SCRAM-SHA-1","user":"$(MONGO_USER)","db":"admin","error":"UserNotFound: Could not find user \\"$(MONGO_USER)\\" for db \\"admin\\"","result":11,"metrics":{"conversation_duration":{"micros":473,"summary":{"0":{"step":1,"step_total":2,"duration_micros":446}}}},"extraInfo":{}}}',
							id: '2wOlVEhbqYipTUgs3PRMFF1hqjJ',
							resources_string: {
								'cloud.account.id': 'signoz-staging',
								'cloud.availability_zone': 'us-central1-c',
								'cloud.platform': 'gcp_kubernetes_engine',
								'cloud.provider': 'gcp',
								'container.image.name': 'docker.io/bitnami/mongodb',
								'container.image.tag': '7.0.14-debian-12-r0',
								'deployment.environment': 'sample-flask',
								'host.id': '6006012725680193244',
								'host.name': 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-d54x',
								'k8s.cluster.name': 'mgmt',
								'k8s.container.name': 'mongodb',
								'k8s.container.restart_count': '0',
								'k8s.namespace.name': 'generator',
								'k8s.node.name': 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-d54x',
								'k8s.node.uid': 'ef650183-226d-41c0-8295-aeec210b15dd',
								'k8s.pod.name': 'mongodb-0',
								'k8s.pod.start_time': '2025-04-26T04:47:44Z',
								'k8s.pod.uid': '755b8973-28c1-4698-a20f-22ee85c52c3f',
								'k8s.statefulset.name': 'mongodb',
								'os.type': 'linux',
								'service.name': 'mongodb',
							},
							scope_name: '',
							scope_string: {},
							scope_version: '',
							severity_number: 0,
							severity_text: '',
							span_id: '',
							trace_flags: 0,
							trace_id: '',
						},
					},
				],
			},
		],
	},
};
