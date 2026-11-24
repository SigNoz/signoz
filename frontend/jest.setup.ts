/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable object-shorthand */
/* eslint-disable func-names */

/**
 * Adds custom matchers from the react testing library to all tests
 */
import { TextDecoder, TextEncoder } from 'node:util';

import '@testing-library/jest-dom';
import 'jest-styled-components';

import { server } from './src/mocks-server/server';

// Establish API mocking before all tests.

// react-router@7's entry point pulls in its server-runtime cookie signing,
// which builds a TextEncoder at module scope. jsdom ships neither encoder, so
// importing anything from the router throws before a test starts.
Object.assign(globalThis, {
	TextEncoder: globalThis.TextEncoder ?? TextEncoder,
	TextDecoder: globalThis.TextDecoder ?? TextDecoder,
});

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

// jsdom has no elementFromPoint; CodeMirror calls it on mousedown to place the cursor.
if (!document.elementFromPoint) {
	document.elementFromPoint = (): Element | null => null;
}

// jsdom Ranges have no layout; CodeMirror measures text through them on click.
if (!Range.prototype.getClientRects) {
	Range.prototype.getClientRects = (): DOMRectList =>
		document.body.getClientRects();
	Range.prototype.getBoundingClientRect = (): DOMRect =>
		document.body.getBoundingClientRect();
}

// jsdom doesn't implement the Pointer Capture API, which Base UI primitives
// (e.g. @signozhq/ui Slider and ScrollArea) call. Stub them so those components
// can be exercised in tests.
if (!HTMLElement.prototype.hasPointerCapture) {
	HTMLElement.prototype.hasPointerCapture = function (): boolean {
		return false;
	};
}
if (!HTMLElement.prototype.releasePointerCapture) {
	HTMLElement.prototype.releasePointerCapture = function (): void {};
}

// jsdom has no PointerEvent; Base UI Switch constructs one on click.
if (typeof window.PointerEvent === 'undefined') {
	class PointerEventMock extends MouseEvent {
		pointerId: number;
		pointerType: string;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerId = init.pointerId ?? 0;
			this.pointerType = init.pointerType ?? '';
		}
	}
	(window as any).PointerEvent = PointerEventMock;
}

if (typeof window.IntersectionObserver === 'undefined') {
	class IntersectionObserverMock {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
		takeRecords(): IntersectionObserverEntry[] {
			return [];
		}
	}
	(window as any).IntersectionObserver = IntersectionObserverMock;
}

if (typeof window.ResizeObserver === 'undefined') {
	class ResizeObserverMock {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}
	(window as any).ResizeObserver = ResizeObserverMock;
}

if (typeof globalThis.DOMRect === 'undefined') {
	(globalThis as any).DOMRect = class DOMRect {
		x = 0;
		y = 0;
		width = 0;
		height = 0;
		top = 0;
		right = 0;
		bottom = 0;
		left = 0;
		constructor(x = 0, y = 0, width = 0, height = 0) {
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
			this.top = y;
			this.right = x + width;
			this.bottom = y + height;
			this.left = x;
		}
		toJSON(): any {
			return { x: this.x, y: this.y, width: this.width, height: this.height };
		}
		static fromRect(rect?: {
			x?: number;
			y?: number;
			width?: number;
			height?: number;
		}): DOMRect {
			return new DOMRect(rect?.x, rect?.y, rect?.width, rect?.height);
		}
	};
}

jest.mock('@testing-library/user-event', () =>
	jest.requireActual('tests/userEventWithDefaults'),
);

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
