export const QueryOperatorsSingleVal = {
	GTE: 'GTE',
	GT: 'GT',
	LTE: 'LTE',
	LT: 'LT',
	CONTAINS: 'CONTAINS',
	NCONTAINS: 'NCONTAINS',
};

// list of operators that support only number values
export const NumTypeQueryOperators = {
	GTE: 'GTE',
	GT: 'GT',
	LTE: 'LTE',
	LT: 'LT',
};

// list of operators that support only string values
export const StringTypeQueryOperators = {
	CONTAINS: 'CONTAINS',
	NCONTAINS: 'NCONTAINS',
};

// list of operators that support array values
export const QueryOperatorsMultiVal = {
	IN: 'IN',
	NIN: 'NIN',
};

export const ConditionalOperators = {
	AND: 'AND',
	OR: 'OR',
};

export const QueryTypes = {
	QUERY_KEY: 'QUERY_KEY',
	QUERY_OPERATOR: 'QUERY_OPERATOR',
	QUERY_VALUE: 'QUERY_VALUE',
	CONDITIONAL_OPERATOR: 'CONDITIONAL_OPERATOR',
};

export const ValidTypeValue = (
	op: string,
	value: string | string[],
): boolean => {
	if (!op) return true;
	if (Object.values(NumTypeQueryOperators).includes(op)) {
		if (Array.isArray(value)) return false;
		return !Number.isNaN(Number(value));
	}
	return true;
};

// ValidTypeSequence takes prior, current and next op to confirm
// the proper sequence. For example, if QUERY_VALUE needs to be
// in between QUERY_OPERATOR and (empty or CONDITIONAL_OPERATOR).
export const ValidTypeSequence = (
	prior: string | undefined,
	current: string | undefined,
	next: string | undefined,
): boolean => {
	switch (current) {
		case QueryTypes.QUERY_KEY:
			// query key can have an empty prior
			if (!prior) return true;
			return [QueryTypes.CONDITIONAL_OPERATOR].includes(prior);
		case QueryTypes.QUERY_OPERATOR:
			// empty prior is not allowed
			if (!prior || ![QueryTypes.QUERY_KEY].includes(prior)) return false;
			if (!next || ![QueryTypes.QUERY_VALUE].includes(next)) return false;
			return true;
		case QueryTypes.QUERY_VALUE:
			// empty prior is not allowed
			if (!prior) return false;
			return [QueryTypes.QUERY_OPERATOR].includes(prior);
		case QueryTypes.CONDITIONAL_OPERATOR:
			// empty prior is not allowed
			if (!next) return false;
			return [QueryTypes.QUERY_KEY].includes(next);
		default:
			return false;
	}
};
