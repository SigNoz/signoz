import {
	PayloadProps,
	QueryEndpointData,
} from 'types/api/metrics/getQueryEndpoint';

const RetrievePayloadValues = (
	payload: PayloadProps,
	minMaxTime: SelectedTime,
): QueryEndpointData[] => {
	const payloadValues = payload.result;
	const start = minMaxTime.start;
	const end = minMaxTime.end;

	const generateEmptyValues = (): [number, string][] => {
		const dates: [number, string][] = [];
		const parsedStart = parseInt(start, 10);
		const parsedEnd = parseInt(end, 10);

		let startTime = parsedStart;
		const endTime = parsedEnd;

		while (endTime >= startTime) {
			dates.push([startTime, '0']);
			startTime = startTime + 60;
		}

		return dates;
	};

	if (payloadValues.length == 0) {
		const fooValues: [number, string][] = [];
		let fooData = {
			metric: undefined,
			values: fooValues,
		};

		fooData.values = generateEmptyValues();
		return [fooData];
	}

	return payloadValues;
};

interface SelectedTime {
	start: string;
	end: string;
}

export default RetrievePayloadValues;
