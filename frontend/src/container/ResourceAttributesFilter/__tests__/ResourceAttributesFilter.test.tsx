import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render } from '@testing-library/react';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';
import ROUTES from 'constants/routes';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { IResourceAttribute } from 'hooks/useResourceAttribute/types';
import { encode } from 'js-base64';
import {
	fieldStringValuesResponse,
	metricFieldKeysResponse,
} from 'mocks-server/__mockdata__/fields';
import { rest, server } from 'mocks-server/server';
import { TestRouter } from 'tests/router';
import { resetTestRoute } from 'tests/router-utils';

import ResourceAttributesFilter from '../ResourceAttributesFilter';

function routeWithQueries(
	queries: IResourceAttribute[],
	pathname: string,
): string {
	if (!queries.length) {
		return pathname;
	}

	return `${pathname}?resourceAttribute=${encode(JSON.stringify(queries))}`;
}

function renderFilter(route: string): void {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<TestRouter initialRoute={route}>
					<ResourceProvider>{children}</ResourceProvider>
				</TestRouter>
			</QueryClientProvider>
		);
	}

	render(
		<Wrapper>
			<ResourceAttributesFilter />
		</Wrapper>,
	);
}

describe('ResourceAttributesFilter', () => {
	let keysRequests: URLSearchParams[];
	let valuesRequests: URLSearchParams[];

	beforeEach(() => {
		keysRequests = [];
		valuesRequests = [];
		server.use(
			rest.get('*/api/v1/fields/keys', (req, res, ctx) => {
				keysRequests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json(metricFieldKeysResponse(['resource_deployment.environment'])),
				);
			}),
			rest.get('*/api/v1/fields/values', (req, res, ctx) => {
				valuesRequests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json(fieldStringValuesResponse(['production', 'staging'])),
				);
			}),
		);
		resetTestRoute();
	});

	it('shows every applied filter on the service map, including ones it cannot apply', async () => {
		renderFilter(
			routeWithQueries(
				[
					{
						id: 'svc',
						tagKey: 'resource_service_name',
						operator: 'IN',
						tagValue: ['frontend'],
					},
					{
						id: 'env',
						tagKey: 'resource_deployment.environment',
						operator: 'IN',
						tagValue: ['production'],
					},
				],
				ROUTES.SERVICE_MAP,
			),
		);

		await waitFor(() =>
			expect(screen.getByText(/service\.name/)).toBeInTheDocument(),
		);
		await waitFor(() =>
			expect(
				within(screen.getByTestId('resource-environment-filter')).getByTitle(
					'production',
				),
			).toHaveTextContent('production'),
		);
	});

	it('keeps the environment dropdown open so more than one environment can be picked', async () => {
		const user = userEvent.setup();
		renderFilter('/services');

		const environmentFilter = screen.getByTestId('resource-environment-filter');
		const environmentInput = within(environmentFilter).getByRole('combobox');
		await user.click(environmentInput);

		await user.click(await screen.findByTitle('production'));

		await waitFor(() =>
			expect(environmentInput).toHaveAttribute('aria-expanded', 'true'),
		);

		await user.click(screen.getByTitle('staging'));

		await waitFor(() => {
			const selected = within(environmentFilter)
				.getAllByText(/^(production|staging)$/, {
					selector: '.ant-select-selection-item-content',
				})
				.map((node) => node.textContent);
			expect(selected).toStrictEqual(['production', 'staging']);
		});
	});

	it('lists environments from the span metric on the v5 fields API', async () => {
		renderFilter('/services');

		await waitFor(() => expect(valuesRequests).toHaveLength(1));
		expect(
			keysRequests.map((params) => Object.fromEntries(params)),
		).toStrictEqual([
			{
				signal: 'metrics',
				metricName: 'signoz_calls_total',
				searchText: 'resource_deployment.environment',
			},
		]);
		expect(Object.fromEntries(valuesRequests[0])).toStrictEqual({
			signal: 'metrics',
			metricName: 'signoz_calls_total',
			name: 'resource_deployment.environment',
		});
	});
});
