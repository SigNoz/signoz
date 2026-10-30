const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateChecksum(str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}

const localesDir = 'public/locales';
const result = {};

fs
	.readdirSync(localesDir, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
	.forEach((entry) => {
		const file = path.join(entry.parentPath, entry.name);
		const content = fs.readFileSync(file, { encoding: 'utf-8' });
		const key = path.relative(localesDir, file).replace(/\.json$/, '');
		result[`/${key}`] = generateChecksum(content);
	});

fs.writeFileSync('./i18n-translations-hash.json', JSON.stringify(result));
