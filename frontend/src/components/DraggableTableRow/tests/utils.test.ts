import { dragHandler, dropHandler } from '../utils';

jest.mock('react-dnd', () => ({
	useDrop: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
	useDrag: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
}));

describe('Utils testing of DraggableTableRow component', () => {
	it('Should dropHandler return true', () => {
		const monitor = {
			isOver: jest.fn().mockReturnValueOnce(true),
		} as never;
		const dropDataTruthy = dropHandler(monitor);

		expect(dropDataTruthy).toStrictEqual({ isOver: true });
	});

	it('Should dropHandler return false', () => {
		const monitor = {
			isOver: jest.fn().mockReturnValueOnce(false),
		} as never;
		const dropDataFalsy = dropHandler(monitor);

		expect(dropDataFalsy).toStrictEqual({ isOver: false });
	});

	it('Should dragHandler return true', () => {
		const monitor = {
			isDragging: jest.fn().mockReturnValueOnce(true),
		} as never;
		const dragDataTruthy = dragHandler(monitor);

		expect(dragDataTruthy).toStrictEqual({ isDragging: true });
	});

	it('Should dragHandler return false', () => {
		const monitor = {
			isDragging: jest.fn().mockReturnValueOnce(false),
		} as never;
		const dragDataFalsy = dragHandler(monitor);

		expect(dragDataFalsy).toStrictEqual({ isDragging: false });
	});
});
