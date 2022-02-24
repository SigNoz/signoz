import { span } from 'store/actions';

export const colors = [
	'#2F80ED',
	'#BB6BD9',
	'#F2994A',
	'#219653',
	'#56CCF2',
	'#F2C94C',
	'#BDBDBD',
];

export const errorColor = '#d32f2f';

export function getRandomNumber(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

const getRandomColor = (): string => {
	const index = parseInt(getRandomNumber(0, colors.length - 1).toString(), 10);
	return colors[index];
};

export const spanServiceNameToColorMapping = (spans: span[]) => {
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
