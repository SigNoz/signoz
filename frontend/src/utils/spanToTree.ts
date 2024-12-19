/* eslint-disable no-restricted-syntax */
import { cloneDeep } from 'lodash-es';
import { ITraceForest, ITraceTree, Span } from 'types/api/trace/getTraceItem';

const getSpanReferences = (
	rawReferences: string[] = [],
	isChildReference: boolean,
): Record<string, string>[] => {
	let filteredReferences = [];
	if (isChildReference) {
		filteredReferences = rawReferences.filter((value) =>
			value.includes('CHILD_OF'),
		);
	} else {
		filteredReferences = rawReferences.filter(
			(value) => !value.includes('CHILD_OF'),
		);
	}

	return filteredReferences.map((rawRef) => {
		const refObject: Record<string, string> = {};
		rawRef
			.replaceAll('{', '')
			.replaceAll('}', '')
			.replaceAll(' ', '')
			.split(',')
			.forEach((rawRefKeyPair) => {
				const [key, value] = rawRefKeyPair.split('=');
				refObject[key] = value;
			});

		return refObject;
	});
};

// This getSpanTags is migrated from the previous implementation.
const getSpanTags = (spanData: Span): { key: string; value: string }[] => {
	const tags = [];
	if (spanData[7] !== null && spanData[8] !== null) {
		if (typeof spanData[7] === 'string' && typeof spanData[8] === 'string') {
			tags.push({ key: spanData[7], value: spanData[8] });
		} else if (spanData[7].length > 0 && spanData[8].length > 0) {
			for (let j = 0; j < spanData[7].length; j += 1) {
				tags.push({ key: spanData[7][j], value: spanData[8][j] });
			}
		}
	}
	return tags;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const spanToTreeUtil = (inputSpanList: Span[]): ITraceForest => {
	const spanList = cloneDeep(inputSpanList);
	const traceIdSet: Set<string> = new Set();
	const spanMap: Record<string, ITraceTree> = {};

	const createTraceRootSpan = (
		spanReferences: Record<string, string>[],
	): void => {
		spanReferences.forEach(({ SpanId, TraceId }) => {
			traceIdSet.add(TraceId);
			if (SpanId && !spanMap[SpanId]) {
				spanMap[SpanId] = {
					id: SpanId,
					name: `Missing Span (${SpanId})`,
					children: [],
					serviceColour: '',
					serviceName: '',
					startTime: null as never,
					tags: [],
					time: null as never,
					value: null as never,
					isMissing: true,
					statusMessage: '',
					statusCodeString: '',
					spanKind: '',
				};
			}
		});
	};

	spanList.forEach((span) => {
		const childReferences = getSpanReferences(span[9] as string[], true);
		const nonChildReferences = getSpanReferences(span[9] as string[], false);
		const spanObject = {
			id: span[1],
			name: span[4],
			value: parseInt(span[6], 10),
			time: parseInt(span[6], 10),
			startTime: span[0],
			tags: getSpanTags(span),
			children: [],
			serviceName: span[3],
			hasError: !!span[11],
			serviceColour: '',
			event: span[10]?.map((e) => JSON.parse(e || '{}') || {}),
			childReferences,
			nonChildReferences,
			statusMessage: span[12],
			statusCodeString: span[13],
			spanKind: span[14],
		};
		spanMap[span[1]] = spanObject;
	});

	for (const [, spanData] of Object.entries(spanMap)) {
		if (spanData.childReferences) {
			createTraceRootSpan(spanData.childReferences);
			spanData.childReferences.forEach(({ SpanId: parentSpanId }) => {
				if (spanMap[parentSpanId]) {
					spanData.isProcessed = true;
					spanMap[parentSpanId].children.push(spanData);
				}
			});
		}
	}
	for (const [spanId, spanData] of Object.entries(spanMap)) {
		if (spanData.isProcessed) {
			delete spanMap[spanId];
		}
	}

	const spanTree: ITraceTree[] = [];
	const missingSpanTree: ITraceTree[] = [];
	const referencedTraceIds: string[] = Array.from(traceIdSet);
	Object.keys(spanMap).forEach((spanId) => {
		const isRoot = spanMap[spanId].childReferences?.some(
			(refs) => refs.SpanId === '',
		);
		if (isRoot) {
			spanTree.push(spanMap[spanId]);
			return;
		}

		for (const traceId of referencedTraceIds) {
			if (traceId.includes(spanId)) {
				spanTree.push(spanMap[spanId]);
			} else {
				missingSpanTree.push(spanMap[spanId]);
			}
		}
	});

	return {
		spanTree,
		missingSpanTree,
	};
};
