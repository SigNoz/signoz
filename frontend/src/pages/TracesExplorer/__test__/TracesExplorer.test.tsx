/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import userEvent from '@testing-library/user-event';
import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import * as compositeQueryHook from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { fireEvent, render, screen, waitFor, within } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { Filter } from '../Filter/Filter';
import { AllTraceFilterKeyValue } from '../Filter/filterUtils';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.TRACES_EXPLORER}/`,
	}),
}));

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};

	const uplotMock = jest.fn(() => ({
		paths,
	}));

	return {
		paths,
		default: uplotMock,
	};
});

function checkIfSectionIsOpen(
	getByTestId: (testId: string) => HTMLElement,
	panelName: string,
): void {
	const section = getByTestId(`collapse-${panelName}`);
	expect(section.querySelector('.ant-collapse-item-active')).not.toBeNull();
}

function checkIfSectionIsNotOpen(
	getByTestId: (testId: string) => HTMLElement,
	panelName: string,
): void {
	const section = getByTestId(`collapse-${panelName}`);
	expect(section.querySelector('.ant-collapse-item-active')).toBeNull();
}

const defaultOpenSections = ['hasError', 'durationNano', 'serviceName'];

const defaultClosedSections = Object.keys(AllTraceFilterKeyValue).filter(
	(section) =>
		![...defaultOpenSections, 'durationNanoMin', 'durationNanoMax'].includes(
			section,
		),
);

async function checkForSectionContent(values: string[]): Promise<void> {
	for (const val of values) {
		const sectionContent = await screen.findByText(val);
		await waitFor(() => expect(sectionContent).toBeInTheDocument());
	}
}

const redirectWithQueryBuilderData = jest.fn();

const compositeQuery: Query = {
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: [
			{
				...initialQueryBuilderFormValues,
				filters: {
					items: [
						{
							id: '95564eb1',
							key: {
								key: 'name',
								dataType: DataTypes.String,
								type: 'tag',
								isColumn: true,
								isJSON: false,
								id: 'name--string--tag--true',
							},
							op: 'in',
							value: ['HTTP GET /customer'],
						},
						{
							id: '3337951c',
							key: {
								key: 'serviceName',
								dataType: DataTypes.String,
								type: 'tag',
								isColumn: true,
								isJSON: false,
								id: 'serviceName--string--tag--true',
							},
							op: 'in',
							value: ['demo-app'],
						},
					],
					op: 'AND',
				},
			},
		],
	},
};

describe('TracesExplorer - ', () => {
	// Initial filter panel rendering
	// Test the initial state like which filters section are opened, default state of duration slider, etc.
	it('should render the Trace filter', async () => {
		const { getByText, getByTestId } = render(<Filter setOpen={jest.fn()} />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});

		// Check default state of duration slider
		const minDuration = getByTestId('min-input') as HTMLInputElement;
		const maxDuration = getByTestId('max-input') as HTMLInputElement;
		expect(minDuration).toHaveValue(null);
		expect(minDuration).toHaveProperty('placeholder', '0');
		expect(maxDuration).toHaveValue(null);
		expect(maxDuration).toHaveProperty('placeholder', '100000000');

		// Check which all filter section are opened by default
		defaultOpenSections.forEach((section) =>
			checkIfSectionIsOpen(getByTestId, section),
		);

		// Check which all filter section are closed by default
		defaultClosedSections.forEach((section) =>
			checkIfSectionIsNotOpen(getByTestId, section),
		);

		// check for the status section content
		await checkForSectionContent(['Ok', 'Error']);

		// check for the service name section content from API response
		await checkForSectionContent([
			'customer',
			'demo-app',
			'driver',
			'frontend',
			'mysql',
			'redis',
			'route',
			'go-grpc-otel-server',
			'test',
		]);
	});

	// test the filter panel actions like opening and closing the sections, etc.
	it('filter panel actions', async () => {
		const { getByTestId } = render(<Filter setOpen={jest.fn()} />);

		// Check if the section is closed
		checkIfSectionIsNotOpen(getByTestId, 'name');
		// Open the section
		const name = getByTestId('collapse-name');
		expect(name).toBeInTheDocument();

		userEvent.click(within(name).getByText(AllTraceFilterKeyValue.name));
		await waitFor(() => checkIfSectionIsOpen(getByTestId, 'name'));

		await checkForSectionContent([
			'HTTP GET',
			'HTTP GET /customer',
			'HTTP GET /dispatch',
			'HTTP GET /route',
		]);

		// Close the section
		userEvent.click(within(name).getByText(AllTraceFilterKeyValue.name));
		await waitFor(() => checkIfSectionIsNotOpen(getByTestId, 'name'));
	});

	it('checking filters should update the query', async () => {
		const { getByText } = render(
			<QueryBuilderContext.Provider
				value={
					{
						currentQuery: {
							...initialQueriesMap.traces,
							builder: {
								...initialQueriesMap.traces.builder,
								queryData: [initialQueryBuilderFormValues],
							},
						},
						redirectWithQueryBuilderData,
					} as any
				}
			>
				<Filter setOpen={jest.fn()} />
			</QueryBuilderContext.Provider>,
		);

		const okCheckbox = getByText('Ok');
		fireEvent.click(okCheckbox);
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						id: expect.any(String),
						key: 'hasError',
						type: 'tag',
						dataType: 'bool',
						isColumn: true,
						isJSON: false,
					},
					op: 'in',
					value: ['false'],
				}),
			]),
		);

		// Check if the query is updated when the error checkbox is clicked
		const errorCheckbox = getByText('Error');
		fireEvent.click(errorCheckbox);
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						id: expect.any(String),
						key: 'hasError',
						type: 'tag',
						dataType: 'bool',
						isColumn: true,
						isJSON: false,
					},
					op: 'in',
					value: ['false', 'true'],
				}),
			]),
		);
	});

	it('should render the trace filter with the given query', async () => {
		jest
			.spyOn(compositeQueryHook, 'useGetCompositeQueryParam')
			.mockReturnValue(compositeQuery);

		const { findByText, getByTestId } = render(<Filter setOpen={jest.fn()} />);

		// check if the default query is applied - composite query has filters - serviceName : demo-app and name : HTTP GET /customer
		expect(await findByText('demo-app')).toBeInTheDocument();
		expect(getByTestId('serviceName-demo-app')).toBeChecked();
		expect(await findByText('HTTP GET /customer')).toBeInTheDocument();
		expect(getByTestId('name-HTTP GET /customer')).toBeChecked();
	});

	it('test edge cases of undefined filters', async () => {
		jest.spyOn(compositeQueryHook, 'useGetCompositeQueryParam').mockReturnValue({
			...compositeQuery,
			builder: {
				...compositeQuery.builder,
				queryData: compositeQuery.builder.queryData.map(
					(item) =>
						({
							...item,
							filters: undefined,
						} as any),
				),
			},
		});

		const { getByText } = render(<Filter setOpen={jest.fn()} />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});

	it('test edge cases of undefined filters - items', async () => {
		jest.spyOn(compositeQueryHook, 'useGetCompositeQueryParam').mockReturnValue({
			...compositeQuery,
			builder: {
				...compositeQuery.builder,
				queryData: compositeQuery.builder.queryData.map(
					(item) =>
						({
							...item,
							filters: {
								...item.filters,
								items: undefined,
							},
						} as any),
				),
			},
		});

		const { getByText } = render(<Filter setOpen={jest.fn()} />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});
});
