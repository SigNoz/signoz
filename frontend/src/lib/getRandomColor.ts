import { Span } from 'types/api/trace/getTraceItem';

export const colors = [
	'#2F80ED',
	'#BB6BD9',
	'#F2994A',
	'#219653',
	'#56CCF2',
	'#F2C94C',
	'#BDBDBD',
	'#FF6633',
	'#FFB399',
	'#FF33FF',
	'#FFFF99',
	'#00B3E6',
	'#E6B333',
	'#3366E6',
	'#999966',
	'#99FF99',
	'#B34D4D',
	'#80B300',
	'#809900',
	'#E6B3B3',
	'#6680B3',
	'#66991A',
	'#FF99E6',
	'#CCFF1A',
	'#FF1A66',
	'#E6331A',
	'#33FFCC',
	'#66994D',
	'#B366CC',
	'#4D8000',
	'#B33300',
	'#CC80CC',
	'#66664D',
	'#991AFF',
	'#E666FF',
	'#4DB3FF',
	'#1AB399',
	'#E666B3',
];

export const errorColor = '#d32f2f';

export function getRandomNumber(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

const getRandomColor = (): string => {
	const index = parseInt(getRandomNumber(0, colors.length - 1).toString(), 10);
	return colors[index];
};

export const spanServiceNameToColorMapping = (
	spans: Span[],
): { [key: string]: string } => {
	const serviceNameSet = new Set();
	spans.forEach((spanItem) => {
		serviceNameSet.add(spanItem[3]);
	});
	const serviceToColorMap: { [key: string]: string } = {};
	Array.from(serviceNameSet).forEach((serviceName, idx) => {
		serviceToColorMap[`${serviceName}`] = colors[idx % colors.length];
	});
	return serviceToColorMap;
};

export default getRandomColor;
