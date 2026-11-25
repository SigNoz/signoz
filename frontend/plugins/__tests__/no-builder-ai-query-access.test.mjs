import { ruleTester } from './rule-tester.mjs';

const message =
	'from lib/query/builderSlot instead of accessing builder_ai_query';

await ruleTester({
	rule: 'no-builder-ai-query-access',
	valid: [
		{
			name: 'reading through the slot helper',
			code: 'export const data = getActiveBuilder(query).queryData;',
		},
		{
			name: 'reading the builder slot',
			code: 'export const data = query.builder.queryData;',
		},
		{
			name: 'building a query with the AI slot',
			code: 'export const next = { ...query, builder_ai_query: builder };',
		},
		{
			name: 'generated enum member',
			code:
				'export const type = Querybuildertypesv5QueryTypeDTO.builder_ai_query;',
		},
		{
			name: 'type position',
			code: "export type Slot = Query['builder_ai_query'];",
		},
	],
	invalid: [
		{
			name: 'picking the slot by query type',
			code:
				'export const data =\n\tquery.queryType === EQueryType.AI_QUERY_BUILDER\n\t\t? query.builder_ai_query?.queryData\n\t\t: query.builder.queryData;',
			errors: [{ message, line: 3 }],
		},
		{
			name: 'optional chaining',
			code: 'export const slot = query?.builder_ai_query;',
			errors: [{ message, line: 1 }],
		},
		{
			name: 'writing the slot',
			code: 'query.builder_ai_query = builder;',
			errors: [{ message, line: 1 }],
		},
		{
			name: 'bracket access',
			code: "export const slot = query['builder_ai_query'];",
			errors: [{ message, line: 1 }],
		},
		{
			name: 'destructuring',
			code: 'export const { builder_ai_query: slot } = query;',
			errors: [{ message, line: 1 }],
		},
	],
});
