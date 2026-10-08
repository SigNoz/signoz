import { findOptionLabel } from '../utils';

describe('findOptionLabel', () => {
	const sectioned = [
		{
			label: 'Lifecycle',
			options: [
				{ label: 'Running', value: 'running' },
				{ label: 'Pending', value: 'pending' },
			],
		},
		{
			label: 'Error status',
			options: [{ label: 'CrashLoopBackOff', value: 'crashloopbackoff' }],
		},
	];

	it('resolves a label nested inside a section', () => {
		expect(findOptionLabel(sectioned, 'crashloopbackoff')).toBe(
			'CrashLoopBackOff',
		);
	});

	it('resolves a label on a flat option list', () => {
		expect(findOptionLabel([{ label: 'Ready', value: 'ready' }], 'ready')).toBe(
			'Ready',
		);
	});

	it('returns undefined for a value no option declares', () => {
		expect(findOptionLabel(sectioned, 'nope')).toBeUndefined();
	});
});

describe('findOptionLabel for overflow tags', () => {
	// The `+N` tooltip and the visible tag both resolve labels this way, so a
	// sectioned list must not fall back to the raw enum value in either.
	it('resolves every value in a sectioned list', () => {
		const sections = [
			{
				label: 'Lifecycle',
				options: [
					{ label: 'Running', value: 'running' },
					{ label: 'ContainerCreating', value: 'containercreating' },
				],
			},
			{
				label: 'Error status',
				options: [
					{ label: 'OOMKilled', value: 'oomkilled' },
					{ label: 'NodeAffinity', value: 'nodeaffinity' },
				],
			},
		];

		const resolved = [
			'running',
			'containercreating',
			'oomkilled',
			'nodeaffinity',
		].map((value) => findOptionLabel(sections, value) ?? value);

		expect(resolved).toStrictEqual([
			'Running',
			'ContainerCreating',
			'OOMKilled',
			'NodeAffinity',
		]);
	});
});
