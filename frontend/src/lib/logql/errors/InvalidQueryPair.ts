export class ErrorInvalidQueryPair extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ErrorInvalidQueryPair';
		Object.setPrototypeOf(this, ErrorInvalidQueryPair.prototype);
	}
}
