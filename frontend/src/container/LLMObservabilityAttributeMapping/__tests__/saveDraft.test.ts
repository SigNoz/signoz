import { persistDraft, SaveMutations } from '../saveDraft';
import { DraftGroup, DraftMapper, FieldContext, MapperOperation } from '../types';

function mapper(over: Partial<DraftMapper>): DraftMapper {
	return {
		localId: 'm',
		serverId: 'm',
		name: 'm',
		fieldContext: FieldContext.attribute,
		sources: [
			{ key: 'x', context: FieldContext.attribute, operation: MapperOperation.move },
		],
		enabled: true,
		...over,
	};
}

function group(over: Partial<DraftGroup>): DraftGroup {
	return {
		localId: 'g',
		serverId: 'g',
		name: 'g',
		attributes: [],
		resource: [],
		enabled: true,
		mappers: [],
		...over,
	};
}

interface RecordedCalls {
	createGroup: unknown[];
	updateGroup: [string, unknown][];
	deleteGroup: string[];
	createMapper: [string, unknown][];
	updateMapper: [string, string, unknown][];
	deleteMapper: [string, string][];
}

function makeMutations(): { calls: RecordedCalls; mutations: SaveMutations } {
	const calls: RecordedCalls = {
		createGroup: [],
		updateGroup: [],
		deleteGroup: [],
		createMapper: [],
		updateMapper: [],
		deleteMapper: [],
	};
	const mutations: SaveMutations = {
		createGroup: async (data): Promise<string> => {
			calls.createGroup.push(data);
			return 'new-group-id';
		},
		updateGroup: async (id, data): Promise<void> => {
			calls.updateGroup.push([id, data]);
		},
		deleteGroup: async (id): Promise<void> => {
			calls.deleteGroup.push(id);
		},
		createMapper: async (gid, data): Promise<void> => {
			calls.createMapper.push([gid, data]);
		},
		updateMapper: async (gid, mid, data): Promise<void> => {
			calls.updateMapper.push([gid, mid, data]);
		},
		deleteMapper: async (gid, mid): Promise<void> => {
			calls.deleteMapper.push([gid, mid]);
		},
	};
	return { calls, mutations };
}

describe('persistDraft', () => {
	it('issues the minimal set of create/update/delete calls', async () => {
		const snapshot: DraftGroup[] = [
			group({
				localId: 'g1',
				serverId: 'g1',
				name: 'G1',
				mappers: [
					mapper({ localId: 'm1', serverId: 'm1', name: 'keep' }),
					mapper({ localId: 'mdel', serverId: 'mdel', name: 'del' }),
				],
			}),
			group({ localId: 'g2', serverId: 'g2', name: 'G2' }),
		];

		const draft: DraftGroup[] = [
			group({
				localId: 'g1',
				serverId: 'g1',
				name: 'G1-renamed', // changed -> update
				mappers: [
					mapper({ localId: 'm1', serverId: 'm1', name: 'keep' }), // unchanged
					mapper({ localId: 'local-mapper-x', serverId: null, name: 'fresh' }), // new
				],
			}),
			// g2 removed -> delete
			group({
				localId: 'local-group-y',
				serverId: null,
				name: 'G3',
				mappers: [
					mapper({ localId: 'local-mapper-z', serverId: null, name: 'g3map' }),
				],
			}),
		];

		const { calls, mutations } = makeMutations();
		await persistDraft(snapshot, draft, mutations);

		expect(calls.deleteGroup).toStrictEqual(['g2']);
		expect(calls.updateGroup.map(([id]) => id)).toStrictEqual(['g1']);
		expect(calls.deleteMapper).toStrictEqual([['g1', 'mdel']]);
		// no-op mapper is not updated
		expect(calls.updateMapper).toStrictEqual([]);
		// new group created once, then its mapper created under the returned id
		expect(calls.createGroup).toHaveLength(1);
		const createMapperGroupIds = calls.createMapper.map(([gid]) => gid).sort();
		expect(createMapperGroupIds).toStrictEqual(['g1', 'new-group-id']);
	});

	it('does nothing when the draft equals the snapshot', async () => {
		const snapshot: DraftGroup[] = [group({ localId: 'g1', serverId: 'g1' })];
		const draft: DraftGroup[] = [group({ localId: 'g1', serverId: 'g1' })];

		const { calls, mutations } = makeMutations();
		await persistDraft(snapshot, draft, mutations);

		expect(calls.createGroup).toHaveLength(0);
		expect(calls.updateGroup).toHaveLength(0);
		expect(calls.deleteGroup).toHaveLength(0);
		expect(calls.createMapper).toHaveLength(0);
		expect(calls.updateMapper).toHaveLength(0);
		expect(calls.deleteMapper).toHaveLength(0);
	});
});
