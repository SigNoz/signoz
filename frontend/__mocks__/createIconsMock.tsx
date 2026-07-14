import React from 'react';

const IconMock = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
	(props, ref) => <svg ref={ref} {...props} />,
);
IconMock.displayName = 'IconMock';

// Returns a Proxy that resolves any named export to IconMock by default,
// so `import { AnyIcon } from '@signozhq/icons'` always returns a valid component.
// Pass `overrides` to swap in test-specific stubs (e.g. icons with data-testid).
export function createIconsMock(
	overrides: Record<string, unknown> = {},
): Record<string | symbol, unknown> {
	return new Proxy(
		{ __esModule: true, default: IconMock, ...overrides } as Record<
			string | symbol,
			unknown
		>,
		{
			get(target, prop: string | symbol): unknown {
				if (prop in target) {
					return target[prop as string];
				}
				return IconMock;
			},
		},
	);
}
