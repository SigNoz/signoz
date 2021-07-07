import { pushDStree, span, RefItem } from '../store/actions';
// PNOTE - should the data be taken from redux or only through props? - Directly as arguments

export const spanToTreeUtil = (spanlist: span[]): pushDStree => {
	// Initializing tree. What should be returned is trace is empty? We should have better error handling
	let tree: pushDStree = {
		id: 'empty',
		name: 'default',
		value: 0,
		time: 0,
		startTime: 0,
		tags: [],
		children: [],
	};

	// let spans :spanItem[]= trace.spans;

	if (spanlist) {
		// Create a dict with spanIDs as keys
		// PNOTE
		// Can we now assign different strings as id - Yes
		// https://stackoverflow.com/questions/15877362/declare-and-initialize-a-dictionary-in-typescript

		//May1
		//https://stackoverflow.com/questions/13315131/enforcing-the-type-of-the-indexed-members-of-a-typescript-object

		const mapped_array: { [id: string]: span; } = {};

		for (let i = 0; i < spanlist.length; i++) {
			mapped_array[spanlist[i][1]] = spanlist[i];
			mapped_array[spanlist[i][1]][10] = []; //initialising the 10th element in the span data structure which is array
			//  of type pushDStree
			// console.log('IDs while creating mapped array')
			// console.log(`SpanID is ${spanlist[i][1]}\n`);

		}

		// console.log(`In SpanTreeUtil: mapped_arrayis ${mapped_array}`);


		for (const id in mapped_array) {
			const child_span = mapped_array[id];

			//mapping tags to new structure
			const tags_temp = [];
			if (child_span[7] !== null && child_span[8] !== null) {
				if (
					typeof child_span[7] === 'string' &&
					typeof child_span[8] === 'string'
				) {
					tags_temp.push({ key: child_span[7], value: child_span[8] });
				} else if (child_span[7].length > 0 && child_span[8].length > 0) {
					for (let j = 0; j < child_span[7].length; j++) {
						tags_temp.push({ key: child_span[7][j], value: child_span[8][j] });
					}
				}
			}

			const push_object: pushDStree = {
				id: child_span[1],
				name: child_span[3] + ': ' + child_span[4],
				value: parseInt(child_span[6]),
				time: parseInt(child_span[6]),
				startTime: child_span[0],
				tags: tags_temp,
				children: mapped_array[id][10],
			};
			const referencesArr = mapped_array[id][9];
			let refArray = [];
			if (typeof referencesArr === 'string') {
				refArray.push(referencesArr);
			} else {
				refArray = referencesArr;
			}
			const references: RefItem[] = [];

			refArray.forEach((element) => {
				element = element
					.replaceAll('{', '')
					.replaceAll('}', '')
					.replaceAll(' ', '');
				const arr = element.split(',');
				const refItem = { traceID: '', spanID: '', refType: '' };
				arr.forEach((obj) => {
					const arr2 = obj.split('=');
					if (arr2[0] === 'TraceId') {
						refItem['traceID'] = arr2[1];
					} else if (arr2[0] === 'SpanId') {
						refItem['spanID'] = arr2[1];
					} else if (arr2[0] === 'RefType') {
						refItem['refType'] = arr2[1];
					}
				});

				references.push(refItem);
			});

			if (references.length !== 0 && references[0].spanID.length !== 0) {
				if (references[0].refType === 'CHILD_OF') {
					const parentID = references[0].spanID;
					// console.log(`In SpanTreeUtil: mapped_array[parentID] is ${mapped_array[parentID]}`);

					if (typeof mapped_array[parentID] !== 'undefined') { //checking for undefined [10] issue
						mapped_array[parentID][10].push(push_object);
					} else {
						console.log(`In SpanTreeUtil: mapped_array[parentID] is undefined, parentID is ${parentID}`);
						console.log(`In SpanTreeUtil: mapped_array[parentID] is undefined, mapped_array[parentID] is ${mapped_array[parentID]}`);

					}

				}
			} else {
				tree = push_object;
			}
		} // end of for loop
	} // end of if(spans)

	return tree;
};
