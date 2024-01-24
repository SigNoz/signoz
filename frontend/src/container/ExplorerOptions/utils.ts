import { Color } from '@signozhq/design-tokens';

export const getRandomColor = (): Color => {
	const colorKeys = Object.keys(Color) as (keyof typeof Color)[];
	const randomKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
	return Color[randomKey];
};
