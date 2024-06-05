import dayjs from 'dayjs';

export interface QuantityData {
	metric: string;
	values: [number, number][];
	queryName: string;
	legend: string;
	quantity: number[];
	unit: string;
}

interface DataPoint {
	date: string;
	metric: {
		total: number;
		cost: number;
	};
	trace: {
		total: number;
		cost: number;
	};
	log: {
		total: number;
		cost: number;
	};
}

const formatDate = (timestamp: number): string =>
	dayjs.unix(timestamp).format('MM/DD/YYYY');

const getQuantityData = (
	data: QuantityData[],
	metricName: string,
): QuantityData => {
	const defaultData: QuantityData = {
		metric: metricName,
		values: [],
		queryName: metricName,
		legend: metricName,
		quantity: [],
		unit: '',
	};
	return data.find((d) => d.metric === metricName) || defaultData;
};

const generateCsvData = (quantityData: QuantityData[]): any[] => {
	const convertData = (data: QuantityData[]): DataPoint[] => {
		const metricsData = getQuantityData(data, 'Metrics');
		const tracesData = getQuantityData(data, 'Traces');
		const logsData = getQuantityData(data, 'Logs');

		const timestamps = metricsData.values.map((value) => value[0]);

		return timestamps.map((timestamp, index) => {
			const date = formatDate(timestamp);

			return {
				date,
				metric: {
					total: metricsData.quantity[index] ?? 0,
					cost: metricsData.values[index]?.[1] ?? 0,
				},
				trace: {
					total: tracesData.quantity[index] ?? 0,
					cost: tracesData.values[index]?.[1] ?? 0,
				},
				log: {
					total: logsData.quantity[index] ?? 0,
					cost: logsData.values[index]?.[1] ?? 0,
				},
			};
		});
	};

	const formattedData = convertData(quantityData);

	// Calculate totals
	const totals = formattedData.reduce(
		(acc, dataPoint) => {
			acc.metric.total += dataPoint.metric.total;
			acc.metric.cost += dataPoint.metric.cost;
			acc.trace.total += dataPoint.trace.total;
			acc.trace.cost += dataPoint.trace.cost;
			acc.log.total += dataPoint.log.total;
			acc.log.cost += dataPoint.log.cost;
			return acc;
		},
		{
			metric: { total: 0, cost: 0 },
			trace: { total: 0, cost: 0 },
			log: { total: 0, cost: 0 },
		},
	);

	const csvData = formattedData.map((dataPoint) => ({
		Date: dataPoint.date,
		'Metrics Vol (Mn samples)': dataPoint.metric.total,
		'Metrics Cost ($)': dataPoint.metric.cost,
		'Traces Vol (GBs)': dataPoint.trace.total,
		'Traces Cost ($)': dataPoint.trace.cost,
		'Logs Vol (GBs)': dataPoint.log.total,
		'Logs Cost ($)': dataPoint.log.cost,
	}));

	// Add totals row
	csvData.push({
		Date: 'Total',
		'Metrics Vol (Mn samples)': totals.metric.total,
		'Metrics Cost ($)': totals.metric.cost,
		'Traces Vol (GBs)': totals.trace.total,
		'Traces Cost ($)': totals.trace.cost,
		'Logs Vol (GBs)': totals.log.total,
		'Logs Cost ($)': totals.log.cost,
	});

	return csvData;
};

export default generateCsvData;
