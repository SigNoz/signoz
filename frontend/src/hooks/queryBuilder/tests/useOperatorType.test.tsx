import { OPERATORS } from 'constants/queryBuilder';

import { useOperatorType } from '../useOperatorType';

describe('useOperatorType', () => {
	test('should the correct operator type for a given operator', () => {
		expect(useOperatorType(OPERATORS.IN)).toEqual('MULTIPLY_VALUE');
		expect(useOperatorType(OPERATORS.NIN)).toEqual('MULTIPLY_VALUE');
		expect(useOperatorType(OPERATORS.EXISTS)).toEqual('NON_VALUE');
		expect(useOperatorType(OPERATORS.NOT_EXISTS)).toEqual('NON_VALUE');
		expect(useOperatorType(OPERATORS.LT)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.LTE)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.GT)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.GTE)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.LIKE)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.NLIKE)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.EQUALS)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.CONTAINS)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.NOT_EQUALS)).toEqual('SINGLE_VALUE');
		expect(useOperatorType(OPERATORS.NOT_CONTAINS)).toEqual('SINGLE_VALUE');
		expect(useOperatorType('INVALID_OPERATOR')).toEqual('NOT_VALID');
	});
});
