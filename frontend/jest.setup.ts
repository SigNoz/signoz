/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable object-shorthand */
/* eslint-disable func-names */

/**
 * Adds custom matchers from the react testing library to all tests
 */
import '@testing-library/jest-dom';
import 'jest-styled-components';
import './src/styles.scss';

import { server } from './src/mocks-server/server';
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

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
