import { ConfigProvider } from 'antd';
import { ThemeContext, useThemeConfig } from 'hooks/useDarkMode';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import { render } from 'tests/test-utils';

import AntdThemeCssVariables from '../AntdThemeCssVariables';

function ThemedShell(): JSX.Element {
	return (
		<ConfigProvider theme={useThemeConfig()}>
			<AntdThemeCssVariables />
		</ConfigProvider>
	);
}

const readVariable = (name: string): string =>
	document.documentElement.style.getPropertyValue(name);

const renderInTheme = (theme: string): ReturnType<typeof render> =>
	render(
		<ThemeContext.Provider
			value={{
				theme,
				toggleTheme: jest.fn(),
				autoSwitch: false,
				setAutoSwitch: jest.fn(),
				setTheme: jest.fn(),
			}}
		>
			<ThemedShell />
		</ThemeContext.Provider>,
	);

describe('AntdThemeCssVariables', () => {
	it('publishes the dark theme values antd computes', () => {
		renderInTheme(THEME_MODE.DARK);

		expect(readVariable('--antd-font-family')).toBe('Inter');
		expect(readVariable('--antd-font-size')).toBe('13px');
		expect(readVariable('--antd-color-link')).toBe('#4566d6');
		expect(readVariable('--antd-color-link-hover')).toBe('#2e3f7b');
		expect(readVariable('--antd-color-link-active')).toBe('#3a52a8');
		expect(readVariable('--antd-color-text-disabled')).toBe(
			'rgba(255, 255, 255, 0.25)',
		);
		expect(readVariable('--antd-empty-image-opacity')).toBe('0.65');
		expect(readVariable('--antd-empty-simple-border')).toBe('#3d3d41');
		expect(readVariable('--antd-empty-simple-shadow')).toBe('#25262a');
		expect(readVariable('--antd-empty-simple-content')).toBe('#1b1c20');
	});

	it('publishes the light theme values antd computes', () => {
		renderInTheme(THEME_MODE.LIGHT);

		expect(readVariable('--antd-color-link')).toBe('#4e74f8');
		expect(readVariable('--antd-color-link-hover')).toBe('#a1bbff');
		expect(readVariable('--antd-color-link-active')).toBe('#3653d1');
		expect(readVariable('--antd-empty-image-opacity')).toBe('1');
		expect(readVariable('--antd-empty-simple-border')).toBe('#d9d9d9');
		expect(readVariable('--antd-empty-simple-shadow')).toBe('#f5f5f5');
		expect(readVariable('--antd-empty-simple-content')).toBe('#fafafa');
	});

	it('removes its variables on unmount', () => {
		const { unmount } = renderInTheme(THEME_MODE.DARK);
		unmount();

		expect(readVariable('--antd-color-link')).toBe('');
	});
});
