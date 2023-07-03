import dayjs from 'dayjs';

type DateType = number | string;
type DateInputFormatType = 's' | 'ms' | 'ns';

interface GetStepInput {
	start: DateType;
	end: DateType;
	inputFormat: DateInputFormatType;
}

/**
 * Converts given timestamp to ms.
 */
const convertToMs = (
	timestamp: number,
	inputFormat: DateInputFormatType,
): number => {
	switch (inputFormat) {
		case 's':
			return timestamp * 1e3;
		case 'ms':
			return timestamp * 1;
		case 'ns':
			return timestamp / 1e6;
		default: {
			throw new Error('invalid format');
		}
	}
};

export const DefaultStepSize = 60;
export const MaxDataPoints = 300;

/**
 *	Returns relevant step size based on given start and end date.
 */
const getStep = ({ start, end, inputFormat = 'ms' }: GetStepInput): number => {
	const startDate = dayjs(convertToMs(Number(start), inputFormat));
	const endDate = dayjs(convertToMs(Number(end), inputFormat));
	const diffSec = Math.abs(endDate.diff(startDate, 's'));

	let result =
		Math.max(Math.floor(diffSec / MaxDataPoints), DefaultStepSize) ||
		DefaultStepSize;

	result -= result % 60;

	return result;
};

export default getStep;
