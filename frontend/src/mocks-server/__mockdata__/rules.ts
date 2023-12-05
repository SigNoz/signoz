export const rulesSuccessResponse = {
	status: 'success',
	data: {
		rules: [
			{
				id: '5',
				state: 'disabled',
				alert: 'Test Rule 1',
				alertType: 'LOGS_BASED_ALERT',
				ruleType: 'threshold_rule',
				evalWindow: '1h0m0s',
				frequency: '1m0s',
				condition: {
					compositeQuery: {
						builderQueries: {
							A: {
								queryName: 'A',
								stepInterval: 60,
								dataSource: 'metrics',
								aggregateOperator: 'noop',
								aggregateAttribute: {
									key: '',
									dataType: 'float64',
									type: '',
									isColumn: true,
									isJSON: false,
								},
								filters: {
									op: 'AND',
									items: null,
								},
								expression: 'A',
								disabled: false,
								limit: 0,
								offset: 0,
								pageSize: 0,
								reduceTo: 'last',
							},
						},
						chQueries: {
							A: {
								query:
									'select \ntoStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1 MINUTE) AS interval, \ntoFloat64(count()) as value \nFROM signoz_logs.distributed_logs  \nWHERE timestamp BETWEEN {{.start_timestamp_nano}} AND {{.end_timestamp_nano}}\n\nGROUP BY interval;\n\n-- available variables:\n-- \t{{.start_timestamp_nano}}\n-- \t{{.end_timestamp_nano}}\n\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval',
								disabled: false,
							},
						},
						promQueries: {
							A: {
								query: '',
								disabled: false,
							},
						},
						panelType: 'graph',
						queryType: 'clickhouse_sql',
					},
					op: '1',
					target: 2000,
					matchType: '1',
				},
				labels: {
					details: 'https://stagingapp.signoz.io/logs',
					hello: 'world',
					region: 'us',
					severity: 'warning',
					type: 'test',
				},
				annotations: {
					description: 'description',
					summary: 'summary',
				},
				disabled: true,
				source:
					'https://stagingapp.signoz.io/alerts/edit?ruleId=5\u0026compositeQuery=%7B%22builder%22%3A%7B%22queryData%22%3A%5B%7B%22dataSource%22%3A%22metrics%22%2C%22queryName%22%3A%22A%22%2C%22aggregateOperator%22%3A%22noop%22%2C%22aggregateAttribute%22%3A%7B%22key%22%3A%22%22%2C%22dataType%22%3A%22float64%22%2C%22type%22%3A%22%22%2C%22isColumn%22%3Atrue%2C%22isJSON%22%3Afalse%7D%2C%22filters%22%3A%7B%22op%22%3A%22AND%22%2C%22items%22%3Anull%7D%2C%22expression%22%3A%22A%22%2C%22disabled%22%3Afalse%2C%22having%22%3A%5B%5D%2C%22stepInterval%22%3A60%2C%22limit%22%3A0%2C%22orderBy%22%3A%5B%5D%2C%22groupBy%22%3A%5B%5D%2C%22legend%22%3A%22%22%2C%22reduceTo%22%3A%22last%22%2C%22offset%22%3A0%2C%22pageSize%22%3A0%7D%5D%2C%22queryFormulas%22%3A%5B%5D%7D%2C%22promql%22%3A%5B%7B%22query%22%3A%22%22%2C%22disabled%22%3Afalse%2C%22name%22%3A%22A%22%7D%5D%2C%22clickhouse_sql%22%3A%5B%7B%22query%22%3A%22select%20%5CntoStartOfInterval(fromUnixTimestamp64Nano(timestamp)%2C%20INTERVAL%201%20MINUTE)%20AS%20interval%2C%20%5CntoFloat64(count())%20as%20value%20%5CnFROM%20signoz_logs.distributed_logs%20%20%5CnWHERE%20timestamp%20BETWEEN%20%7B%7B.start_timestamp_nano%7D%7D%20AND%20%7B%7B.end_timestamp_nano%7D%7D%5Cn%5CnGROUP%20BY%20interval%3B%5Cn%5Cn--%20available%20variables%3A%5Cn--%20%5Ct%7B%7B.start_timestamp_nano%7D%7D%5Cn--%20%5Ct%7B%7B.end_timestamp_nano%7D%7D%5Cn%5Cn--%20required%20columns%20(or%20alias)%3A%5Cn--%20%5Ctvalue%5Cn--%20%5Ctinterval%22%2C%22disabled%22%3Afalse%2C%22name%22%3A%22A%22%7D%5D%2C%22queryType%22%3A%22clickhouse_sql%22%2C%22id%22%3A%22f17cf0cd-f479-4452-aded-e426aeda45ff%22%7D',
				preferredChannels: ['webhook-site'],
				createAt: null,
				createBy: null,
				updateAt: '2023-10-27T14:03:49.79371099Z',
				updateBy: 'ankit@signoz.io',
			},
			{
				id: '6',
				state: 'inactive',
				alert: 'Test Rule 2',
				alertType: 'METRIC_BASED_ALERT',
				ruleType: 'threshold_rule',
				evalWindow: '5m0s',
				frequency: '1m0s',
				condition: {
					compositeQuery: {
						builderQueries: {
							A: {
								queryName: 'A',
								stepInterval: 60,
								dataSource: 'metrics',
								aggregateOperator: 'sum_rate',
								aggregateAttribute: {
									key: 'signoz_calls_total',
									dataType: 'float64',
									type: '',
									isColumn: true,
									isJSON: false,
								},
								filters: {
									op: 'AND',
									items: [],
								},
								groupBy: [
									{
										key: 'service_name',
										dataType: 'string',
										type: 'tag',
										isColumn: false,
										isJSON: false,
									},
								],
								expression: 'A',
								disabled: false,
								limit: 0,
								offset: 0,
								pageSize: 0,
								reduceTo: 'sum',
							},
						},
						chQueries: {
							A: {
								query: '',
								disabled: false,
							},
						},
						promQueries: {
							A: {
								query: '',
								disabled: false,
							},
						},
						panelType: 'graph',
						queryType: 'builder',
					},
					op: '1',
					target: 20,
					matchType: '1',
				},
				labels: {
					severity: 'warning',
				},
				annotations: {
					description:
						'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
					summary:
						'The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}',
				},
				disabled: false,
				source:
					'http://localhost:3301/alerts/edit?ruleId=6\u0026compositeQuery=%7B%22builder%22%3A%7B%22queryData%22%3A%5B%7B%22dataSource%22%3A%22metrics%22%2C%22queryName%22%3A%22A%22%2C%22aggregateOperator%22%3A%22sum_rate%22%2C%22aggregateAttribute%22%3A%7B%22key%22%3A%22signoz_calls_total%22%2C%22dataType%22%3A%22float64%22%2C%22type%22%3A%22%22%2C%22isColumn%22%3Atrue%7D%2C%22filters%22%3A%7B%22op%22%3A%22AND%22%2C%22items%22%3A%5B%5D%7D%2C%22expression%22%3A%22A%22%2C%22disabled%22%3Afalse%2C%22having%22%3A%5B%5D%2C%22stepInterval%22%3A60%2C%22limit%22%3A0%2C%22orderBy%22%3A%5B%5D%2C%22groupBy%22%3A%5B%7B%22key%22%3A%22service_name%22%2C%22dataType%22%3A%22string%22%2C%22type%22%3A%22tag%22%2C%22isColumn%22%3Afalse%7D%5D%2C%22legend%22%3A%22%22%2C%22reduceTo%22%3A%22sum%22%2C%22offset%22%3A0%2C%22pageSize%22%3A0%7D%5D%2C%22queryFormulas%22%3A%5B%5D%7D%2C%22promql%22%3A%5B%7B%22query%22%3A%22%22%2C%22disabled%22%3Afalse%2C%22name%22%3A%22A%22%7D%5D%2C%22clickhouse_sql%22%3A%5B%7B%22query%22%3A%22%22%2C%22disabled%22%3Afalse%2C%22name%22%3A%22A%22%7D%5D%2C%22queryType%22%3A%22builder%22%2C%22id%22%3A%22c6486149-69b9-4e75-92ab-dde3282e558f%22%7D',
				preferredChannels: ['Slack-Discord-Compatible', 'Discord-webhook'],
				createAt: null,
				createBy: null,
				updateAt: '2023-10-06T09:48:07.047188664Z',
				updateBy: null,
			},
		],
	},
};
