import { render } from 'tests/test-utils';

import BottomStrip, {
	BOTTOM_STRIP_HEIGHT,
	BOTTOM_STRIP_HEIGHT_VAR,
	BOTTOM_STRIP_ON_CLASS,
} from '..';

describe('BottomStrip', () => {
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
			const { getByTestId } = render(<BottomStrip />, undefined, {
				appContextOverrides: {
					versionData: { version, ee: 'Y', setupCompleted: true },
				},
			});

			expect(getByTestId('bottom-strip-version')).toHaveTextContent(version);
		},
	);

	it('renders the strip without a version when none is available', () => {
		const { getByTestId, queryByTestId } = render(<BottomStrip />, undefined, {
			appContextOverrides: { versionData: null },
		});

		expect(getByTestId('bottom-strip')).toBeInTheDocument();
		expect(queryByTestId('bottom-strip-version')).not.toBeInTheDocument();
	});
});
