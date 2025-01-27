import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
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

interface CsvData {
	Date: string;
	'Metrics Vol (Mn samples)': number;
	'Metrics Cost ($)': number;
	'Traces Vol (GBs)': number;
	'Traces Cost ($)': number;
	'Logs Vol (GBs)': number;
	'Logs Cost ($)': number;
}

const formatDate = (timestamp: number): string =>
	dayjs.unix(timestamp).format(DATE_TIME_FORMATS.US_DATE);

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

	const csvData: CsvData[] = formattedData.map((dataPoint) => ({
		Date: dataPoint.date,
		'Metrics Vol (Mn samples)': parseFloat(dataPoint.metric.total.toFixed(2)),
		'Metrics Cost ($)': parseFloat(dataPoint.metric.cost.toFixed(2)),
		'Traces Vol (GBs)': parseFloat(dataPoint.trace.total.toFixed(2)),
		'Traces Cost ($)': parseFloat(dataPoint.trace.cost.toFixed(2)),
		'Logs Vol (GBs)': parseFloat(dataPoint.log.total.toFixed(2)),
		'Logs Cost ($)': parseFloat(dataPoint.log.cost.toFixed(2)),
	}));

	// Add totals row
	csvData.push({
		Date: 'Total',
		'Metrics Vol (Mn samples)': parseFloat(totals.metric.total.toFixed(2)),
		'Metrics Cost ($)': parseFloat(totals.metric.cost.toFixed(2)),
		'Traces Vol (GBs)': parseFloat(totals.trace.total.toFixed(2)),
		'Traces Cost ($)': parseFloat(totals.trace.cost.toFixed(2)),
		'Logs Vol (GBs)': parseFloat(totals.log.total.toFixed(2)),
		'Logs Cost ($)': parseFloat(totals.log.cost.toFixed(2)),
	});

	return csvData;
};

export default generateCsvData;
