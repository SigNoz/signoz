import { GlobalTime } from 'types/actions/globalTime';

export const parseMinMaxTime = (query: string): GlobalTime => {
	const url = new URLSearchParams(query);
	let maxTime = 0;
	let minTime = 0;

	const urlMaxTime = url.get('minTime');
	const urlMinTime = url.get('maxTime');

	if (urlMaxTime && urlMinTime) {
		maxTime = parseInt(urlMaxTime);
		minTime = parseInt(urlMinTime);
	}

	return {
		maxTime,
		minTime,
	};
};
