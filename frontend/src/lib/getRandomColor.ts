export const colors = [
	'#F2994A',
	'#56CCF2',
	'#F2C94C',
	'#219653',
	'#2F80ED',
	'#EB5757',
	'#BB6BD9',
	'#BDBDBD',
];

export function getRandomNumber(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

const getRandomColor = (): string => {
	const index = parseInt(getRandomNumber(0, colors.length - 1).toString(), 10);
	return colors[index];
};

export default getRandomColor;
