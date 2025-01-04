import { faker } from '@faker-js/faker';

export type Trace = {
	spanName: string;
	spanDuration: number;
};
const range = (len: number): number[] => {
	const arr: number[] = [];
	for (let i = 0; i < len; i++) {
		arr.push(i);
	}
	return arr;
};

const newTrace = (): Trace => ({
	spanName: faker.person.firstName(),
	spanDuration: faker.number.int(40),
});

export function makeData(...lens: number[]): Trace[] {
	const makeDataLevel = (depth = 0): Trace[] => {
		const len = lens[depth]!;
		return range(len).map(
			(): Trace => ({
				...newTrace(),
			}),
		);
	};

	return makeDataLevel();
}
