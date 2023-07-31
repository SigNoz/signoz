import colorAlpha from 'color-alpha';

type GetAlphaColor = Record<0 | 10 | 25 | 45 | 75 | 100, string>;

const getAlphaColor = (color: string): GetAlphaColor => ({
	0: colorAlpha(color, 0),
	10: colorAlpha(color, 0.1),
	25: colorAlpha(color, 0.25),
	45: colorAlpha(color, 0.45),
	75: colorAlpha(color, 0.75),
	100: colorAlpha(color, 1),
});

export default getAlphaColor;
