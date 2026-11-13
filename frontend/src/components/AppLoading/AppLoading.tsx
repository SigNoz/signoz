import { Typography } from '@signozhq/ui/typography';
import get from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { THEME_MODE } from 'hooks/useDarkMode/constant';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import './AppLoading.styles.scss';

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
					<img src={signozBrandLogoUrl} alt="SigNoz" className="brand-logo" />

					<Typography
						variant="label"
						size="large"
						weight="bold"
						color="main"
						as="h2"
						textOverflow="wrap"
					>
						SigNoz
					</Typography>
				</div>

				<div className="brand-tagline">
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						OpenTelemetry-Native Logs, Metrics and Traces in a single pane
					</Typography>
				</div>

				<div className="loader" />
			</div>
		</div>
	);
}

export default AppLoading;
