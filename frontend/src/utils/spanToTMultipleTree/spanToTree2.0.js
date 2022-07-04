const { cloneDeep } = require('lodash');
const { input ,input_epifi} = require('./spanTreeData.input');

const spanToTreeUtil = (inputSpanList) => {
	const spanList = cloneDeep(inputSpanList);

	const spanMap = {};

	const createTarceRootSpan = (spanReferences) => {
		spanReferences.forEach(({ SpanId }) => {
			if (SpanId && !spanMap[SpanId]) {
				spanMap[SpanId] = {
					id: SpanId,
					references: [],
					children: [],
				};
			}
		});
	};

	spanList.forEach((span) => {
		const spanReferences = getSpanReferences(span[9]);
		const spanObject = {
			id: span[1],
			name: span[4],
			value: parseInt(span[6], 10),
			time: parseInt(span[6], 10),
			startTime: span[0],
			tags: [],
			children: [],
			serviceName: span[3],
			hasError: !!span[11],
			serviceColour: '',
			event: [],
			references: spanReferences,
		};
		spanMap[span[1]] = spanObject;
	});

	for (const [_spanId, spanData] of Object.entries(spanMap)) {
		createTarceRootSpan(spanData.references);
		spanData.references.forEach(({ SpanId: parentSpanId }) => {
			if (spanMap[parentSpanId]) {
				spanData.isProcessed = true;
				spanMap[parentSpanId].children.push(spanData);
			}
		});
	}
	for (const [spanId, spanData] of Object.entries(spanMap)) {
		if (spanData.isProcessed) {
			delete spanMap[spanId];
		}
	}
	console.log(JSON.stringify(spanMap, null, 2));
};

const getSpanReferences = (rawReferences = []) => {
	return rawReferences.map((rawRef) => {
		const refObject = {};
		rawRef
			.replaceAll('{', '')
			.replaceAll('}', '')
			.replaceAll(' ', '')
			.split(',')
			.forEach((rawRefKeyPair) => {
				const splittedKeyPair = rawRefKeyPair.split('=');
				refObject[splittedKeyPair[0]] = splittedKeyPair[1];
			});

		return refObject;
	});
};

// console.log(
// 	getSpanReferences([
// 		'{TraceId=0000000000000000239b2a9c45b2b54d, SpanId=45c5db7ca45cb1e7, RefType=CHILD_OF}',
//         '{TraceId=0000000000000000239b2a9c45b2b54d, SpanId=45c5db7ca45cb1e7, RefType=CHILD_OF}',
// 	]),
// );

spanToTreeUtil(input_epifi);
