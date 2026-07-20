import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server, rest } from 'mocks-server/server';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../../types';

import CheckboxFilterV2 from '../CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	mockFieldsValuesAPI,
	mockFieldsValuesAPILoading,
	setupServer,
} from '../CheckboxFilterV2.testUtils';

setupServer();

describe('CheckboxFilterV2 - states', () => {
	describe('loading states', () => {
		it('shows skeleton while loading initial data', async () => {
			mockFieldsValuesAPILoading();

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			expect(screen.getByTestId('checkbox-filter-v2')).toBeInTheDocument();
			await waitFor(() => {
				expect(
					screen.getByTestId('checkbox-filter-v2').querySelector('.ant-skeleton'),
				).toBeInTheDocument();
			});
		});

		it('shows skeleton when initially closed filter is opened for the first time', async () => {
			const user = userEvent.setup();
			mockFieldsValuesAPILoading();

			const closedFilter = { ...DEFAULT_FILTER, defaultOpen: false };

			render(
				<CheckboxFilterV2
					filter={closedFilter}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			// Filter starts closed - no skeleton, no content
			expect(
				screen.getByTestId('checkbox-filter-v2').querySelector('.ant-skeleton'),
			).not.toBeInTheDocument();
			expect(
				screen.queryByTestId('checkbox-filter-empty'),
			).not.toBeInTheDocument();

			// Click header to open
			const header = screen.getByTestId('checkbox-filter-header');
			await user.click(header);

			// Should show skeleton while loading, NOT "No values found"
			await waitFor(() => {
				expect(
					screen.getByTestId('checkbox-filter-v2').querySelector('.ant-skeleton'),
				).toBeInTheDocument();
			});
			expect(
				screen.queryByTestId('checkbox-filter-empty'),
			).not.toBeInTheDocument();
		});

		it('shows search spinner when fetching after initial load', async () => {
			const user = userEvent.setup();

			let requestCount = 0;
			server.use(
				rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
					requestCount += 1;
					if (requestCount === 1) {
						return res(
							ctx.status(200),
							ctx.json({
								status: 'success',
								data: {
									values: {
										relatedValues: [],
										stringValues: ['production', 'staging'],
										numberValues: [],
									},
								},
							}),
						);
					}
					return res(ctx.delay(10000));
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

			const searchInput = screen.getByTestId('checkbox-filter-search');
			await user.type(searchInput, 'prod');

			await waitFor(() => {
				expect(
					screen.getByTestId('checkbox-filter-search-loading'),
				).toBeInTheDocument();
			});
		});
	});

	describe('empty states', () => {
		it('shows "No values found" when API returns empty arrays', async () => {
			mockFieldsValuesAPI({
				relatedValues: [],
				stringValues: [],
				numberValues: [],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			const emptySection = await screen.findByTestId('checkbox-filter-empty');
			expect(emptySection).toBeInTheDocument();
		});
	});

	describe('value rendering', () => {
		it('renders values from API response', async () => {
			mockFieldsValuesAPI({
				stringValues: ['production', 'staging', 'development'],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			await screen.findByTestId('checkbox-value-row-production');
			expect(screen.getByTestId('checkbox-value-row-staging')).toBeInTheDocument();
			expect(
				screen.getByTestId('checkbox-value-row-development'),
			).toBeInTheDocument();
		});

		it('renders number values converted to strings', async () => {
			mockFieldsValuesAPI({
				numberValues: [200, 404, 500],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			const row200 = await screen.findByTestId('checkbox-value-row-200');
			expect(within(row200).getByText('200')).toBeInTheDocument();
			expect(
				within(screen.getByTestId('checkbox-value-row-404')).getByText('404'),
			).toBeInTheDocument();
			expect(
				within(screen.getByTestId('checkbox-value-row-500')).getByText('500'),
			).toBeInTheDocument();
		});

		it('filters null/undefined values from response', async () => {
			mockFieldsValuesAPI({
				stringValues: ['valid', null, '', undefined as unknown as string],
			});

			render(
				<CheckboxFilterV2
					filter={DEFAULT_FILTER}
					source={QuickFiltersSource.TRACES_EXPLORER}
					useFieldApis={DEFAULT_USE_FIELD_APIS}
				/>,
			);

			const validRow = await screen.findByTestId('checkbox-value-row-valid');
			expect(within(validRow).getByText('valid')).toBeInTheDocument();
			expect(screen.queryAllByTestId(/^checkbox-value-row-/)).toHaveLength(1);
		});
	});
});
