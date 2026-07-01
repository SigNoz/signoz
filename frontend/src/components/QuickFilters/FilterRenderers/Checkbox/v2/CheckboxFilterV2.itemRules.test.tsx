import { screen, within } from '@testing-library/react';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../types';

import CheckboxFilterV2 from './CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	mockFieldsValuesAPI,
	setupServer,
} from './CheckboxFilterV2.testUtils';

setupServer();

describe('CheckboxFilterV2 - item rules', () => {
	describe('no existing query', () => {
		it('all values show as checked with no badge when no query exists', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production', 'staging'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);
			expect(within(productionRow).getByText('production')).toBeInTheDocument();
			const stagingRow = screen.getByTestId('checkbox-value-row-staging');

			expect(productionRow).toHaveAttribute('data-state', 'checked');
			expect(stagingRow).toHaveAttribute('data-state', 'checked');

			expect(screen.queryByTestId('badge-related')).not.toBeInTheDocument();
			expect(screen.queryByTestId('badge-other')).not.toBeInTheDocument();
		});
	});

	describe('with existing query (related values)', () => {
		it('shows "Related" badge with indeterminate state for values in relatedValues', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['production'],
				stringValues: ['staging', 'development'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
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
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);
			expect(within(productionRow).getByText('production')).toBeInTheDocument();

			expect(screen.getByTestId('badge-related')).toBeInTheDocument();
			expect(productionRow).toHaveAttribute('data-state', 'indeterminate');

			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'unchecked');
		});

		it('shows no badge for values not in relatedValues (unchecked state)', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['production'],
				stringValues: ['staging'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
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
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			const stagingRow = await screen.findByTestId('checkbox-value-row-staging');
			expect(within(stagingRow).getByText('staging')).toBeInTheDocument();
			expect(stagingRow).toHaveAttribute('data-state', 'unchecked');
			expect(within(stagingRow).queryByTestId(/^badge-/)).not.toBeInTheDocument();
		});

		it('shows "Related" badge with indeterminate when hasFilterForThisKey=true and isInRelatedValues=true (Rule 5)', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['production', 'staging'],
				stringValues: ['development'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
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
													key: { key: 'deployment.environment' },
													op: 'in',
													value: ['production'],
												},
											],
											op: 'AND',
										},
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);
			expect(productionRow).toHaveAttribute('data-state', 'checked');

			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'indeterminate');
			expect(within(stagingRow).getByTestId('badge-related')).toBeInTheDocument();
		});
	});

	describe('selected values with IN operator', () => {
		it('shows checked state with no badge for IN-selected values', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production', 'staging'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
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
													key: { key: 'deployment.environment' },
													op: 'in',
													value: ['production'],
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

			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);
			expect(productionRow).toHaveAttribute('data-state', 'checked');
			expect(
				within(productionRow).queryByTestId(/^badge-/),
			).not.toBeInTheDocument();

			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'unchecked');
		});
	});

	describe('selected values with NOT IN operator', () => {
		it('shows "Not in" badge with unchecked state for NOT_IN-selected values', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production', 'staging'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
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
													key: { key: 'deployment.environment' },
													op: 'not in',
													value: ['production'],
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

			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);
			expect(productionRow).toHaveAttribute('data-state', 'unchecked');
			expect(screen.getByTestId('badge-not_in')).toBeInTheDocument();

			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'unchecked');
			expect(within(stagingRow).queryByTestId(/^badge-/)).not.toBeInTheDocument();
		});
	});

	describe('ordering by orderIndex', () => {
		it('orders selected values (orderIndex 0) before related (orderIndex 1) before other (orderIndex 2)', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['related-value'],
				stringValues: ['other-value', 'selected-value'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
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
													key: { key: 'deployment.environment' },
													op: 'in',
													value: ['selected-value'],
												},
											],
											op: 'AND',
										},
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-selected-value');

			const allRows = screen.getAllByTestId(/^checkbox-value-row-/);
			const values = allRows.map((row) =>
				row.getAttribute('data-testid')?.replace('checkbox-value-row-', ''),
			);

			expect(values[0]).toBe('selected-value');
			expect(values[1]).toBe('related-value');
			expect(values[2]).toBe('other-value');
		});

		it('sorts alphabetically within same orderIndex', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['zebra', 'alpha', 'mike'],
				stringValues: [],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
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
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			await screen.findByTestId('checkbox-value-row-alpha');

			const allRows = screen.getAllByTestId(/^checkbox-value-row-/);
			const values = allRows.map((row) =>
				row.getAttribute('data-testid')?.replace('checkbox-value-row-', ''),
			);

			expect(values).toStrictEqual(['alpha', 'mike', 'zebra']);
		});
	});

	describe('mixed state scenarios', () => {
		it('handles mixed state: IN-selected + related + other in same list', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['related-env'],
				stringValues: ['other-env', 'selected-env'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
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
													key: { key: 'deployment.environment' },
													op: 'in',
													value: ['selected-env'],
												},
											],
											op: 'AND',
										},
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			const selectedRow = await screen.findByTestId(
				'checkbox-value-row-selected-env',
			);
			expect(selectedRow).toHaveAttribute('data-state', 'checked');
			expect(within(selectedRow).queryByTestId(/^badge-/)).not.toBeInTheDocument();

			const relatedRow = screen.getByTestId('checkbox-value-row-related-env');
			expect(relatedRow).toHaveAttribute('data-state', 'indeterminate');
			expect(within(relatedRow).getByTestId('badge-related')).toBeInTheDocument();

			const otherRow = screen.getByTestId('checkbox-value-row-other-env');
			expect(otherRow).toHaveAttribute('data-state', 'unchecked');
			expect(within(otherRow).queryByTestId(/^badge-/)).not.toBeInTheDocument();
		});

		it('handles NOT_IN-selected alongside related values', async () => {
			mockFieldsValuesAPI({
				relatedValues: ['related-env'],
				stringValues: ['other-env', 'excluded-env'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
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
													key: { key: 'deployment.environment' },
													op: 'not in',
													value: ['excluded-env'],
												},
											],
											op: 'AND',
										},
										filter: { expression: 'service.name = "api"' },
									},
								],
							},
						},
					} as never,
				},
			);

			const excludedRow = await screen.findByTestId(
				'checkbox-value-row-excluded-env',
			);
			expect(excludedRow).toHaveAttribute('data-state', 'unchecked');
			expect(within(excludedRow).getByTestId('badge-not_in')).toBeInTheDocument();

			const relatedRow = screen.getByTestId('checkbox-value-row-related-env');
			expect(relatedRow).toHaveAttribute('data-state', 'indeterminate');
			expect(within(relatedRow).getByTestId('badge-related')).toBeInTheDocument();
		});
	});
});
