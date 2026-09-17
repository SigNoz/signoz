import { dragHandler, dropHandler } from '../utils';

vi.mock('react-dnd', () => ({
	useDrop: vi.fn().mockImplementation(() => [vi.fn(), vi.fn(), vi.fn()]),
	useDrag: vi.fn().mockImplementation(() => [vi.fn(), vi.fn(), vi.fn()]),
}));

describe('Utils testing of DraggableTableRow component', () => {
	it('Should dropHandler return true', () => {
		const monitor = {
			isOver: vi.fn().mockReturnValueOnce(true),
		} as never;
		const dropDataTruthy = dropHandler(monitor);

		expect(dropDataTruthy).toStrictEqual({ isOver: true });
	});

	it('Should dropHandler return false', () => {
		const monitor = {
			isOver: vi.fn().mockReturnValueOnce(false),
		} as never;
		const dropDataFalsy = dropHandler(monitor);

		expect(dropDataFalsy).toStrictEqual({ isOver: false });
	});

	it('Should dragHandler return true', () => {
		const monitor = {
			isDragging: vi.fn().mockReturnValueOnce(true),
		} as never;
		const dragDataTruthy = dragHandler(monitor);

		expect(dragDataTruthy).toStrictEqual({ isDragging: true });
	});

	it('Should dragHandler return false', () => {
		const monitor = {
			isDragging: vi.fn().mockReturnValueOnce(false),
		} as never;
		const dragDataFalsy = dragHandler(monitor);

		expect(dragDataFalsy).toStrictEqual({ isDragging: false });
	});
});
