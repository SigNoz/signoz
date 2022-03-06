import { ITraceTree } from 'types/api/trace/getTraceItem';
import { getNodeById } from './utils';
import sampleTree from './__mocks__/sampleTree.json';
import { expect } from '@jest/globals';

describe('GantChart utils', () => {
	it('Get node as undefined by random id', () => {
		const iTraceTree: ITraceTree = sampleTree;

		const node = getNodeById('123', iTraceTree);

		expect(node).toBe(undefined);
	});

	it('Get node by id', () => {
		const iTraceTree: ITraceTree = sampleTree;

		const node = getNodeById('0a25beb821618f6b', iTraceTree);

		expect(node).toBeDefined();
	});
});
