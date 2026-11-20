export const ANTD_LAYOUT_TEST_ID = 'layout-antd';
export const LOCAL_LAYOUT_TEST_ID = 'layout-local';

export const LAYOUT_PARTS = [
	'root',
	'aside',
	'inner',
	'header',
	'content',
	'footer',
	'side-content',
] as const;

export function layoutPartTestId(prefix: string, part: string): string {
	return `${prefix}-${part}`;
}
