import { dragHandler, dropHandler } from '../utils';

jest.mock('react-dnd', () => ({
	useDrop: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
	useDrag: jest.fn().mockImplementation(() => [jest.fn(), jest.fn(), jest.fn()]),
}));

describe('Utils testing of DraggableTableRow component', () => {
	test('Should dropHandler return true', () => {
		const monitor = {
			isOver: jest.fn().mockReturnValueOnce(true),
		} as never;
		const dropDataTruthy = dropHandler(monitor);

		expect(dropDataTruthy).toEqual({ isOver: true });
	});

	test('Should dropHandler return false', () => {
		const monitor = {
			isOver: jest.fn().mockReturnValueOnce(false),
		} as never;
		const dropDataFalsy = dropHandler(monitor);

		expect(dropDataFalsy).toEqual({ isOver: false });
	});

	test('Should dragHandler return true', () => {
		const monitor = {
			isDragging: jest.fn().mockReturnValueOnce(true),
		} as never;
		const dragDataTruthy = dragHandler(monitor);

		expect(dragDataTruthy).toEqual({ isDragging: true });
	});

	test('Should dragHandler return false', () => {
		const monitor = {
			isDragging: jest.fn().mockReturnValueOnce(false),
		} as never;
		const dragDataFalsy = dragHandler(monitor);

		expect(dragDataFalsy).toEqual({ isDragging: false });
	});
});
