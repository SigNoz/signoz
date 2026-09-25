import { type ReactNode, useState } from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from 'tests/test-utils';
import { Info } from 'types/api/v1/version/get';

import BottomStrip, {
	BOTTOM_STRIP_HEIGHT,
	BOTTOM_STRIP_HEIGHT_VAR,
	BOTTOM_STRIP_ON_CLASS,
} from '..';
import { useBottomStripStore } from '../store/useBottomStripStore';
import { useBottomStripLeft } from '../useBottomStripLeft';

/** Stands in for a page that puts something on the left of the strip. */
function Page({ children }: { children: ReactNode }): null {
	useBottomStripLeft(children);
	return null;
}

/** A page whose value changes without needing `rerender`. */
function ChangingPage(): JSX.Element {
	const [count, setCount] = useState(600);

	useBottomStripLeft(`${count} traces`);

	return (
		<button type="button" onClick={(): void => setCount(42)}>
			change
		</button>
	);
}

/** A page node that blows up while the strip renders it. */
function Boom(): JSX.Element {
	throw new Error('bad left node');
}

const VERSION = 'v0.134.67';
const versionData: Info = { version: VERSION, ee: 'Y', setupCompleted: true };
const withVersion = { appContextOverrides: { versionData } };

describe('BottomStrip', () => {
	// The store is module level, so it outlives each test.
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('publishes the body class and height property while mounted', () => {
		const { unmount } = render(<BottomStrip />);

		expect(document.body.classList.contains(BOTTOM_STRIP_ON_CLASS)).toBe(true);
		expect(document.body.style.getPropertyValue(BOTTOM_STRIP_HEIGHT_VAR)).toBe(
			`${BOTTOM_STRIP_HEIGHT}px`,
		);

		unmount();

		expect(document.body.classList.contains(BOTTOM_STRIP_ON_CLASS)).toBe(false);
		expect(document.body.style.getPropertyValue(BOTTOM_STRIP_HEIGHT_VAR)).toBe(
			'',
		);
	});

	// The string is whatever the Go build injected, so it is rendered untouched —
	// same as SideNav. Release tags carry the "v", local builds do not.
	it.each([['v0.134.67'], ['main-64f1c2a']])(
		'renders the build version %p exactly as given',
		(version) => {
			const { getByText } = render(<BottomStrip />, undefined, {
				appContextOverrides: {
					versionData: { version, ee: 'Y', setupCompleted: true },
				},
			});

			expect(getByText(version)).toBeInTheDocument();
		},
	);

	it('renders the strip without a version when none is available', () => {
		const { getByTestId } = render(<BottomStrip />, undefined, {
			appContextOverrides: { versionData: null },
		});

		const strip = getByTestId('bottom-strip');

		expect(strip).toBeInTheDocument();
		expect(strip).toHaveTextContent('');
	});

	// `tests/test-utils` builds its wrapper around the first `ui`, so `rerender`
	// re-renders the original tree. These drive change through state and through
	// separate trees instead, which the module-level store lets them share.
	describe('left slot', () => {
		it('shows what the page put there instead of the version', () => {
			render(<Page>600 traces</Page>);
			const { getByText, queryByText } = render(
				<BottomStrip />,
				undefined,
				withVersion,
			);

			expect(getByText('600 traces')).toBeInTheDocument();
			expect(queryByText(VERSION)).not.toBeInTheDocument();
		});

		it('falls back to the version once the page is gone', () => {
			const page = render(<Page>600 traces</Page>);
			const { getByText } = render(<BottomStrip />, undefined, withVersion);

			page.unmount();

			expect(getByText(VERSION)).toBeInTheDocument();
		});

		it('updates when the page changes what it shows', () => {
			render(<ChangingPage />);
			const { getByText, getByRole } = render(
				<BottomStrip />,
				undefined,
				withVersion,
			);

			expect(getByText('600 traces')).toBeInTheDocument();

			fireEvent.click(getByRole('button', { name: 'change' }));

			expect(getByText('42 traces')).toBeInTheDocument();
		});

		it('falls back to the version when the page node throws', () => {
			// React logs the caught error, which is noise here.
			const consoleError = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			render(
				<Page>
					<Boom />
				</Page>,
			);
			const { getByTestId, getByText } = render(
				<BottomStrip />,
				undefined,
				withVersion,
			);

			expect(getByTestId('bottom-strip')).toBeInTheDocument();
			expect(getByText(VERSION)).toBeInTheDocument();

			consoleError.mockRestore();
		});

		it('keeps the new page value when the old page unmounts after it', () => {
			// Navigation order: the next page mounts before the last one unmounts,
			// so without the owner guard the outgoing page wipes the incoming value.
			const pageA = render(<Page>page A</Page>);
			render(<Page>page B</Page>);
			const { getByText } = render(<BottomStrip />, undefined, withVersion);

			pageA.unmount();

			expect(getByText('page B')).toBeInTheDocument();
		});
	});
});
