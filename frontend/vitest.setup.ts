import './vitest.process-shim';

import { server } from './src/mocks-server/server';

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

import './src/styles.scss';

// `findBy*` waits 1s by default, which is not enough while several browser-mode
// pages render in parallel. It is independent of vitest's own test timeout.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() =>
	server.start({
		quiet: true,
		onUnhandledRequest: 'bypass',
		serviceWorker: { url: '/mockServiceWorker.js' },
	}),
);
afterEach(() => server.resetHandlers());
afterAll(() => server.stop());
