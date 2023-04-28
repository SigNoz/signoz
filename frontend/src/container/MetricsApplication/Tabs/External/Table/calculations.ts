import { QueryData } from 'types/api/widgets/getQuery';

import { resultQueryName } from './queries';
import * as reduceTo from './reduceTo';

type Address = string;

type DataEntry = {
	duration?: number;
	errPercent?: number;
	reqRate?: number;
};

type DataEntries = Record<Address, DataEntry>;

export interface TableRow {
	address: Address;
	duration?: number;
	errPercent?: number;
	reqRate?: number;
}

type GroupByAddressResult = Record<Address, QueryData['values']>;
function groupByAddress(data: QueryData[]): GroupByAddressResult {
	const result: GroupByAddressResult = {};

	data.forEach((queryData) => {
		if (
			queryData.queryName === resultQueryName &&
			queryData.metric?.address !== undefined
		) {
			const metricValue = queryData.metric.address;
			result[metricValue] = queryData.values;
		}
	});

	return result;
}

type MakeDataEntriesProps = {
	duration: Record<Address, QueryData['values']>;
	errPercent: Record<Address, QueryData['values']>;
	reqRate: Record<Address, QueryData['values']>;
	reduceToNumber: (ns: number[]) => number;
};
function makeDataEntries(props: MakeDataEntriesProps): DataEntries {
	function valuesToNumbers(values: QueryData['values']): number[] {
		return values
			.map(([, value]) => Number(value))
			.filter((n) => !Number.isNaN(n));
	}

	const result: DataEntries = {};

	Object.entries(props.duration).forEach(([address, values]) => {
		result[address] = {
			...result[address],
			duration: props.reduceToNumber(valuesToNumbers(values)),
		};
	});

	Object.entries(props.errPercent).forEach(([address, values]) => {
		result[address] = {
			...result[address],
			errPercent: props.reduceToNumber(valuesToNumbers(values)),
		};
	});

	Object.entries(props.reqRate).forEach(([address, values]) => {
		result[address] = {
			...result[address],
			reqRate: props.reduceToNumber(valuesToNumbers(values)),
		};
	});

	return result;
}

export type MakeTableRowsProps = {
	duration: QueryData[];
	errPercent: QueryData[];
	reqRate: QueryData[];
	reduceTo: reduceTo.ReduceToVariant;
};
export function makeTableRows(props: MakeTableRowsProps): TableRow[] {
	const dataEntries = makeDataEntries({
		duration: groupByAddress(props.duration),
		errPercent: groupByAddress(props.errPercent),
		reqRate: groupByAddress(props.reqRate),
		reduceToNumber: reduceTo.pickFn(props.reduceTo),
	});

	return Object.entries(dataEntries).map(([address, dataEntry]) => ({
		address,
		...dataEntry,
	}));
}
