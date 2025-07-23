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
	valueList?: string[];
	hasNegation?: boolean;
	isMultiValue?: boolean;
	position: {
		keyStart: number;
		keyEnd: number;
		operatorStart: number;
		operatorEnd: number;
		valueStart?: number;
		valueEnd?: number;
		negationStart?: number;
		negationEnd?: number;
	};
	valuesPosition?: {
		start?: number;
		end?: number;
	}[];
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
	isInNegation: boolean;
	isInOperator: boolean;
	isInFunction: boolean;
	isInConjunction?: boolean;
	isInParenthesis?: boolean;
	isInBracketList?: boolean; // For multi-value operators like IN where values are in brackets
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
