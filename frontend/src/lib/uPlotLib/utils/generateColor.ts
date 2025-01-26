import { Color } from '@signozhq/design-tokens';

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
	if (key === 'SUCCESS') {
		return Color.BG_FOREST_500;
	}
	if (key === 'FAILURE') {
		return Color.BG_CHERRY_500;
	}

	if (key === 'RETRY') {
		return Color.BG_AMBER_400;
	}

	const hashValue = hashFn(key);
	const keys = Object.keys(colorMap);
	const colorIndex = hashValue % keys.length;
	const selectedKey = keys[colorIndex];
	return colorMap[selectedKey];
}
