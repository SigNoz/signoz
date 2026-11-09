import { MouseEvent, ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { TestRouter } from 'tests/router';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from 'utils/getUnstableCurrentSearchParams';

import { useCopySpanLink } from '../useCopySpanLink';

const mockCopy = jest.fn();

jest.mock('react-use', () => ({
	__esModule: true,
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopy],
}));

jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn() },
}));

// The router only knows the stale URL; nuqs has since written ?tab=thread.
const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
	<TestRouter initialRoute="/trace/abc?tab=overview&spanId=old">
		{children}
	</TestRouter>
);

const clickEvent = {
	preventDefault: jest.fn(),
	stopPropagation: jest.fn(),
} as unknown as MouseEvent<HTMLElement>;

describe('useCopySpanLink', () => {
	beforeEach(() => {
		mockCopy.mockClear();
		__setSearchParamsGetterForTest(
			() => new URLSearchParams('tab=thread&spanId=old'),
		);
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('builds the link from the live URL, keeping its tab', () => {
		const { result } = renderHook(() => useCopySpanLink({ span_id: 'new' }), {
			wrapper,
		});

		result.current.onSpanCopy(clickEvent);

		const link = new URL(mockCopy.mock.calls[0][0]);
		expect(link.pathname).toBe('/trace/abc');
		expect(link.searchParams.get('tab')).toBe('thread');
		expect(link.searchParams.get('spanId')).toBe('new');
	});
});
