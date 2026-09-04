const crypto = require('crypto');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

function generateChecksum(str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}

const result = {};

glob.sync(`public/locales/**/*.json`).forEach((localePath) => {
	const lang = path
		.relative('public/locales', localePath)
		.replace(/\\/g, '/')
		.replace('.json', '');
	const content = fs.readFileSync(localePath, { encoding: 'utf-8' });
	result[`/${lang}`] = generateChecksum(content);
});

fs.writeFileSync('./i18n-translations-hash.json', JSON.stringify(result));
