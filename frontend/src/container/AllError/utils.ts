import { FilterValue, SortOrder } from 'antd/lib/table/interface';
import Timestamp from 'timestamp-nano';
import { Order, OrderBy } from 'types/api/errors/getAll';

import {
	DEFAULT_FILTER_VALUE,
	EXCEPTION_TYPE_FILTER_NAME,
	SERVICE_NAME_FILTER_NAME,
} from './constant';

export const isOrder = (order: string | null): order is Order =>
	!!(order === 'ascending' || order === 'descending');

export const urlKey = {
	order: 'order',
	offset: 'offset',
	orderParam: 'orderParam',
	pageSize: 'pageSize',
	exceptionType: 'exceptionType',
	serviceName: 'serviceName',
};

export const isOrderParams = (orderBy: string | null): orderBy is OrderBy =>
	!!(
		orderBy === 'serviceName' ||
		orderBy === 'exceptionCount' ||
		orderBy === 'lastSeen' ||
		orderBy === 'firstSeen' ||
		orderBy === 'exceptionType'
	);

export const getOrder = (order: string | null): Order => {
	if (isOrder(order)) {
		return order;
	}
	return 'ascending';
};

export const getLimit = (limit: string | null): number => {
	if (limit) {
		return parseInt(limit, 10);
	}
	return 10;
};

export const getOffSet = (offset: string | null): number => {
	if (offset && typeof offset === 'string') {
		return parseInt(offset, 10);
	}
	return 0;
};

export const getOrderParams = (order: string | null): OrderBy => {
	if (isOrderParams(order)) {
		return order;
	}
	return 'serviceName';
};

export const getDefaultOrder = (
	orderBy: OrderBy,
	order: Order,
	data: OrderBy,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): SortOrder | undefined => {
	if (orderBy === 'exceptionType' && data === 'exceptionType') {
		return order === 'ascending' ? 'ascend' : 'descend';
	}
	if (orderBy === 'serviceName' && data === 'serviceName') {
		return order === 'ascending' ? 'ascend' : 'descend';
	}
	if (orderBy === 'exceptionCount' && data === 'exceptionCount') {
		return order === 'ascending' ? 'ascend' : 'descend';
	}
	if (orderBy === 'lastSeen' && data === 'lastSeen') {
		return order === 'ascending' ? 'ascend' : 'descend';
	}
	if (orderBy === 'firstSeen' && data === 'firstSeen') {
		return order === 'ascending' ? 'ascend' : 'descend';
	}
	return undefined;
};

export const getNanoSeconds = (date: string): string =>
	Math.floor(new Date(date).getTime() / 1e3).toString() +
	String(Timestamp.fromString(date).getNano().toString()).padStart(9, '0');

export const getUpdatePageSize = (pageSize: string | null): number => {
	if (pageSize) {
		return parseInt(pageSize, 10);
	}
	return 10;
};

export const getFilterString = (filter: string | null): string => {
	if (filter) {
		return filter;
	}
	return '';
};

export const getDefaultFilterValue = (
	filterKey: string | null,
	serviceName: string,
	exceptionType: string,
): string | undefined => {
	let defaultValue: string | undefined;
	switch (filterKey) {
		case SERVICE_NAME_FILTER_NAME:
			defaultValue = serviceName;
			break;
		case EXCEPTION_TYPE_FILTER_NAME:
			defaultValue = exceptionType;
			break;
		default:
			break;
	}
	return defaultValue;
};

export const getFilterValues = (
	serviceName: string,
	exceptionType: string,
	filterKey: string,
	filterValue: string,
): { exceptionFilterValue: string; serviceFilterValue: string } => {
	let serviceFilterValue = serviceName;
	let exceptionFilterValue = exceptionType;
	switch (filterKey) {
		case EXCEPTION_TYPE_FILTER_NAME:
			exceptionFilterValue = filterValue;
			break;
		case SERVICE_NAME_FILTER_NAME:
			serviceFilterValue = filterValue;
			break;
		default:
			break;
	}
	return { exceptionFilterValue, serviceFilterValue };
};

type FilterValues = { exceptionType: string; serviceName: string };

const extractSingleFilterValue = (
	filterName: string,
	filters: Filter,
): string => {
	const filterValues = filters[filterName];

	if (
		!filterValues ||
		!Array.isArray(filterValues) ||
		filterValues.length === 0
	) {
		return DEFAULT_FILTER_VALUE;
	}

	return String(filterValues[0]);
};

type Filter = Record<string, FilterValue | null>;

export const extractFilterValues = (
	filters: Filter,
	prefilledFilters: FilterValues,
): FilterValues => {
	const filterValues: FilterValues = {
		exceptionType: prefilledFilters.exceptionType,
		serviceName: prefilledFilters.serviceName,
	};
	if (filters[EXCEPTION_TYPE_FILTER_NAME]) {
		filterValues.exceptionType = extractSingleFilterValue(
			EXCEPTION_TYPE_FILTER_NAME,
			filters,
		);
	}
	if (filters[SERVICE_NAME_FILTER_NAME]) {
		filterValues.serviceName = extractSingleFilterValue(
			SERVICE_NAME_FILTER_NAME,
			filters,
		);
	}
	return filterValues;
};
