import { fireEvent, render, screen } from '@testing-library/react';

import ResizableBox from '../ResizableBox';

const HANDLE_TEST_ID = 'resize-handle';

describe('ResizableBox', () => {
	it('starts at defaultWidth when initialWidth is omitted', () => {
		render(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);

		const box = screen.getByTestId(HANDLE_TEST_ID).parentElement as HTMLElement;
		expect(box.style.width).toBe('260px');
	});

	it('starts at initialWidth when provided', () => {
		render(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				initialWidth={340}
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);

		const box = screen.getByTestId(HANDLE_TEST_ID).parentElement as HTMLElement;
		expect(box.style.width).toBe('340px');
	});

	it('resets to defaultWidth and fires onResize on double-click when enabled', () => {
		const onResize = jest.fn();
		render(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				initialWidth={480}
				onResize={onResize}
				resetToDefaultOnDoubleClick
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);

		const handle = screen.getByTestId(HANDLE_TEST_ID);
		const box = handle.parentElement as HTMLElement;
		expect(box.style.width).toBe('480px');

		fireEvent.doubleClick(handle);

		expect(box.style.width).toBe('260px');
		expect(onResize).toHaveBeenCalledWith(260);
	});

	it('does nothing on double-click when reset is not enabled', () => {
		const onResize = jest.fn();
		render(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				initialWidth={480}
				onResize={onResize}
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);

		const handle = screen.getByTestId(HANDLE_TEST_ID);
		const box = handle.parentElement as HTMLElement;

		fireEvent.doubleClick(handle);

		expect(box.style.width).toBe('480px');
		expect(onResize).not.toHaveBeenCalled();
	});

	it('renders a visible grip only when withHandle is set', () => {
		const { rerender, container } = render(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);
		expect(container.querySelector('.resizable-box__grip')).toBeNull();

		rerender(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				withHandle
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);
		expect(container.querySelector('.resizable-box__grip')).not.toBeNull();
	});

	it('clamps drag to maxWidth and reports the clamped size via onResize', () => {
		const onResize = jest.fn();
		render(
			<ResizableBox
				handle="right"
				defaultWidth={260}
				minWidth={240}
				maxWidth={500}
				onResize={onResize}
				handleTestId={HANDLE_TEST_ID}
			>
				<div>content</div>
			</ResizableBox>,
		);

		const handle = screen.getByTestId(HANDLE_TEST_ID);
		const box = handle.parentElement as HTMLElement;

		fireEvent.mouseDown(handle, { clientX: 0 });
		fireEvent.mouseMove(document, { clientX: 1000 });
		fireEvent.mouseUp(document);

		expect(box.style.width).toBe('500px');
		expect(onResize).toHaveBeenLastCalledWith(500);
	});
});
