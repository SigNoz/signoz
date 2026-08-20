import { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { useThemeConfig } from 'hooks/useDarkMode';

/**
 * `useThemeConfig` has to run under `ThemeProvider`, so the antd
 * `ConfigProvider` lives in its own component the way `AppRoutes` does it.
 */
function AntdThemeBridge({ children }: { children: ReactNode }): JSX.Element {
	const themeConfig = useThemeConfig();

	return <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>;
}

export default AntdThemeBridge;
