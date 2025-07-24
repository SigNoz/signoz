import './AppLoading.styles.scss';

import { Typography } from 'antd';
import get from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { THEME_MODE } from 'hooks/useDarkMode/constant';

function AppLoading(): JSX.Element {
	// Get theme from localStorage directly to avoid context dependency
	const getThemeFromStorage = (): boolean => {
		try {
			const theme = get(LOCALSTORAGE.THEME);
			return theme !== THEME_MODE.LIGHT; // Return true for dark, false for light
		} catch (error) {
			// If localStorage is not available, default to dark theme
			return true;
		}
	};

	const isDarkMode = getThemeFromStorage();

	return (
		<div className={`app-loading-container ${isDarkMode ? 'dark' : 'lightMode'}`}>
			<div className="perilin-bg" />
			<div className="app-loading-content">
				<div className="brand">
					<img
						src="/Logos/signoz-brand-logo.svg"
						alt="SigNoz"
						className="brand-logo"
					/>

					<Typography.Title level={2} className="brand-title">
						SigNoz
					</Typography.Title>
				</div>

				<div className="brand-tagline">
					<Typography.Text>
						OpenTelemetry-Native Logs, Metrics and Traces in a single pane
					</Typography.Text>
				</div>

				<div className="loader" />
			</div>
		</div>
	);
}

export default AppLoading;
