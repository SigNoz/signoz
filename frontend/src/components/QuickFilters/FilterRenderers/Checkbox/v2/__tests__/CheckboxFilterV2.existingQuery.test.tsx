import { screen } from '@testing-library/react';
import { server, rest } from 'mocks-server/server';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../../types';

import CheckboxFilterV2 from '../CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	setupServer,
} from '../CheckboxFilterV2.testUtils';

const USE_FIELD_APIS_AUTO_DERIVE = {
	...DEFAULT_USE_FIELD_APIS,
	existingQuery: undefined,
};

setupServer();

describe('CheckboxFilterV2 - existingQuery calculation', () => {
	const captureExistingQuery = (): Promise<string | null> =>
		new Promise((resolve) => {
			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					const existingQuery = req.url.searchParams.get('existingQuery');
					resolve(existingQuery);
					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									relatedValues: [],
									stringValues: ['test'],
									numberValues: [],
								},
							},
						}),
					);
				}),
			);
		});

	describe('useFieldApis.existingQuery takes precedence', () => {
		it('uses useFieldApis.existingQuery when provided', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'custom.query = "value"',
					}}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: { items: [], op: 'AND' },
										filter: { expression: 'should.be.ignored = "yes"' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBe('custom.query = "value"');
		});

		it('returns undefined when useFieldApis.existingQuery is null', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: null,
					}}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: { items: [], op: 'AND' },
										filter: { expression: 'should.be.ignored = "yes"' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBeNull();
		});
	});

	describe('V5 filter.expression preferred over V3 filters.items', () => {
		it('uses V5 filter.expression when both exist', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={USE_FIELD_APIS_AUTO_DERIVE}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: {
											items: [
												{
													key: { key: 'service.name', dataType: 'string', type: 'tag' },
													op: '=',
													value: 'from-v3-items',
												},
											],
											op: 'AND',
										},
										filter: { expression: 'v5.expression = "preferred"' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBe('v5.expression = "preferred"');
		});

		it('uses V5 filter.expression when no V3 items exist', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={USE_FIELD_APIS_AUTO_DERIVE}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: { items: [], op: 'AND' },
										filter: { expression: 'only.v5 = "expression"' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBe('only.v5 = "expression"');
		});
	});

	describe('V3 filters.items fallback', () => {
		it('converts V3 filters.items to expression when no V5 expression exists', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={USE_FIELD_APIS_AUTO_DERIVE}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: {
											items: [
												{
													key: { key: 'service.name', dataType: 'string', type: 'tag' },
													op: '=',
													value: 'api-service',
												},
											],
											op: 'AND',
										},
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBe("service.name = 'api-service'");
		});

		it('converts multiple V3 filters.items with AND operator', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={USE_FIELD_APIS_AUTO_DERIVE}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: {
											items: [
												{
													key: { key: 'service.name', dataType: 'string', type: 'tag' },
													op: '=',
													value: 'api',
												},
												{
													key: { key: 'env', dataType: 'string', type: 'tag' },
													op: '=',
													value: 'prod',
												},
											],
											op: 'AND',
										},
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBe("service.name = 'api' AND env = 'prod'");
		});

		it('returns undefined when no filters exist', async () => {
			const queryPromise = captureExistingQuery();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={USE_FIELD_APIS_AUTO_DERIVE}
				/>,
				undefined,
				{
					queryBuilderOverrides: {
						currentQuery: {
							builder: {
								queryData: [
									{
										filters: { items: [], op: 'AND' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-test');
			const capturedQuery = await queryPromise;
			expect(capturedQuery).toBeNull();
		});
	});
});
