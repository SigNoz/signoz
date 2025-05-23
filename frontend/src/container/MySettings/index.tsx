import './MySettings.styles.scss';

import { Button, Radio, RadioChangeEvent, Tag } from 'antd';
import { Logout } from 'api/utils';
import useThemeMode, { useIsDarkMode } from 'hooks/useDarkMode';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import Password from './Password';
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

			<div className="user-info-container">
				<UserInfo />
			</div>

			<div className="password-reset-container">
				<Password />
			</div>

			<TimezoneAdaptation />

			<div className="settings-footer">
				<Button
					type="primary"
					className="periscope-btn primary"
					icon={<LogOut size={14} />}
					onClick={(): void => Logout()}
					data-testid="logout-button"
				>
					Logout
				</Button>
			</div>
		</div>
	);
}

export default MySettings;
