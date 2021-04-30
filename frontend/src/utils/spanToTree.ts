import { pushDStree, span, RefItem } from "../store/actions";
// PNOTE - should the data be taken from redux or only through props? - Directly as arguments

export const spanToTreeUtil = (spanlist: span[]): pushDStree => {
	// Initializing tree. What should be returned is trace is empty? We should have better error handling
	let tree: pushDStree = {
		id: "empty",
		name: "default",
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

		let mapped_array: { [id: string]: span } = {};

		for (let i = 0; i < spanlist.length; i++) {
			mapped_array[spanlist[i][1]] = spanlist[i];
			mapped_array[spanlist[i][1]][10] = [];
		}

		for (let id in mapped_array) {
			let child_span = mapped_array[id];

			//mapping tags to new structure
			let tags_temp = [];
			if (child_span[7] !== null && child_span[8] !== null) {
				if (
					typeof child_span[7] === "string" &&
					typeof child_span[8] === "string"
				) {
					tags_temp.push({ key: child_span[7], value: child_span[8] });
				} else if (child_span[7].length > 0 && child_span[8].length > 0) {
					for (let j = 0; j < child_span[7].length; j++) {
						tags_temp.push({ key: child_span[7][j], value: child_span[8][j] });
					}
				}
			}

			let push_object: pushDStree = {
				id: child_span[1],
				name: child_span[3] + ": " + child_span[4],
				value: parseInt(child_span[6]),
				time: parseInt(child_span[6]),
				startTime: child_span[0],
				tags: tags_temp,
				children: mapped_array[id][10],
			};
			let referencesArr = mapped_array[id][9];
			let refArray = [];
			if (typeof referencesArr === "string") {
				refArray.push(referencesArr);
			} else {
				refArray = referencesArr;
			}
			let references: RefItem[] = [];

			refArray.forEach((element) => {
				element = element
					.replaceAll("{", "")
					.replaceAll("}", "")
					.replaceAll(" ", "");
				let arr = element.split(",");
				let refItem = { traceID: "", spanID: "", refType: "" };
				arr.forEach((obj) => {
					let arr2 = obj.split("=");
					if (arr2[0] === "TraceId") {
						refItem["traceID"] = arr2[1];
					} else if (arr2[0] === "SpanId") {
						refItem["spanID"] = arr2[1];
					} else if (arr2[0] === "RefType") {
						refItem["refType"] = arr2[1];
					}
				});

				references.push(refItem);
			});

			if (references.length !== 0 && references[0].spanID.length !== 0) {
				if (references[0].refType === "CHILD_OF") {
					let parentID = references[0].spanID;
					mapped_array[parentID][10].push(push_object);
				}
			} else {
				tree = push_object;
			}
		} // end of for loop
	} // end of if(spans)

	return tree;
};
