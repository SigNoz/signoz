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

// Provide a global mock for react-router-dom-v5-compat with sensible defaults
jest.mock('react-router-dom-v5-compat', () => {
	const actual = jest.requireActual('react-router-dom-v5-compat');
	return {
		...actual,
		useNavigationType: (): any => 'PUSH',
	};
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

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
