import { QueryData } from 'types/api/widgets/getQuery';

// Sorting the series data in desending matter for plotting cummulative bar chart.
export const getSortedSeriesData = (
	result: QueryData[] | undefined,
): QueryData[] => {
	const seriesList = result || [];

	return seriesList.sort((a, b) => {
		if (a.values.length === 0) return 1;
		if (b.values.length === 0) return -1;
		const avgA =
			a.values.reduce((acc, curr) => acc + parseFloat(curr[1]), 0) /
			a.values.length;
		const avgB =
			b.values.reduce((acc, curr) => acc + parseFloat(curr[1]), 0) /
			b.values.length;
		return avgB - avgA;
	});
};
