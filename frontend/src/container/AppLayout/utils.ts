const DEFAULT_TITLE = 'Open source Observability platform | SigNoz';
const SIGNOZ = 'SigNoz';

const SigleRouteMap: { [key: string]: string } = {
	Services: 'services',
};

const convertFirstLetterToCapital = (inputString: string): string =>
	inputString.charAt(0).toUpperCase() + inputString.slice(1);

function getWordAfterFirstSlash(inputString: string): string | undefined {
	const segments = inputString.split('/');
	if (segments.length === 2) {
		return segments[1];
	}
	if (segments.length >= 2) {
		if (!SigleRouteMap[segments[1]]) {
			return segments[2];
		}
		return segments[1];
	}
	return undefined;
}

export function getRouteKey(pathname: string): string {
	const title = getWordAfterFirstSlash(pathname);
	if (title === undefined) {
		return DEFAULT_TITLE;
	}
	return `${convertFirstLetterToCapital(title)} | ${SIGNOZ}`;
}
