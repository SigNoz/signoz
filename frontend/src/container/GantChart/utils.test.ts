import { ITraceTree } from 'types/api/trace/getTraceItem';
import { getNodeById, getSpanPath, getMetaDataFromSpanTree } from './utils';

import sampleTree from './__mocks__/sampleTree.json';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';

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

	it('Get node by children span id', () => {
		const iTraceTree: ITraceTree = sampleTree;
		const node = getNodeById('76ef954c39c6b2a1', iTraceTree);

		expect(node).toBeDefined();
	});

	it('Span Path with random spanId should be empty', () => {
		const iTraceTree: ITraceTree = sampleTree;

		const response = getSpanPath(iTraceTree, '123');

		expect(response.length).toEqual(0);
	});

	it('Span Path with root node as selected', () => {
		const iTraceTree: ITraceTree = sampleTree;

		const rootNodeId = '0a25beb821618f6b';

		const response = getSpanPath(iTraceTree, rootNodeId);

		expect(response.length).toBe(1);
		expect(response[0]).toBe(rootNodeId);
	});

	it('Span Path with first child of root', () => {
		const iTraceTree: ITraceTree = sampleTree;

		const id = '76ef954c39c6b2a1';

		const response = getSpanPath(iTraceTree, id);

		expect(response.length).toBe(2);
		expect(response).toEqual(expect.arrayContaining([id, iTraceTree.id]));
	});

	it('getMetaDataFromSpanTree', () => {
		const iTraceTree: ITraceTree = sampleTree;

		const response = getMetaDataFromSpanTree(iTraceTree);
		const { levels, totalSpans } = response;

		expect(levels).toBe(5);
		expect(totalSpans).toBe(50);
	});
});
