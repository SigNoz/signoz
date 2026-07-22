import { downloadFile, getTimestampedFileName } from '../downloadFile';

// jsdom doesn't implement the object-URL APIs; define stubs so jest.spyOn can wrap them.
if (typeof URL.createObjectURL !== 'function') {
	URL.createObjectURL = (): string => '';
}
if (typeof URL.revokeObjectURL !== 'function') {
	URL.revokeObjectURL = (): void => undefined;
}

describe('downloadFile', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('builds a blob anchor, clicks it, and revokes the object URL', () => {
		const click = jest.fn();
		const remove = jest.fn();
		const anchor = {
			href: '',
			download: '',
			click,
			remove,
		} as unknown as HTMLAnchorElement;

		(
			jest.spyOn(document, 'createElement') as unknown as jest.Mock
		).mockReturnValue(anchor);
		const createObjectURL = jest
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:mock');
		const revokeObjectURL = jest.spyOn(URL, 'revokeObjectURL');

		downloadFile('hello', 'export.csv', 'text/csv');

		expect(anchor.download).toBe('export.csv');
		expect(anchor.href).toBe('blob:mock');
		expect(click).toHaveBeenCalledTimes(1);
		expect(createObjectURL).toHaveBeenCalled();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
	});
});

describe('getTimestampedFileName', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('appends a local timestamp between base and extension', () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 6, 8, 14, 32, 5));

		expect(getTimestampedFileName('logs-timeseries', 'csv')).toBe(
			'logs-timeseries-2026-07-08_14-32-05.csv',
		);
	});
});
