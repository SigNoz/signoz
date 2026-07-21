import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server, rest } from 'mocks-server/server';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../../types';

import CheckboxFilterV2 from '../CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	getFilterFromCall,
	mockFieldsValuesAPI,
	renderWithFilter,
	setupServer,
} from '../CheckboxFilterV2.testUtils';

setupServer();

describe('CheckboxFilterV2 - interactions', () => {
	describe('search functionality', () => {
		it('filters values based on search text', async () => {
			const user = userEvent.setup();

			let searchTextReceived = '';
			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					searchTextReceived = req.url.searchParams.get('searchText') || '';

					const values =
						searchTextReceived === ''
							? ['production', 'staging', 'development']
							: ['production'];

					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									relatedValues: [],
									stringValues: values,
									numberValues: [],
								},
							},
						}),
					);
				}),
			);

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-production');
			expect(screen.getByTestId('checkbox-value-row-staging')).toBeInTheDocument();

			const searchInput = screen.getByTestId('checkbox-filter-search');
			await user.type(searchInput, 'prod');

			await waitFor(() => {
				expect(searchTextReceived).toBe('prod');
			});

			await waitFor(() => {
				expect(
					screen.queryByTestId('checkbox-value-row-staging'),
				).not.toBeInTheDocument();
			});
		});

		it('filters values via search while preserving existingQuery context', async () => {
			const user = userEvent.setup();

			let requestCount = 0;
			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					requestCount += 1;
					const searchText = req.url.searchParams.get('searchText') || '';

					if (requestCount === 1) {
						return res(
							ctx.status(200),
							ctx.json({
								status: 'success',
								data: {
									values: {
										relatedValues: ['production'],
										stringValues: ['staging', 'development'],
										numberValues: [],
									},
								},
							}),
						);
					}

					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									relatedValues: searchText === 'prod' ? ['production'] : [],
									stringValues: searchText === 'prod' ? ['production'] : ['staging'],
									numberValues: [],
								},
							},
						}),
					);
				}),
			);

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

			await screen.findByTestId('checkbox-value-row-production');
			// Related values now appear in "Related" section (no badge, uses divider instead)
			expect(screen.getByTestId('section-divider-related')).toBeInTheDocument();

			const searchInput = screen.getByTestId('checkbox-filter-search');
			await user.type(searchInput, 'prod');

			await waitFor(() => {
				expect(
					screen.queryByTestId('checkbox-value-row-staging'),
				).not.toBeInTheDocument();
				expect(
					screen.getByTestId('checkbox-value-row-production'),
				).toBeInTheDocument();
			});
		});

		it('shows filtered results in all_values section when searching with existingQuery', async () => {
			const user = userEvent.setup();

			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					const searchText = req.url.searchParams.get('searchText') || '';

					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									relatedValues: [],
									stringValues: searchText === '' ? ['prod', 'staging'] : ['prod-match'],
									numberValues: [],
								},
							},
						}),
					);
				}),
			);

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-prod');

			const searchInput = screen.getByTestId('checkbox-filter-search');
			await user.type(searchInput, 'prod');

			await waitFor(() => {
				expect(screen.getByTestId('section-all_values')).toBeInTheDocument();
				expect(
					screen.getByTestId('checkbox-value-row-prod-match'),
				).toBeInTheDocument();
			});
		});

		it('shows empty search results message when no matches found', async () => {
			const user = userEvent.setup();

			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					const searchText = req.url.searchParams.get('searchText') || '';

					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									relatedValues: [],
									stringValues: searchText === '' ? ['prod', 'staging'] : [],
									numberValues: [],
								},
							},
						}),
					);
				}),
			);

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-prod');

			const searchInput = screen.getByTestId('checkbox-filter-search');
			await user.type(searchInput, 'xyz-no-match');

			await waitFor(() => {
				expect(
					screen.getByTestId('checkbox-filter-no-search-results'),
				).toBeInTheDocument();
			});
		});

		it('shows both RELATED and ALL_VALUES sections with non-overlapping values', async () => {
			// This tests the bug fix where different pod names in relatedValues vs stringValues
			// caused all items to go to ALL_VALUES instead of showing RELATED section
			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									// Non-overlapping: different pod instances
									relatedValues: ['pod-a-instance-1', 'pod-b-instance-1'],
									stringValues: ['pod-a-instance-2', 'pod-b-instance-2'],
									numberValues: [],
								},
							},
						}),
					),
				),
			);

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
				/>,
			);

			// Wait for values to load
			await screen.findByTestId('checkbox-value-row-pod-a-instance-1');

			// RELATED section should exist with relatedValues
			expect(screen.getByTestId('section-related')).toBeInTheDocument();
			expect(
				screen.getByTestId('checkbox-value-row-pod-a-instance-1'),
			).toBeInTheDocument();
			expect(
				screen.getByTestId('checkbox-value-row-pod-b-instance-1'),
			).toBeInTheDocument();

			// ALL_VALUES section should exist with stringValues
			expect(screen.getByTestId('section-all_values')).toBeInTheDocument();
			expect(
				screen.getByTestId('checkbox-value-row-pod-a-instance-2'),
			).toBeInTheDocument();
			expect(
				screen.getByTestId('checkbox-value-row-pod-b-instance-2'),
			).toBeInTheDocument();
		});

		it('shows both sections during search with filtered non-overlapping values', async () => {
			const user = userEvent.setup();

			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					const searchText = req.url.searchParams.get('searchText') || '';

					// Simulate API filtering - both arrays filtered but remain non-overlapping
					const relatedValues =
						searchText === '' ? ['pod-a-v1', 'pod-b-v1', 'pod-c-v1'] : ['pod-a-v1']; // filtered to match 'pod-a'
					const stringValues =
						searchText === '' ? ['pod-a-v2', 'pod-b-v2', 'pod-c-v2'] : ['pod-a-v2']; // filtered to match 'pod-a'

					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								values: {
									relatedValues,
									stringValues,
									numberValues: [],
								},
							},
						}),
					);
				}),
			);

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={{
						...DEFAULT_USE_FIELD_APIS,
						existingQuery: 'service.name = "api"',
					}}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-pod-a-v1');

			const searchInput = screen.getByTestId('checkbox-filter-search');
			await user.type(searchInput, 'pod-a');

			// After search, both sections should still appear with filtered results
			await waitFor(() => {
				// RELATED section with filtered relatedValues
				expect(screen.getByTestId('section-related')).toBeInTheDocument();
				expect(
					screen.getByTestId('checkbox-value-row-pod-a-v1'),
				).toBeInTheDocument();

				// ALL_VALUES section with filtered stringValues
				expect(screen.getByTestId('section-all_values')).toBeInTheDocument();
				expect(
					screen.getByTestId('checkbox-value-row-pod-a-v2'),
				).toBeInTheDocument();

				// Other values should be filtered out
				expect(
					screen.queryByTestId('checkbox-value-row-pod-b-v1'),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('header interactions', () => {
		it('collapses when header clicked on open filter', async () => {
			const user = userEvent.setup();

			mockFieldsValuesAPI({
				stringValues: ['production'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-production');

			const header = screen.getByTestId('checkbox-filter-header');
			expect(header).toHaveAttribute('data-state', 'open');

			await user.click(header);

			expect(header).toHaveAttribute('data-state', 'closed');
			expect(
				screen.queryByTestId('checkbox-value-row-production'),
			).not.toBeInTheDocument();
		});

		it('expands when header clicked on closed filter', async () => {
			const user = userEvent.setup();

			mockFieldsValuesAPI({
				stringValues: ['production'],
			});

			render(
				<CheckboxFilterV2
					filter={{ ...DEFAULT_FILTER, defaultOpen: false }}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			const header = screen.getByTestId('checkbox-filter-header');
			expect(header).toHaveAttribute('data-state', 'closed');

			await user.click(header);

			expect(header).toHaveAttribute('data-state', 'open');
			await screen.findByTestId('checkbox-value-row-production');
		});
	});

	describe('show more functionality', () => {
		it('shows "Show More..." when more than 10 values', async () => {
			const values = Array.from(
				{ length: 15 },
				(_, i) => `value-${String(i).padStart(2, '0')}`,
			);
			mockFieldsValuesAPI({ stringValues: values });

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-value-00');

			expect(screen.getByTestId('checkbox-filter-show-more')).toBeInTheDocument();

			expect(
				screen.queryByTestId('checkbox-value-row-value-10'),
			).not.toBeInTheDocument();
		});

		it('loads more values when "Show More..." clicked', async () => {
			const user = userEvent.setup();

			const values = Array.from(
				{ length: 15 },
				(_, i) => `value-${String(i).padStart(2, '0')}`,
			);
			mockFieldsValuesAPI({ stringValues: values });

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-value-00');

			await user.click(screen.getByTestId('checkbox-filter-show-more'));

			await screen.findByTestId('checkbox-value-row-value-10');
			expect(
				screen.getByTestId('checkbox-value-row-value-14'),
			).toBeInTheDocument();
		});
	});

	describe('clear functionality', () => {
		it('shows clear button when filter is open and has filter applied', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production'],
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

			await screen.findByTestId('checkbox-value-row-production');

			expect(screen.getByTestId('checkbox-filter-clear-all')).toBeInTheDocument();
		});

		it('hides clear button when no filter applied for attribute', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-production');

			expect(
				screen.queryByTestId('checkbox-filter-clear-all'),
			).not.toBeInTheDocument();
		});

		it('calls onFilterChange when clear clicked', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				stringValues: ['production'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
					onFilterChange={onFilterChange}
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

			await screen.findByTestId('checkbox-value-row-production');

			await user.click(screen.getByTestId('checkbox-filter-clear-all'));

			expect(onFilterChange).toHaveBeenCalled();
		});
	});

	describe('value row interactions', () => {
		it('calls onFilterChange when checkbox value clicked', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				stringValues: ['production', 'staging'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
					onFilterChange={onFilterChange}
				/>,
			);

			const productionRow = await screen.findByTestId(
				'checkbox-value-row-production',
			);

			await user.click(within(productionRow).getByText('production'));

			expect(onFilterChange).toHaveBeenCalled();
		});

		it('creates NOT IN filter when unchecking related item with no existing filter', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				relatedValues: ['valueA'],
				stringValues: ['valueB'],
			});

			// Start with no filter, related items show as checked
			// Clicking unchecks them → creates NOT IN filter to exclude
			renderWithFilter(onFilterChange);

			const rowA = await screen.findByTestId('checkbox-value-row-valueA');
			expect(rowA).toHaveAttribute('data-state', 'checked');

			await user.click(within(rowA).getByRole('checkbox'));

			expect(onFilterChange).toHaveBeenCalledTimes(1);
			const filter = getFilterFromCall(onFilterChange);
			expect(filter?.op).toBe('not in');
			expect(filter?.value).toBe('valueA');
		});

		it('converts NOT IN to IN when toggling unchecked (other) item', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				relatedValues: ['valueA'],
				stringValues: ['valueB'],
			});

			// Clicking unchecked "Other" item with NOT IN filter should convert to IN [B]
			renderWithFilter(onFilterChange, { op: 'not in', value: ['valueA'] });

			const rowB = await screen.findByTestId('checkbox-value-row-valueB');
			expect(rowB).toHaveAttribute('data-state', 'unchecked');

			await user.click(within(rowB).getByRole('checkbox'));

			expect(onFilterChange).toHaveBeenCalledTimes(1);
			const filter = getFilterFromCall(onFilterChange);
			expect(filter?.op).toBe('in');
			expect(filter?.value).toBe('valueB');
		});

		it('accumulates both values in IN when toggling checked (related) then unchecked (other)', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				relatedValues: ['valueA'],
				stringValues: ['valueB'],
			});

			// Start with IN filter for valueA
			renderWithFilter(onFilterChange, { op: 'in', value: ['valueA'] });

			const rowA = await screen.findByTestId('checkbox-value-row-valueA');
			expect(rowA).toHaveAttribute('data-state', 'checked');

			const rowB = screen.getByTestId('checkbox-value-row-valueB');
			expect(rowB).toHaveAttribute('data-state', 'unchecked');

			// Toggle B (unchecked -> should add to IN)
			await user.click(within(rowB).getByRole('checkbox'));

			expect(onFilterChange).toHaveBeenCalledTimes(1);
			const filter = getFilterFromCall(onFilterChange);
			expect(filter?.op).toBe('in');
			expect(filter?.value).toStrictEqual(['valueA', 'valueB']);
		});

		it('adds to NOT IN when toggling checked (related) with existing NOT IN filter', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				relatedValues: ['valueA'],
				stringValues: ['valueB'],
			});

			// Start with NOT IN filter for valueB
			renderWithFilter(onFilterChange, { op: 'not in', value: ['valueB'] });

			const rowA = await screen.findByTestId('checkbox-value-row-valueA');
			// Related values show as checked
			expect(rowA).toHaveAttribute('data-state', 'checked');

			// Toggle A (checked -> should add to NOT IN)
			await user.click(within(rowA).getByRole('checkbox'));

			expect(onFilterChange).toHaveBeenCalledTimes(1);
			const filter = getFilterFromCall(onFilterChange);
			expect(filter?.op).toBe('not in');
			expect(filter?.value).toStrictEqual(['valueB', 'valueA']);
		});

		it('creates NOT IN for single value when toggling related item with existing IN filter', async () => {
			const user = userEvent.setup();
			const onFilterChange = jest.fn();

			mockFieldsValuesAPI({
				relatedValues: ['relatedValue'],
				stringValues: ['otherValue'],
			});

			// Start with IN filter for otherValue (Selected section)
			// relatedValue is in Related section (checked visually)
			renderWithFilter(onFilterChange, { op: 'in', value: ['otherValue'] });

			const selectedRow = await screen.findByTestId(
				'checkbox-value-row-otherValue',
			);
			expect(selectedRow).toHaveAttribute('data-state', 'checked');

			const relatedRow = screen.getByTestId('checkbox-value-row-relatedValue');
			expect(relatedRow).toHaveAttribute('data-state', 'checked');

			// Toggle related item (checked -> should create NOT IN with just this value)
			await user.click(within(relatedRow).getByRole('checkbox'));

			expect(onFilterChange).toHaveBeenCalledTimes(1);
			const filter = getFilterFromCall(onFilterChange);
			expect(filter?.op).toBe('not in');
			expect(filter?.value).toBe('relatedValue');
		});
	});

	describe('custom renderer', () => {
		it('uses customRendererForValue when provided', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production'],
			});

			const customRenderer = (value: string): JSX.Element => (
				<span data-testid="custom-rendered">{`ENV: ${value}`}</span>
			);

			render(
				<CheckboxFilterV2
					filter={{ ...DEFAULT_FILTER, customRendererForValue: customRenderer }}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('custom-rendered');
			expect(screen.getByText('ENV: production')).toBeInTheDocument();
		});
	});
});
