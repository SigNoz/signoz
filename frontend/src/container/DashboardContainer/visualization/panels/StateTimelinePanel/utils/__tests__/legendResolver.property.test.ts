// Feature: state-timeline-panel, Property 7: Legend template resolution
// **Validates: Requirements 7.3**

import * as fc from 'fast-check';

import { resolveLegendTemplate } from '../legendResolver';

/**
 * Arbitrary that generates a valid label key (alphanumeric + underscores,
 * non-empty, no curly braces).
 */
const labelKeyArb = fc.stringMatching(/^[a-z][a-z0-9_]{0,14}$/);

/**
 * Arbitrary that generates a label value (printable string without
 * curly braces to avoid ambiguous template parsing).
 */
const labelValueArb = fc.stringMatching(/^[a-zA-Z0-9_ .,/-]{0,20}$/);

/**
 * Arbitrary that generates a labels record with 1-5 entries.
 */
const labelsArb = fc
	.array(fc.tuple(labelKeyArb, labelValueArb), { minLength: 1, maxLength: 5 })
	.map((entries) => Object.fromEntries(entries));

/**
 * Arbitrary that generates a template string with some matched and some
 * unmatched placeholders, plus literal text.
 */
function templateArb(
	labels: Record<string, string>,
): fc.Arbitrary<string> {
	const keys = Object.keys(labels);

	// Build parts: either a matched placeholder, unmatched placeholder, or literal text
	const matchedPlaceholder = fc.constantFrom(...keys).map((k) => `{{${k}}}`);
	const unmatchedPlaceholder = labelKeyArb
		.filter((k) => !(k in labels))
		.map((k) => `{{${k}}}`);
	const literalText = fc.stringMatching(/^[a-zA-Z0-9_ -]{1,10}$/);

	const partArb = fc.oneof(matchedPlaceholder, unmatchedPlaceholder, literalText);

	return fc
		.array(partArb, { minLength: 1, maxLength: 6 })
		.map((parts) => parts.join(''));
}

describe('resolveLegendTemplate - Property 7: Legend template resolution', () => {
	it('replaces each {{key}} with matching label entry and leaves unmatched placeholders as-is', () => {
		fc.assert(
			fc.property(labelsArb, (labels) =>
				fc.assert(
					fc.property(templateArb(labels), (template) => {
						const result = resolveLegendTemplate(template, labels);

						// All matched keys should be replaced with their values
						for (const [key, value] of Object.entries(labels)) {
							if (template.includes(`{{${key}}}`)) {
								expect(result).toContain(value);
								expect(result).not.toContain(`{{${key}}}`);
							}
						}
					}),
					{ numRuns: 20 },
				),
			),
			{ numRuns: 10 },
		);
	});

	it('unmatched placeholders remain unchanged in the output', () => {
		fc.assert(
			fc.property(
				labelsArb.chain((labels) =>
					fc.tuple(
						fc.constant(labels),
						labelKeyArb.filter((k) => !(k in labels)),
					),
				),
				([labels, unmatchedKey]) => {
					const template = `prefix_{{${unmatchedKey}}}_suffix`;
					const result = resolveLegendTemplate(template, labels);

					expect(result).toContain(`{{${unmatchedKey}}}`);
					expect(result).toBe(`prefix_{{${unmatchedKey}}}_suffix`);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('matched placeholders are fully replaced with the corresponding label value', () => {
		fc.assert(
			fc.property(
				labelsArb.chain((labels) => {
					const keys = Object.keys(labels);
					return fc.tuple(
						fc.constant(labels),
						fc.constantFrom(...keys),
					);
				}),
				([labels, key]) => {
					const template = `before_{{${key}}}_after`;
					const result = resolveLegendTemplate(template, labels);

					expect(result).toBe(`before_${labels[key]}_after`);
					expect(result).not.toContain(`{{${key}}}`);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('templates with no placeholders are returned unchanged', () => {
		fc.assert(
			fc.property(
				fc.stringMatching(/^[a-zA-Z0-9_ .,/-]{0,40}$/),
				labelsArb,
				(template, labels) => {
					const result = resolveLegendTemplate(template, labels);
					expect(result).toBe(template);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('empty labels map leaves all placeholders unchanged', () => {
		fc.assert(
			fc.property(
				fc.array(labelKeyArb, { minLength: 1, maxLength: 4 }),
				(keys) => {
					const template = keys.map((k) => `{{${k}}}`).join('-');
					const result = resolveLegendTemplate(template, {});

					expect(result).toBe(template);
				},
			),
			{ numRuns: 100 },
		);
	});
});
