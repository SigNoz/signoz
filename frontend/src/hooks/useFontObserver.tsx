import FontFaceObserver from 'fontfaceobserver';
import { useEffect, useState } from 'react';

export interface FontFace {
	family: string;
	weight?:
		| `light`
		| `normal`
		| `bold`
		| `bolder`
		| `100`
		| `200`
		| `300`
		| `400`
		| `500`
		| `600`
		| `700`
		| `800`
		| `900`;
	style?: `normal` | `italic` | `oblique`;
	stretch?:
		| `normal`
		| `ultra-condensed`
		| `extra-condensed`
		| `condensed`
		| `semi-condensed`
		| `semi-expanded`
		| `expanded`
		| `extra-expanded`
		| `ultra-expanded`;
}

export interface Options {
	testString?: string;
	timeout?: number;
}

export interface Config {
	showErrors: boolean;
}

function useFontFaceObserver(
	fontFaces: FontFace[] = [],
	isEnabled = true,
	{ testString, timeout }: Options = {},
	{ showErrors }: Config = { showErrors: false },
): boolean {
	const [isResolved, setIsResolved] = useState(false);
	const fontFacesString = JSON.stringify(fontFaces);

	useEffect(() => {
		if (isEnabled) {
			const promises = JSON.parse(fontFacesString).map(
				({ family, weight, style, stretch }: FontFace) =>
					new FontFaceObserver(family, {
						weight,
						style,
						stretch,
					}).load(testString, timeout),
			);

			Promise.all(promises).then(() => setIsResolved(true));
		}
	}, [fontFacesString, testString, timeout, showErrors, isEnabled]);

	return isResolved;
}

export default useFontFaceObserver;
