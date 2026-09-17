import type { Mock } from 'vitest';
import { downloadFile, getTimestampedFileName } from '../downloadFile';

// jsdom doesn't implement the object-URL APIs; define stubs so vi.spyOn can wrap them.
if (typeof URL.createObjectURL !== 'function') {
	URL.createObjectURL = (): string => '';
}
if (typeof URL.revokeObjectURL !== 'function') {
	URL.revokeObjectURL = (): void => undefined;
}

describe('downloadFile', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('builds a blob anchor, clicks it, and revokes the object URL', () => {
		const click = vi.fn();
		const remove = vi.fn();
		const anchor = {
			href: '',
			download: '',
			click,
			remove,
		} as unknown as HTMLAnchorElement;

		(vi.spyOn(document, 'createElement') as unknown as Mock).mockReturnValue(
			anchor,
		);
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:mock');
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');

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
		vi.useRealTimers();
	});

	it('appends a local timestamp between base and extension', () => {
		vi.useFakeTimers().setSystemTime(new Date(2026, 6, 8, 14, 32, 5));

		expect(getTimestampedFileName('logs-timeseries', 'csv')).toBe(
			'logs-timeseries-2026-07-08_14-32-05.csv',
		);
	});
});
