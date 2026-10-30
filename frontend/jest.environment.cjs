const { TestEnvironment } = require('jest-environment-jsdom');

/**
 * jsdom plus the fetch `Request` a data router builds for every navigation,
 * which jsdom does not ship. Node's own class is used, except that it keeps the
 * `signal` it is handed: the router passes jsdom's `AbortSignal`, and Node's
 * `Request` rejects one from another realm.
 */
class JSDOMWithRequestEnvironment extends TestEnvironment {
	constructor(config, context) {
		super(config, context);

		this.global.Request = class extends Request {
			constructor(input, { signal, ...init } = {}) {
				super(input, init);
				Object.defineProperty(this, 'signal', { value: signal ?? super.signal });
			}
		};
	}
}

module.exports = JSDOMWithRequestEnvironment;
