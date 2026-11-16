import { toast } from '@signozhq/ui/sonner';
import {
	holdUnsavedChanges,
	useUnsavedChangesStore,
} from 'store/unsavedChanges/unsavedChangesStore';
import { getCurrentLocation, navigate } from 'lib/router/navigation';
import { rest, server } from 'mocks-server/server';
import { act, fireEvent, render, waitFor } from 'tests/test-utils';
import { Info } from 'types/api/v1/version/get';
import { consumeAppReload, markAppReload, reloadApp } from 'utils/appReload';

import { NEW_VERSION_TOAST_ID } from '../constants';
import NewVersionPrompt from '../NewVersionPrompt';
import {
	reportServerVersion,
	SERVER_VERSION_HEADER,
	useAppVersionStore,
} from 'store/appVersion/appVersionStore';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { info: jest.fn(), loading: jest.fn() },
}));

jest.mock('utils/appReload', () => ({
	...jest.requireActual('utils/appReload'),
	reloadApp: jest.fn(),
}));

const VERSION_ENDPOINT = '*/api/v1/version';
const BUNDLE_VERSION = 'v0.100.0';
const NEW_VERSION = 'v0.101.0';

const expectRefreshPrompt = (): void => {
	expect(toast.info).toHaveBeenCalledTimes(1);
	expect(toast.info).toHaveBeenCalledWith(
		'A new version of SigNoz is available',
		expect.objectContaining({
			id: NEW_VERSION_TOAST_ID,
			description: 'It loads when you open another page.',
			duration: Infinity,
			action: expect.objectContaining({ label: 'Refresh' }),
		}),
	);
};

describe('NewVersionPrompt', () => {
	const originalVersion = process.env.VERSION;
	let servedVersion: string;
	let versionRequests: number;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.VERSION = BUNDLE_VERSION;
		useAppVersionStore.setState({ isNewVersionAvailable: false });
		useUnsavedChangesStore.setState({ count: 0 });
		consumeAppReload();

		servedVersion = BUNDLE_VERSION;
		versionRequests = 0;
		server.use(
			rest.get(VERSION_ENDPOINT, (_req, res, ctx) => {
				versionRequests += 1;
				const body: Info = { version: '', ee: 'Y', setupCompleted: true };
				return res(ctx.set(SERVER_VERSION_HEADER, servedVersion), ctx.json(body));
			}),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	afterAll(() => {
		process.env.VERSION = originalVersion;
	});

	it('prompts to refresh once the server runs a different build than the tab', async () => {
		render(<NewVersionPrompt />);
		await waitFor(() => expect(versionRequests).toBe(1));
		expect(toast.info).not.toHaveBeenCalled();

		servedVersion = NEW_VERSION;
		fireEvent.focus(window);

		await waitFor(expectRefreshPrompt);
	});

	it('stays quiet while the server runs the same build or either version is unknown', () => {
		reportServerVersion(BUNDLE_VERSION);
		reportServerVersion('');
		process.env.VERSION = '';
		reportServerVersion(NEW_VERSION);

		expect(useAppVersionStore.getState().isNewVersionAvailable).toBe(false);
	});

	it('waits until unsaved changes are saved or discarded', () => {
		render(<NewVersionPrompt />);

		let releaseUnsavedChanges = (): void => undefined;
		act(() => {
			releaseUnsavedChanges = holdUnsavedChanges();
			reportServerVersion(NEW_VERSION);
		});
		expect(toast.info).not.toHaveBeenCalled();

		act(() => releaseUnsavedChanges());
		expectRefreshPrompt();
	});

	it('opens the next page with a full page load once a new version is out', () => {
		render(<NewVersionPrompt />, undefined, { initialRoute: '/home' });
		act(() => reportServerVersion(NEW_VERSION));

		act(() => navigate('/home?search=cpu'));
		expect(reloadApp).not.toHaveBeenCalled();
		expect(getCurrentLocation().search).toBe('?search=cpu');

		act(() => navigate('/dashboard'));
		expect(toast.loading).toHaveBeenCalledWith(
			'Loading the latest version of SigNoz',
			expect.objectContaining({ id: NEW_VERSION_TOAST_ID }),
		);
		expect(reloadApp).toHaveBeenCalledWith(
			{ reason: 'navigation', detail: '/dashboard' },
			'/dashboard',
		);
		expect(getCurrentLocation().pathname).toBe('/home');
	});

	it('says SigNoz was updated when the reload landed on a new build', () => {
		process.env.VERSION = 'v0.099.0';
		markAppReload({ reason: 'navigation', detail: '/dashboard' });
		process.env.VERSION = BUNDLE_VERSION;

		render(<NewVersionPrompt />);

		expect(toast.info).toHaveBeenCalledWith('SigNoz was updated', {
			description: 'The page reloaded to load the latest version.',
		});
		expect(consumeAppReload()).toBeNull();
	});

	it('says part of the page failed to load when the reload kept the same build', () => {
		markAppReload({
			reason: 'chunk-load-failed',
			detail: 'Failed to fetch dynamically imported module: /assets/Home.js',
		});

		render(<NewVersionPrompt />);

		expect(toast.info).toHaveBeenCalledWith('The page reloaded', {
			description: 'Part of the page failed to load.',
		});
	});
});
