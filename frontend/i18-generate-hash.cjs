const crypto = require('crypto');
const fs = require('fs');

function generateChecksum(str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}

// ReactI18 looks up `/${language}/${namespace}`. Keep that key on Windows,
// where glob paths use backslashes and `split('public/locales')` misses.
function localeHashKey(filePath) {
	const normalized = filePath.replace(/\\/g, '/');
	const marker = 'public/locales';
	const index = normalized.lastIndexOf(marker);
	if (index === -1) {
		throw new Error(`Locale file is outside ${marker}: ${filePath}`);
	}
	return normalized.slice(index + marker.length).replace(/\.json$/, '');
}

function writeLocaleHashes() {
	const glob = require('glob');
	const result = {};

	glob.sync('public/locales/**/*.json').forEach((filePath) => {
		const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
		result[localeHashKey(filePath)] = generateChecksum(content);
	});

	fs.writeFileSync('./i18n-translations-hash.json', JSON.stringify(result));
}

if (require.main === module) {
	writeLocaleHashes();
}

module.exports = { localeHashKey };
