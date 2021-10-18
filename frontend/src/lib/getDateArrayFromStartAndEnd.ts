import convertIntoEpoc from './covertIntoEpoc';

const getDateArrayFromStartAndEnd = ({
	start,
	end,
}: getDateArrayFromStartAndEndProps): Date[] => {
	const dates: Date[] = [];

	const parsedStart = parseFloat(start);
	const parsedEnd = parseFloat(end);

	let startDate = parseInt(convertIntoEpoc(parsedStart), 10);
	const endDate = parseInt(convertIntoEpoc(parsedEnd), 10);

	while (endDate >= startDate) {
		const newDate = new Date(startDate);

		startDate = startDate + 20000;

		dates.push(newDate);
	}
	return dates;
};

interface getDateArrayFromStartAndEndProps {
	start: string;
	end: string;
}

export default getDateArrayFromStartAndEnd;
