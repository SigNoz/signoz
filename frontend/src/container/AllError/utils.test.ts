import { Order, OrderBy } from 'types/api/errors/getAll';

import {
	getDefaultOrder,
	getLimit,
	getOffSet,
	getOrder,
	getOrderParams,
	getUpdatePageSize,
	isOrder,
	isOrderParams,
} from './utils';

describe('Error utils', () => {
	test('Valid OrderBy Params', () => {
		expect(isOrderParams('serviceName')).toBe(true);
		expect(isOrderParams('exceptionCount')).toBe(true);
		expect(isOrderParams('lastSeen')).toBe(true);
		expect(isOrderParams('firstSeen')).toBe(true);
		expect(isOrderParams('exceptionType')).toBe(true);
	});

	test('Invalid OrderBy Params', () => {
		expect(isOrderParams('invalid')).toBe(false);
		expect(isOrderParams(null)).toBe(false);
		expect(isOrderParams('')).toBe(false);
	});

	test('Valid Order', () => {
		expect(isOrder('ascending')).toBe(true);
		expect(isOrder('descending')).toBe(true);
	});

	test('Invalid Order', () => {
		expect(isOrder('invalid')).toBe(false);
		expect(isOrder(null)).toBe(false);
		expect(isOrder('')).toBe(false);
	});

	test('Default Order', () => {
		const OrderBy: OrderBy[] = [
			'exceptionCount',
			'exceptionType',
			'firstSeen',
			'lastSeen',
			'serviceName',
		];

		const order: Order[] = ['ascending', 'descending'];

		const ascOrd = order[0];
		const desOrd = order[1];

		OrderBy.forEach((order) => {
			expect(getDefaultOrder(order, ascOrd, order)).toBe('ascend');
			expect(getDefaultOrder(order, desOrd, order)).toBe('descend');
		});
	});

	test('Limit', () => {
		expect(getLimit(null)).toBe(10);
		expect(getLimit('')).toBe(10);
		expect(getLimit('0')).toBe(0);
		expect(getLimit('1')).toBe(1);
		expect(getLimit('10')).toBe(10);
		expect(getLimit('11')).toBe(11);
		expect(getLimit('100')).toBe(100);
		expect(getLimit('101')).toBe(101);
	});

	test('Update Page Size', () => {
		expect(getUpdatePageSize(null)).toBe(10);
		expect(getUpdatePageSize('')).toBe(10);
		expect(getUpdatePageSize('0')).toBe(0);
		expect(getUpdatePageSize('1')).toBe(1);
		expect(getUpdatePageSize('10')).toBe(10);
		expect(getUpdatePageSize('11')).toBe(11);
		expect(getUpdatePageSize('100')).toBe(100);
		expect(getUpdatePageSize('101')).toBe(101);
	});

	test('Order Params', () => {
		expect(getOrderParams(null)).toBe('serviceName');
		expect(getOrderParams('')).toBe('serviceName');
		expect(getOrderParams('serviceName')).toBe('serviceName');
		expect(getOrderParams('exceptionCount')).toBe('exceptionCount');
		expect(getOrderParams('lastSeen')).toBe('lastSeen');
		expect(getOrderParams('firstSeen')).toBe('firstSeen');
		expect(getOrderParams('exceptionType')).toBe('exceptionType');
	});

	test('OffSet', () => {
		expect(getOffSet(null)).toBe(0);
		expect(getOffSet('')).toBe(0);
		expect(getOffSet('0')).toBe(0);
		expect(getOffSet('1')).toBe(1);
		expect(getOffSet('10')).toBe(10);
		expect(getOffSet('11')).toBe(11);
		expect(getOffSet('100')).toBe(100);
		expect(getOffSet('101')).toBe(101);
	});

	test('Order', () => {
		expect(getOrder(null)).toBe('ascending');
		expect(getOrder('')).toBe('ascending');
		expect(getOrder('ascending')).toBe('ascending');
		expect(getOrder('descending')).toBe('descending');
	});
});
