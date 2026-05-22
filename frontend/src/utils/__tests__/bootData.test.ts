export {};

type BootData = typeof import('../bootData');

function loadModule(settings?: object): BootData {
	(window as any).signozBootData =
		settings !== undefined ? { settings } : undefined;
	let mod!: BootData;
	jest.isolateModules(() => {
		// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
		mod = require('../bootData');
	});
	return mod;
}

afterEach(() => {
	delete (window as any).signozBootData;
});

describe('when window.signozBootData is absent', () => {
	it('all sub-objects are defined and empty', () => {
		const { bootSettings } = loadModule();
		expect(bootSettings.sentry).toStrictEqual({});
		expect(bootSettings.posthog).toStrictEqual({});
		expect(bootSettings.pylon).toStrictEqual({});
		expect(bootSettings.appcues).toStrictEqual({});
		expect(bootSettings.roles).toStrictEqual({});
	});

	it('optional fields are undefined', () => {
		const { bootSettings } = loadModule();
		expect(bootSettings.sentry.dsn).toBeUndefined();
		expect(bootSettings.sentry.tunnelUrl).toBeUndefined();
		expect(bootSettings.posthog.key).toBeUndefined();
		expect(bootSettings.pylon.appId).toBeUndefined();
		expect(bootSettings.pylon.identSecret).toBeUndefined();
		expect(bootSettings.appcues.appId).toBeUndefined();
		expect(bootSettings.roles.isRolesDetailEnabled).toBeUndefined();
	});
});

describe('when window.signozBootData.settings is populated', () => {
	it('reads sentry config', () => {
		const { bootSettings } = loadModule({
			sentry: { dsn: 'https://abc@sentry.io/1', tunnelUrl: '/tunnel' },
		});
		expect(bootSettings.sentry.dsn).toBe('https://abc@sentry.io/1');
		expect(bootSettings.sentry.tunnelUrl).toBe('/tunnel');
	});

	it('reads posthog config', () => {
		const { bootSettings } = loadModule({ posthog: { key: 'phk_xxx' } });
		expect(bootSettings.posthog.key).toBe('phk_xxx');
	});

	it('reads pylon config', () => {
		const { bootSettings } = loadModule({
			pylon: { appId: 'pylon-abc', identSecret: 'secret-xyz' },
		});
		expect(bootSettings.pylon.appId).toBe('pylon-abc');
		expect(bootSettings.pylon.identSecret).toBe('secret-xyz');
	});

	it('reads appcues config', () => {
		const { bootSettings } = loadModule({ appcues: { appId: 'appcues-123' } });
		expect(bootSettings.appcues.appId).toBe('appcues-123');
	});

	it('reads roles config', () => {
		const { bootSettings } = loadModule({
			roles: { isRolesDetailEnabled: true },
		});
		expect(bootSettings.roles.isRolesDetailEnabled).toBe(true);
	});

	it('missing sub-namespaces fall back to empty objects', () => {
		const { bootSettings } = loadModule({
			sentry: { dsn: 'https://abc@sentry.io/1' },
		});
		expect(bootSettings.posthog).toStrictEqual({});
		expect(bootSettings.posthog.key).toBeUndefined();
		expect(bootSettings.pylon).toStrictEqual({});
		expect(bootSettings.appcues).toStrictEqual({});
		expect(bootSettings.roles).toStrictEqual({});
	});
});

describe('when window.signozBootData exists but settings is undefined', () => {
	it('all sub-objects are empty', () => {
		(window as any).signozBootData = {};
		let mod!: BootData;
		jest.isolateModules(() => {
			// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
			mod = require('../bootData');
		});
		expect(mod.bootSettings.sentry).toStrictEqual({});
		expect(mod.bootSettings.posthog).toStrictEqual({});
	});
});
