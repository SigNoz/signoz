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
const convertToMs = (timestamp: number, inputFormat: DateInputFormatType) => {
	switch (inputFormat) {
		case 's':
			return timestamp * 1e3;
		case 'ms':
			return timestamp * 1;
		case 'ns':
			return timestamp / 1e6;
	}
};

export const DefaultStepSize = 60;

/**
 *	Returns relevant step size based on given start and end date.
 */
const getStep = ({ start, end, inputFormat = 'ms' }: GetStepInput): number => {
	const startDate = dayjs(convertToMs(Number(start), inputFormat));
	const endDate = dayjs(convertToMs(Number(end), inputFormat));
	const diffDays = Math.abs(endDate.diff(startDate, 'days'));

	if (diffDays > 1) {
		return DefaultStepSize * diffDays;
	}

	return DefaultStepSize;
};

export default getStep;
