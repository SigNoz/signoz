// Mocks the DOM measurement APIs CodeMirror needs to render in jsdom
// (Range client rects + element bounding rects). Call from a beforeAll in
// specs that render the real CodeMirror editor.
export function mockCodeMirrorDomApis(): void {
	const mockRect: DOMRect = {
		width: 100,
		height: 20,
		top: 0,
		left: 0,
		right: 100,
		bottom: 20,
		x: 0,
		y: 0,
		toJSON: (): DOMRect => mockRect,
	} as DOMRect;

	// Create a minimal Range mock with only what CodeMirror actually uses
	const createMockRange = (): Range => {
		let startContainer: Node = document.createTextNode('');
		let endContainer: Node = document.createTextNode('');
		let startOffset = 0;
		let endOffset = 0;

		const mockRange = {
			// CodeMirror uses these for text measurement
			getClientRects: (): DOMRectList =>
				({
					length: 1,
					item: (index: number): DOMRect | null => (index === 0 ? mockRect : null),
					0: mockRect,
					*[Symbol.iterator](): Generator<DOMRect> {
						yield mockRect;
					},
				}) as unknown as DOMRectList,
			getBoundingClientRect: (): DOMRect => mockRect,
			// CodeMirror calls these to set up text ranges
			setStart: (node: Node, offset: number): void => {
				startContainer = node;
				startOffset = offset;
			},
			setEnd: (node: Node, offset: number): void => {
				endContainer = node;
				endOffset = offset;
			},
			// Minimal Range properties (TypeScript requires these)
			get startContainer(): Node {
				return startContainer;
			},
			get endContainer(): Node {
				return endContainer;
			},
			get startOffset(): number {
				return startOffset;
			},
			get endOffset(): number {
				return endOffset;
			},
			get collapsed(): boolean {
				return startContainer === endContainer && startOffset === endOffset;
			},
			commonAncestorContainer: document.body,
		};
		return mockRange as unknown as Range;
	};

	// Mock document.createRange to return a new Range instance each time
	document.createRange = (): Range => createMockRange();

	// Mock getBoundingClientRect for elements
	Element.prototype.getBoundingClientRect = (): DOMRect => mockRect;
}
