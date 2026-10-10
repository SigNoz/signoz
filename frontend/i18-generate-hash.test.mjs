import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { localeHashKey } = require('./i18-generate-hash.cjs');

test('posix locale paths keep the /lang/namespace cache key', () => {
	assert.equal(localeHashKey('public/locales/en/common.json'), '/en/common');
});

test('windows separators still produce the /lang/namespace cache key', () => {
	assert.equal(localeHashKey('public\\locales\\en\\common.json'), '/en/common');
	assert.equal(
		localeHashKey(
			'C:\\dev\\signoz\\frontend\\public\\locales\\en-US\\common.json',
		),
		'/en-US/common',
	);
});
