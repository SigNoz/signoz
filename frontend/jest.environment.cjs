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

		// Library CSS (antd's runtime styles, CodeMirror's theme, @signozhq/ui's
		// injected modules) stays out of the document, as the app's own stylesheets
		// already do through moduleNameMapper. jsdom matches every rule on each
		// getComputedStyle call, which made a role query take up to half a second.
		// rc-util adds and removes an empty style tag to find its container, so a
		// dropped tag must also be removable.
		const { Node, HTMLStyleElement, document } = this.global;
		for (const method of ['appendChild', 'insertBefore', 'removeChild']) {
			const original = Node.prototype[method];
			Node.prototype[method] = function (node, ...rest) {
				const isDroppedStyle =
					this === document.head &&
					node instanceof HTMLStyleElement &&
					node.parentNode !== this;
				return isDroppedStyle ? node : original.call(this, node, ...rest);
			};
		}
	}
}

module.exports = JSDOMWithRequestEnvironment;
