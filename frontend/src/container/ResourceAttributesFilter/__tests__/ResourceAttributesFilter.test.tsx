import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Router } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { createMemoryHistory, MemoryHistory } from 'history';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { IResourceAttribute } from 'hooks/useResourceAttribute/types';
import { encode } from 'js-base64';

import ResourceAttributesFilter from '../ResourceAttributesFilter';

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: { search: '', pathname: '/' },
	},
}));

jest.mock('api/metrics/getResourceAttributes', () => ({
	getResourceAttributesTagKeys: jest.fn(),
	getResourceAttributesTagValues: jest.fn(),
}));

// eslint-disable-next-line import/first, import/order
import {
	getResourceAttributesTagKeys,
	getResourceAttributesTagValues,
	// eslint-disable-next-line import/newline-after-import
} from 'api/metrics/getResourceAttributes';
// eslint-disable-next-line import/first, import/order
import history from 'lib/history';

const mockTagKeys = getResourceAttributesTagKeys as jest.MockedFunction<
	typeof getResourceAttributesTagKeys
>;
const mockTagValues = getResourceAttributesTagValues as jest.MockedFunction<
	typeof getResourceAttributesTagValues
>;

function tagKeysPayload(keys: string[]): never {
	return {
		statusCode: 200,
		error: null,
		message: 'ok',
		payload: {
			data: {
				attributeKeys: keys.map((key) => ({
					key,
					dataType: 'string',
					type: 'resource',
					isColumn: false,
				})),
			},
		},
	} as unknown as never;
}

function tagValuesPayload(values: string[]): never {
	return {
		statusCode: 200,
		error: null,
		message: 'ok',
		payload: { data: { stringAttributeValues: values } },
	} as unknown as never;
}

function seedUrl(queries: IResourceAttribute[], pathname: string): void {
	const location = history.location as { search: string; pathname: string };
	location.search = queries.length
		? `?resourceAttribute=${encode(JSON.stringify(queries))}`
		: '';
	location.pathname = pathname;
}

function renderFilter(pathname: string): MemoryHistory {
	const routerHistory = createMemoryHistory({
		initialEntries: [`${pathname}${history.location.search}`],
	});
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<Router history={routerHistory}>
					<ResourceProvider>{children}</ResourceProvider>
				</Router>
			</QueryClientProvider>
		);
	}

	render(
		<Wrapper>
			<ResourceAttributesFilter />
		</Wrapper>,
	);

	return routerHistory;
}

describe('ResourceAttributesFilter', () => {
	beforeEach(() => {
		mockTagKeys.mockReset();
		mockTagValues.mockReset();
		mockTagKeys.mockResolvedValue(
			tagKeysPayload(['resource_deployment.environment']),
		);
		mockTagValues.mockResolvedValue(tagValuesPayload(['production', 'staging']));
		seedUrl([], '/');
	});

	it('shows every applied filter on the service map, including ones it cannot apply', async () => {
		seedUrl(
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
		);

		renderFilter(ROUTES.SERVICE_MAP);

		await waitFor(() =>
			expect(screen.getByText(/service\.name/)).toBeInTheDocument(),
		);
		await waitFor(() =>
			expect(
				screen
					.getByTestId('resource-environment-filter')
					.querySelector('.ant-select-selection-item'),
			).toHaveTextContent('production'),
		);
	});

	it('keeps the environment dropdown open so more than one environment can be picked', async () => {
		const user = userEvent.setup();
		renderFilter('/services');

		const environmentFilter = screen.getByTestId('resource-environment-filter');
		await user.click(
			environmentFilter.querySelector('input') as HTMLInputElement,
		);

		await user.click(await screen.findByTitle('production'));

		await waitFor(() =>
			expect(
				screen.getByTitle('staging').closest('.ant-select-dropdown'),
			).not.toHaveClass('ant-select-dropdown-hidden'),
		);

		await user.click(screen.getByTitle('staging'));

		await waitFor(() => {
			const selected = Array.from(
				environmentFilter.querySelectorAll('.ant-select-selection-item-content'),
			).map((node) => node.textContent);
			expect(selected).toStrictEqual(['production', 'staging']);
		});
	});
});
