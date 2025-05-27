import './MySettings.styles.scss';

import { Radio, RadioChangeEvent, Tag } from 'antd';
import useThemeMode, { useIsDarkMode } from 'hooks/useDarkMode';
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import TimezoneAdaptation from './TimezoneAdaptation/TimezoneAdaptation';
import UserInfo from './UserInfo';

function MySettings(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { toggleTheme } = useThemeMode();

	const themeOptions = [
		{
			label: (
				<div className="theme-option">
					<Moon data-testid="dark-theme-icon" size={12} /> Dark{' '}
				</div>
			),
			value: 'dark',
		},
		{
			label: (
				<div className="theme-option">
					<Sun size={12} data-testid="light-theme-icon" /> Light{' '}
					<Tag bordered={false} color="geekblue">
						Beta
					</Tag>
				</div>
			),
			value: 'light',
		},
	];

	const [theme, setTheme] = useState(isDarkMode ? 'dark' : 'light');

	const handleThemeChange = ({ target: { value } }: RadioChangeEvent): void => {
		setTheme(value);
		toggleTheme();
	};

	return (
		<div className="my-settings-container">
			<div className="user-info-section">
				<div className="user-info-section-header">
					<div className="user-info-section-title">General </div>

					<div className="user-info-section-subtitle">
						Manage your account settings.
					</div>
				</div>

				<div className="user-info-container">
					<UserInfo />
				</div>
			</div>

			<div className="user-preference-section">
				<div className="user-preference-section-header">
					<div className="user-preference-section-title">User Preferences</div>

					<div className="user-preference-section-subtitle">
						Tailor the SigNoz console to work according to your needs.
					</div>
				</div>

				<div className="user-preference-section-content">
					<div className="theme-selector">
						<Radio.Group
							options={themeOptions}
							onChange={handleThemeChange}
							value={theme}
							optionType="button"
							buttonStyle="solid"
							data-testid="theme-selector"
						/>
					</div>

					<TimezoneAdaptation />
				</div>
			</div>
		</div>
	);
}

export default MySettings;
