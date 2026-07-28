/**
 * jsdom's Blob lacks the modern read methods (arrayBuffer/text). Polyfill via
 * FileReader (which jsdom does implement); guarded, so it no-ops once jsdom
 * catches up. Side-effect module — import it at the top of any test touching
 * Blob contents:
 *
 *   import 'tests/blob-polyfill';
 */

if (typeof Blob.prototype.arrayBuffer === 'undefined') {
	Blob.prototype.arrayBuffer = function arrayBuffer(
		this: Blob,
	): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (): void => resolve(reader.result as ArrayBuffer);
			reader.onerror = (): void => reject(reader.error);
			reader.readAsArrayBuffer(this);
		});
	};
}

if (typeof Blob.prototype.text === 'undefined') {
	Blob.prototype.text = function text(this: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (): void => resolve(reader.result as string);
			reader.onerror = (): void => reject(reader.error);
			reader.readAsText(this);
		});
	};
}

export {};
