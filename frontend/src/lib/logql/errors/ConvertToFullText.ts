export class ErrorConvertToFullText extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ErrorConvertToFullText';
		Object.setPrototypeOf(this, ErrorConvertToFullText.prototype);
	}
}
