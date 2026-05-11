export function hashFn(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}

	return hash >>> 0;
}

export function colorToRgb(color: string): string {
	// Handle hex colors
	const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
	if (hexMatch) {
		return `${parseInt(hexMatch[1], 16)}, ${parseInt(
			hexMatch[2],
			16,
		)}, ${parseInt(hexMatch[3], 16)}`;
	}
	// Handle rgb() colors
	const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(color);
	if (rgbMatch) {
		return `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`;
	}
	return '136, 136, 136';
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
