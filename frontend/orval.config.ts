/**
 * When making changes to this file, remove this the file name from .eslintignore and tsconfig.json
 * The reason this is required because of the moduleResolution being "node". Changing this is a more detailed effort.
 * So, until then, we will keep this file ignored for eslint and typescript.
 */

import { defineConfig } from 'orval';

export default defineConfig({
	signoz: {
		input: {
			target: '../docs/api/openapi.yml',
		},
		output: {
			target: './src/api/generated/services',
			client: 'react-query',
			httpClient: 'axios',
			mode: 'tags-split',
			prettier: true,
			headers: true,
			clean: true,
			override: {
				query: {
					useQuery: true,
					useMutation: true,
					useInvalidate: true,
					signal: true,
					useOperationIdAsQueryKey: true,
				},
				useDates: true,
				useNamedParameters: true,
				enumGenerationType: 'enum',
				mutator: {
					path: './src/api/index.ts',
					name: 'GeneratedAPIInstance',
				},

				jsDoc: {
					filter: (schema) => {
						const allowlist = [
							'type',
							'format',
							'maxLength',
							'minLength',
							'description',
							'minimum',
							'maximum',
							'exclusiveMinimum',
							'exclusiveMaximum',
							'pattern',
							'nullable',
							'enum',
						];
						return Object.entries(schema || {})
							.filter(([key]) => allowlist.includes(key))
							.map(([key, value]: [string, any]) => ({
								key,
								value,
							}))
							.sort((a, b) => a.key.length - b.key.length);
					},
				},

				components: {
					schemas: {
						suffix: 'DTO',
					},
					responses: {
						suffix: 'Response',
					},
					parameters: {
						suffix: 'Params',
					},
					requestBodies: {
						suffix: 'Body',
					},
				},

				// info is of type InfoObject from openapi spec
				header: (info: { title: string; version: string }): string[] => [
					`! Do not edit manually`,
					`* The file has been auto-generated using Orval for SigNoz`,
					`* regenerate with 'yarn generate:api'`,
					...(info.title ? [info.title] : []),
					...(info.version ? [`OpenAPI spec version: ${info.version}`] : []),
				],

				// @ts-expect-error
				// propertySortOrder, urlEncodeParameters, aliasCombinedTypes
				// are valid options in the document without types
				propertySortOrder: 'Alphabetical',
				urlEncodeParameters: true,
				aliasCombinedTypes: true,
			},
		},
	},
});
