import { Order, OrderBy } from 'types/api/errors/getAll';

export const isOrder = (order: string | null): order is Order =>
	!!(order === 'ascending' || order === 'descending');

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

export const getServiceName = (order: string | null): OrderBy => {
	if (isOrderParams(order)) {
		return order;
	}
	return 'serviceName';
};
