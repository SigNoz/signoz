import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';
import { Pipeline } from 'types/api/pipeline/def';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import ChangeHistory from '../index';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

describe('ChangeHistory test', () => {
	it('should render changeHistory correctly', () => {
		// const pipelinedata: Pipeline = {
		// 	active: true,
		// 	createdBy: 'admin',
		// 	deployResult: 'random_data',
		// 	deployStatus: 'random_data',
		// 	disabled: false,
		// 	elementType: 'random_data',
		// 	history: [],
		// 	id: v4(),
		// 	isValid: true,
		// 	lastConf: 'random_data',
		// 	lastHash: 'random_data',
		// 	pipelines: [],
		// 	version: 1,
		// };
		const pipelinedata: Pipeline = {
			id: '8e196a3c-8737-46d2-8b62-264353b7b9aa',
			version: 24,
			elementType: 'log_pipelines',
			active: false,
			is_valid: false,
			disabled: false,
			deployStatus: 'DEPLOYED',
			deployResult: 'Deployment was successful',
			lastHash: 'log_pipelines:24',
			lastConf:
				'[{"id":"1917badc-580c-42fe-a959-cdf895d4f27b","orderId":1,"name":"hotrod logs parser","alias":"hotrodlogsparser","description":"Trying to test Logs Pipeline feature","enabled":true,"filter":{"op":"AND","items":[{"key":{"key":"container_name","dataType":"string","type":"tag","isColumn":false,"isJSON":false},"value":"hotrod","op":"="}]},"config":[{"type":"regex_parser","id":"parsetext(regex)","output":"parseattribsjson","on_error":"send","orderId":1,"enabled":true,"name":"parse text (regex)","parse_to":"attributes","regex":".+\\\\t+(?P\\u003clog_level\\u003e.+)\\\\t+(?P\\u003clocation\\u003e.+)\\\\t+(?P\\u003cmessage\\u003e.+)\\\\t+(?P\\u003cattribs_json\\u003e.+)","parse_from":"body"},{"type":"json_parser","id":"parseattribsjson","output":"removetempattribs_json","orderId":2,"enabled":true,"name":"parse attribs json","parse_to":"attributes","parse_from":"attributes.attribs_json"},{"type":"remove","id":"removetempattribs_json","output":"c2062723-895e-4614-ba38-29c5d5ee5927","orderId":3,"enabled":true,"name":"remove temp attribs_json","field":"attributes.attribs_json"},{"type":"add","id":"c2062723-895e-4614-ba38-29c5d5ee5927","orderId":4,"enabled":true,"name":"test add ","field":"resource[\\"container.name\\"]","value":"hotrod"}],"createdBy":"prashant@signoz.io","createdAt":"2024-01-02T13:56:02.858300964Z"},{"id":"6aea8303-4a62-4c62-ba07-f16ff8f2174a","orderId":2,"name":"Logs Parser - Pranay - Customer Service","alias":"LogsParser-Pranay-CustomerService","description":"Trying to test Logs Pipeline feature","enabled":true,"filter":{"op":"AND","items":[{"key":{"key":"service","dataType":"string","type":"tag","isColumn":false,"isJSON":false},"value":"customer","op":"="}]},"config":[{"type":"grok_parser","id":"TestPranay","on_error":"send","orderId":1,"enabled":true,"name":"Test Pranay","parse_to":"attributes","pattern":"^%{DATE:date}Z INFO customer/database.go:73 Loading customer {\\"service\\": \\"customer\\", \\"component\\": \\"mysql\\", \\"trace_id\\": \\"227e184cb1263724\\", \\"span_id\\": \\"1427a3fcad8b1514\\", \\"customer_id\\": \\"567\\"}","parse_from":"body"}],"createdBy":"prashant@signoz.io","createdAt":"2024-01-02T13:56:02.863764227Z"}]',
			createdBy: '5e9681b1-16c9-4f7a-9a62-48904d73d9c9',
			pipelines: [
				{
					id: '1917badc-580c-42fe-a959-cdf895d4f27b',
					orderId: 1,
					name: 'hotrod logs parser',
					alias: 'hotrodlogsparser',
					description: 'Trying to test Logs Pipeline feature',
					enabled: true,
					filter: {
						op: 'AND',
						items: [
							{
								key: {
									key: 'container_name',
									dataType: DataTypes.String,
									type: 'tag',
									isColumn: false,
									isJSON: false,
								},
								id: 'sampleid',
								value: 'hotrod',
								op: '=',
							},
						],
					},
					config: [
						{
							type: 'regex_parser',
							id: 'parsetext(regex)',
							output: 'parseattribsjson',
							on_error: 'send',
							orderId: 1,
							enabled: true,
							name: 'parse text (regex)',
							parse_to: 'attributes',
							regex:
								'.+\\t+(?P<log_level>.+)\\t+(?P<location>.+)\\t+(?P<message>.+)\\t+(?P<attribs_json>.+)',
							parse_from: 'body',
						},
						{
							type: 'json_parser',
							id: 'parseattribsjson',
							output: 'removetempattribs_json',
							orderId: 2,
							enabled: true,
							name: 'parse attribs json',
							parse_to: 'attributes',
							parse_from: 'attributes.attribs_json',
						},
						{
							type: 'remove',
							id: 'removetempattribs_json',
							output: 'c2062723-895e-4614-ba38-29c5d5ee5927',
							orderId: 3,
							enabled: true,
							name: 'remove temp attribs_json',
							field: 'attributes.attribs_json',
						},
						{
							type: 'add',
							id: 'c2062723-895e-4614-ba38-29c5d5ee5927',
							orderId: 4,
							enabled: true,
							name: 'test add ',
							field: 'resource["container.name"]',
							value: 'hotrod',
						},
					],
					createdBy: 'prashant@signoz.io',
					createdAt: '2024-01-02T13:56:02.858300964Z',
				},
				{
					id: '6aea8303-4a62-4c62-ba07-f16ff8f2174a',
					orderId: 2,
					name: 'Logs Parser - Pranay - Customer Service',
					alias: 'LogsParser-Pranay-CustomerService',
					description: 'Trying to test Logs Pipeline feature',
					enabled: true,
					filter: {
						op: 'AND',
						items: [
							{
								key: {
									key: 'service',
									dataType: DataTypes.String,
									type: 'tag',
									isColumn: false,
									isJSON: false,
								},
								id: 'sample-test-1',
								value: 'customer',
								op: '=',
							},
						],
					},
					config: [
						{
							type: 'grok_parser',
							id: 'TestPranay',
							on_error: 'send',
							orderId: 1,
							enabled: true,
							name: 'Test Pranay',
							parse_to: 'attributes',
							pattern:
								'^%{DATE:date}Z INFO customer/database.go:73 Loading customer {"service": "customer", "component": "mysql", "trace_id": "227e184cb1263724", "span_id": "1427a3fcad8b1514", "customer_id": "567"}',
							parse_from: 'body',
						},
					],
					createdBy: 'prashant@signoz.io',
					createdAt: '2024-01-02T13:56:02.863764227Z',
				},
			],
			history: [
				{
					id: '8e196a3c-8737-46d2-8b62-264353b7b9aa',
					version: 24,
					elementType: 'log_pipelines',
					active: false,
					isValid: false,
					disabled: false,
					deployStatus: 'DEPLOYED',
					deployResult: 'Deployment was successful',
					lastHash: 'log_pipelines:24',
					lastConf:
						'[{"id":"1917badc-580c-42fe-a959-cdf895d4f27b","orderId":1,"name":"hotrod logs parser","alias":"hotrodlogsparser","description":"Trying to test Logs Pipeline feature","enabled":true,"filter":{"op":"AND","items":[{"key":{"key":"container_name","dataType":"string","type":"tag","isColumn":false,"isJSON":false},"value":"hotrod","op":"="}]},"config":[{"type":"regex_parser","id":"parsetext(regex)","output":"parseattribsjson","on_error":"send","orderId":1,"enabled":true,"name":"parse text (regex)","parse_to":"attributes","regex":".+\\\\t+(?P\\u003clog_level\\u003e.+)\\\\t+(?P\\u003clocation\\u003e.+)\\\\t+(?P\\u003cmessage\\u003e.+)\\\\t+(?P\\u003cattribs_json\\u003e.+)","parse_from":"body"},{"type":"json_parser","id":"parseattribsjson","output":"removetempattribs_json","orderId":2,"enabled":true,"name":"parse attribs json","parse_to":"attributes","parse_from":"attributes.attribs_json"},{"type":"remove","id":"removetempattribs_json","output":"c2062723-895e-4614-ba38-29c5d5ee5927","orderId":3,"enabled":true,"name":"remove temp attribs_json","field":"attributes.attribs_json"},{"type":"add","id":"c2062723-895e-4614-ba38-29c5d5ee5927","orderId":4,"enabled":true,"name":"test add ","field":"resource[\\"container.name\\"]","value":"hotrod"}],"createdBy":"prashant@signoz.io","createdAt":"2024-01-02T13:56:02.858300964Z"},{"id":"6aea8303-4a62-4c62-ba07-f16ff8f2174a","orderId":2,"name":"Logs Parser - Pranay - Customer Service","alias":"LogsParser-Pranay-CustomerService","description":"Trying to test Logs Pipeline feature","enabled":true,"filter":{"op":"AND","items":[{"key":{"key":"service","dataType":"string","type":"tag","isColumn":false,"isJSON":false},"value":"customer","op":"="}]},"config":[{"type":"grok_parser","id":"TestPranay","on_error":"send","orderId":1,"enabled":true,"name":"Test Pranay","parse_to":"attributes","pattern":"^%{DATE:date}Z INFO customer/database.go:73 Loading customer {\\"service\\": \\"customer\\", \\"component\\": \\"mysql\\", \\"trace_id\\": \\"227e184cb1263724\\", \\"span_id\\": \\"1427a3fcad8b1514\\", \\"customer_id\\": \\"567\\"}","parse_from":"body"}],"createdBy":"prashant@signoz.io","createdAt":"2024-01-02T13:56:02.863764227Z"}]',
					createdBy: '5e9681b1-16c9-4f7a-9a62-48904d73d9c9',
					createdByName: 'Prashant 🙎‍♂️',
					createdAt: '2024-01-02T13:56:02Z',
				},
				{
					id: '0b934310-0aea-4806-94b9-7750e3c6935e',
					version: 23,
					elementType: 'log_pipelines',
					active: false,
					isValid: false,
					disabled: false,
					deployStatus: 'DEPLOYED',
					deployResult: 'Deployment was successful',
					lastHash: 'log_pipelines:23',
					lastConf:
						'[{"id":"82051f9e-22f8-4d9d-bca7-35bd32715697","orderId":1,"name":"hotrod logs parser","alias":"hotrodlogsparser","description":"Trying to test Logs Pipeline feature","enabled":true,"filter":{"op":"AND","items":[{"key":{"key":"container_name","dataType":"string","type":"tag","isColumn":false,"isJSON":false},"value":"hotrod","op":"="}]},"config":[{"type":"regex_parser","id":"parsetext(regex)","output":"parseattribsjson","on_error":"send","orderId":1,"enabled":true,"name":"parse text (regex)","parse_to":"attributes","regex":".+\\\\t+(?P\\u003clog_level\\u003e.+)\\\\t+(?P\\u003clocation\\u003e.+)\\\\t+(?P\\u003cmessage\\u003e.+)\\\\t+(?P\\u003cattribs_json\\u003e.+)","parse_from":"body"},{"type":"json_parser","id":"parseattribsjson","output":"removetempattribs_json","orderId":2,"enabled":true,"name":"parse attribs json","parse_to":"attributes","parse_from":"attributes.attribs_json"},{"type":"remove","id":"removetempattribs_json","output":"c2062723-895e-4614-ba38-29c5d5ee5927","orderId":3,"enabled":true,"name":"remove temp attribs_json","field":"attributes.attribs_json"},{"type":"add","id":"c2062723-895e-4614-ba38-29c5d5ee5927","orderId":4,"enabled":true,"name":"test add ","field":"attributes.test","value":"EXPR((attributes.temp?.request_context?.scraper ?? [nil])[0])"}],"createdBy":"prashant@signoz.io","createdAt":"2023-12-29T12:59:20.628696628Z"},{"id":"c9076864-788a-4c5d-bc91-0ab44bbf0b87","orderId":2,"name":"Logs Parser - Pranay - Customer Service","alias":"LogsParser-Pranay-CustomerService","description":"Trying to test Logs Pipeline feature","enabled":true,"filter":{"op":"AND","items":[{"key":{"key":"service","dataType":"string","type":"tag","isColumn":false,"isJSON":false},"value":"customer","op":"="}]},"config":[{"type":"grok_parser","id":"TestPranay","on_error":"send","orderId":1,"enabled":true,"name":"Test Pranay","parse_to":"attributes","pattern":"^%{DATE:date}Z INFO customer/database.go:73 Loading customer {\\"service\\": \\"customer\\", \\"component\\": \\"mysql\\", \\"trace_id\\": \\"227e184cb1263724\\", \\"span_id\\": \\"1427a3fcad8b1514\\", \\"customer_id\\": \\"567\\"}","parse_from":"body"}],"createdBy":"prashant@signoz.io","createdAt":"2023-12-29T12:59:20.635863965Z"}]',
					createdBy: '5e9681b1-16c9-4f7a-9a62-48904d73d9c9',
					createdByName: 'Prashant 🙎‍♂️',
					createdAt: '2023-12-29T12:59:20Z',
				},
			],
		};

		const { asFragment } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<I18nextProvider i18n={i18n}>
							<ChangeHistory pipelineData={pipelinedata} />
						</I18nextProvider>
					</Provider>
				</QueryClientProvider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});
});
