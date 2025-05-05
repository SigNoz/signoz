export interface IValidationResult {
	isValid: boolean;
	message: string;
	errors: IDetailedError[];
}

export interface IToken {
	type: number;
	text: string;
	start: number;
	stop: number;
	channel?: number;
}

export interface IQueryPair {
	key: string;
	operator: string;
	value?: string;
	position: {
		keyStart: number;
		keyEnd: number;
		operatorStart: number;
		operatorEnd: number;
		valueStart?: number;
		valueEnd?: number;
	};
	isComplete: boolean; // true if the pair has all three components
}

export interface IQueryContext {
	tokenType: number;
	text: string;
	start: number;
	stop: number;
	currentToken: string;
	isInValue: boolean;
	isInKey: boolean;
	isInOperator: boolean;
	isInFunction: boolean;
	isInConjunction?: boolean;
	isInParenthesis?: boolean;
	keyToken?: string;
	operatorToken?: string;
	valueToken?: string;
	queryPairs?: IQueryPair[];
	currentPair?: IQueryPair | null;
}

export interface IDetailedError {
	message: string;
	line: number;
	column: number;
	offendingSymbol?: string;
	expectedTokens?: string[];
}

export interface ASTNode {
	type: string;
	value?: string;
	children?: ASTNode[];
}
