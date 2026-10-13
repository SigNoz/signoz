import { interpolateVariables } from '../interpolateVariables';

const variables = {
	env: { value: 'prod' },
	service: { value: ['checkout', 'cart'] },
	count: { value: 3 },
};

describe('interpolateVariables', () => {
	it.each([
		['{{env}}', 'prod'],
		['{{.env}}', 'prod'],
		['[[env]]', 'prod'],
		['$env', 'prod'],
	])('substitutes the %s syntax', (token, expected) => {
		expect(interpolateVariables(`env is ${token}.`, variables)).toBe(
			`env is ${expected}.`,
		);
	});

	it('substitutes a dotted name in the $ syntax', () => {
		const dotted = { 'service.name': { value: 'checkout' } };
		expect(interpolateVariables('svc is $service.name.', dotted)).toBe(
			'svc is checkout.',
		);
	});

	it('leaves $__ macros alone', () => {
		expect(interpolateVariables('every $__interval', variables)).toBe(
			'every $__interval',
		);
	});

	it('joins list values with a comma', () => {
		expect(interpolateVariables('on {{service}}', variables)).toBe(
			'on checkout, cart',
		);
	});

	it('stringifies numeric values', () => {
		expect(interpolateVariables('n={{count}}', variables)).toBe('n=3');
	});

	it('leaves an undefined variable as literal text', () => {
		expect(interpolateVariables('see {{missing}} and $nope', variables)).toBe(
			'see {{missing}} and $nope',
		);
	});

	it('injects values as content, not markup boundaries', () => {
		const hostile = { env: { value: '**bold** <script>x</script>' } };
		expect(interpolateVariables('{{env}}', hostile)).toBe(
			'**bold** <script>x</script>',
		);
	});
});
