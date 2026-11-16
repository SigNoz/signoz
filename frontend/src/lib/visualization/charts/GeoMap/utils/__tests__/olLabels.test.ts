import { estimateLabelWidth, LABEL_FONT_SIZE, labelFits } from '../olLabels';

describe('labelFits', () => {
	// A shape 400 × 200 map units.
	const box: [number, number] = [400, 200];

	it('shows a name that fits inside its shape', () => {
		expect(labelFits('Chad', box, 1)).toBe(true);
	});

	it('hides a name wider than its shape at this zoom', () => {
		expect(labelFits('Chad', box, 20)).toBe(false);
	});

	it('shows the same name once zoomed in far enough', () => {
		// Tall, so only the width decides.
		const tall: [number, number] = [400, 4000];
		const resolution = tall[0] / (estimateLabelWidth('Chad') / 0.8);
		expect(labelFits('Chad', tall, resolution * 1.01)).toBe(false);
		expect(labelFits('Chad', tall, resolution * 0.99)).toBe(true);
	});

	it('hides a name in a shape too short for one line of text', () => {
		expect(labelFits('Chad', [400, LABEL_FONT_SIZE], 1)).toBe(false);
	});
});
