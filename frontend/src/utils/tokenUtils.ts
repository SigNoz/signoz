import FilterQueryLexer from 'parser/FilterQueryLexer';

export function isKeyToken(tokenType: number): boolean {
	return tokenType === FilterQueryLexer.KEY;
}

// Helper function to check if a token is an operator
export function isOperatorToken(tokenType: number): boolean {
	return [
		FilterQueryLexer.EQUALS,
		FilterQueryLexer.NOT_EQUALS,
		FilterQueryLexer.NEQ,
		FilterQueryLexer.LT,
		FilterQueryLexer.LE,
		FilterQueryLexer.GT,
		FilterQueryLexer.GE,
		FilterQueryLexer.LIKE,
		FilterQueryLexer.NOT_LIKE,
		FilterQueryLexer.ILIKE,
		FilterQueryLexer.NOT_ILIKE,
		FilterQueryLexer.BETWEEN,
		FilterQueryLexer.EXISTS,
		FilterQueryLexer.REGEXP,
		FilterQueryLexer.CONTAINS,
		FilterQueryLexer.IN,
		FilterQueryLexer.NOT,
	].includes(tokenType);
}

// Helper function to check if a token is a value
export function isValueToken(tokenType: number): boolean {
	return [
		FilterQueryLexer.QUOTED_TEXT,
		FilterQueryLexer.NUMBER,
		FilterQueryLexer.BOOL,
		FilterQueryLexer.KEY,
	].includes(tokenType);
}

// Helper function to check if a token is a conjunction
export function isConjunctionToken(tokenType: number): boolean {
	return [FilterQueryLexer.AND, FilterQueryLexer.OR].includes(tokenType);
}

// Helper function to check if a token is a bracket
export function isBracketToken(tokenType: number): boolean {
	return [
		FilterQueryLexer.LPAREN,
		FilterQueryLexer.RPAREN,
		FilterQueryLexer.LBRACK,
		FilterQueryLexer.RBRACK,
	].includes(tokenType);
}

// Helper function to check if an operator typically uses bracket values (multi-value operators)
export function isMultiValueOperator(operatorToken?: string): boolean {
	if (!operatorToken) return false;

	const upperOp = operatorToken.toUpperCase();
	return upperOp === 'IN' || upperOp === 'NOT IN';
}

export function isFunctionToken(tokenType: number): boolean {
	return [
		FilterQueryLexer.HAS,
		FilterQueryLexer.HASANY,
		FilterQueryLexer.HASALL,
		FilterQueryLexer.HASNONE,
	].includes(tokenType);
}
