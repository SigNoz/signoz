/* eslint-disable no-bitwise */

export function hashFn(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}

	return hash >>> 0;
}

export function generateColor(
	key: string,
	colorMap: Record<string, string>,
): string {
	const hashValue = hashFn(key);
	const keys = Object.keys(colorMap);
	const colorIndex = hashValue % keys.length;
	const selectedKey = keys[colorIndex];
	return colorMap[selectedKey];
}
