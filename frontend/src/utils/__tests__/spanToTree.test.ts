import { TraceData } from '../fixtures/TraceData';
import { spanToTreeUtil } from '../spanToTree';

describe('utils/spanToTree', () => {
	test('should return a single tree on valid trace data', () => {
		const spanTree = spanToTreeUtil(TraceData);
		expect(spanTree.spanTree).toHaveLength(1);
		expect(spanTree.missingSpanTree).toHaveLength(0);
		expect(spanTree).toMatchSnapshot();
	});
	test('should return a single tree on valid trace data with missing span', () => {
		const MissingTraceData = [...TraceData];
		MissingTraceData.splice(1, 1);

		const spanTree = spanToTreeUtil(MissingTraceData);

		expect(spanTree.spanTree).toHaveLength(1);
		expect(spanTree.missingSpanTree).toHaveLength(1);
		expect(spanTree).toMatchSnapshot();
	});
});
