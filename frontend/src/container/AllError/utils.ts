import { SortOrder } from 'antd/lib/table/interface';
import Timestamp from 'timestamp-nano';
import { Order, OrderBy } from 'types/api/errors/getAll';

export const isOrder = (order: string | null): order is Order =>
	!!(order === 'ascending' || order === 'descending');

export const urlKey = {
	order: 'order',
	offset: 'offset',
	orderParam: 'orderParam',
	pageSize: 'pageSize',
};

export const isOrderParams = (orderBy: string | null): orderBy is OrderBy => {
	return !!(
		orderBy === 'serviceName' ||
		orderBy === 'exceptionCount' ||
		orderBy === 'lastSeen' ||
		orderBy === 'firstSeen' ||
		orderBy === 'exceptionType'
	);
};

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

export const getNanoSeconds = (date: string): string => {
	return (
		Math.floor(new Date(date).getTime() / 1e3).toString() +
		String(Timestamp.fromString(date).getNano().toString()).padStart(9, '0')
	);
};

export const getUpdatePageSize = (pageSize: string | null): number => {
	if (pageSize) {
		return parseInt(pageSize, 10);
	}
	return 10;
};
