import crypto, { BinaryToTextEncoding } from 'crypto';
import fs from 'fs';
import glob from 'glob';

function generateChecksum(
	str: string,
	algorithm = 'md5',
	encoding: BinaryToTextEncoding = 'hex',
): string {
	return crypto.createHash(algorithm).update(str, 'utf8').digest(encoding);
}

const result: { [key: string]: string } = {};

glob.sync(`public/locales/**/*.json`).forEach((path: string) => {
	const [, lang] = path.split('public/locales');
	const content = fs.readFileSync(path, { encoding: 'utf-8' });
	result[lang.replace('.json', '')] = generateChecksum(content);
});

fs.writeFileSync('./i18n-translations-hash.json', JSON.stringify(result));
