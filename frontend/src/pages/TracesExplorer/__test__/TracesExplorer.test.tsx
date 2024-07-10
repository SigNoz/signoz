/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import * as compositeQueryHook from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { render } from 'tests/test-utils';
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

		// we should have all the filters
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

		// we should have all the filters
		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});
});
