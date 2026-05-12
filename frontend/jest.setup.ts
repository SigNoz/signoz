/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable object-shorthand */
/* eslint-disable func-names */

/**
 * Adds custom matchers from the react testing library to all tests
 */
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';

import { server } from './src/mocks-server/server';

import './src/styles.scss';
// Establish API mocking before all tests.

// Mock window.matchMedia
window.matchMedia =
	window.matchMedia ||
	function (): any {
		return {
			matches: false,
			addListener: function () {},
			removeListener: function () {},
		};
	};

if (!HTMLElement.prototype.scrollIntoView) {
	HTMLElement.prototype.scrollIntoView = function (): void {};
}

// Patch getComputedStyle to handle CSS parsing errors from @signozhq/* packages.
// These packages inject CSS at import time via style-inject / vite-plugin-css-injected-by-js.
// jsdom's nwsapi cannot parse some of the injected selectors (e.g. Tailwind's :animate-in),
// causing SyntaxErrors during getComputedStyle / getByRole calls.
const _origGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = function (
	elt: Element,
	pseudoElt?: string | null,
): CSSStyleDeclaration {
	try {
		return _origGetComputedStyle.call(window, elt, pseudoElt);
	} catch {
		// Return a minimal CSSStyleDeclaration so callers (testing-library, Radix UI)
		// see the element as visible and without animations.
		return {
			display: '',
			visibility: '',
			opacity: '1',
			animationName: 'none',
			getPropertyValue: () => '',
		} as unknown as CSSStyleDeclaration;
	}
};

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
