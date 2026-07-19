import { screen, within } from '@testing-library/react';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../../types';

import CheckboxFilterV2 from '../CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	mockFieldsValuesAPI,
	setupServer,
} from '../CheckboxFilterV2.testUtils';

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

			// No section dividers when no existing query (all in "selected" section)
			expect(
				screen.queryByTestId('section-divider-related'),
			).not.toBeInTheDocument();
			expect(
				screen.queryByTestId('section-divider-all-values'),
			).not.toBeInTheDocument();
		});
	});

	describe('with existing query (related values)', () => {
		it('shows related values in "Related" section with checked state', async () => {
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

			// Related values show as checked in "Related" section
			expect(screen.getByTestId('section-divider-related')).toBeInTheDocument();
			expect(productionRow).toHaveAttribute('data-state', 'checked');

			// Other values show as unchecked in "All values" section
			expect(screen.getByTestId('section-divider-all-values')).toBeInTheDocument();
			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'unchecked');
		});

		it('shows no badge for values not in relatedValues (unchecked state in All values section)', async () => {
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

		it('shows related values as checked when hasFilterForThisKey=true and isInRelatedValues=true', async () => {
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

			// production is selected - in selected section
			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);
			expect(productionRow).toHaveAttribute('data-state', 'checked');

			// staging is related - in related section with checked state
			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'checked');
			expect(screen.getByTestId('section-divider-related')).toBeInTheDocument();
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
		it('shows unchecked state with no badge for NOT_IN-selected values', async () => {
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
			expect(
				within(productionRow).queryByTestId(/^badge-/),
			).not.toBeInTheDocument();

			const stagingRow = screen.getByTestId('checkbox-value-row-staging');
			expect(stagingRow).toHaveAttribute('data-state', 'unchecked');
			expect(within(stagingRow).queryByTestId(/^badge-/)).not.toBeInTheDocument();
		});
	});

	describe('section ordering', () => {
		it('orders selected section before related section before other section', async () => {
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

		it('sorts alphabetically within same section', async () => {
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

			// Related values now show as checked
			const relatedRow = screen.getByTestId('checkbox-value-row-related-env');
			expect(relatedRow).toHaveAttribute('data-state', 'checked');
			expect(screen.getByTestId('section-divider-related')).toBeInTheDocument();

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
			expect(within(excludedRow).queryByTestId(/^badge-/)).not.toBeInTheDocument();

			// Related values show as checked
			const relatedRow = screen.getByTestId('checkbox-value-row-related-env');
			expect(relatedRow).toHaveAttribute('data-state', 'checked');
			expect(screen.getByTestId('section-divider-related')).toBeInTheDocument();
		});
	});
});
