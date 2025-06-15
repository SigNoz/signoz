import './MySettings.styles.scss';

import { Radio, RadioChangeEvent, Switch, Tag } from 'antd';
import logEvent from 'api/common/logEvent';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import { AxiosError } from 'axios';
import { USER_PREFERENCES } from 'constants/userPreferences';
import useThemeMode, { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { Moon, Sun } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { UserPreference } from 'types/api/preferences/preference';
import { showErrorNotification } from 'utils/error';

import TimezoneAdaptation from './TimezoneAdaptation/TimezoneAdaptation';
import UserInfo from './UserInfo';

function MySettings(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { toggleTheme } = useThemeMode();
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { notifications } = useNotifications();

	const [sideNavPinned, setSideNavPinned] = useState(false);

	useEffect(() => {
		if (userPreferences) {
			setSideNavPinned(
				userPreferences.find(
					(preference) => preference.name === USER_PREFERENCES.SIDENAV_PINNED,
				)?.value as boolean,
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userPreferences]);

	const {
		mutate: updateUserPreferenceMutation,
		isLoading: isUpdatingUserPreference,
	} = useMutation(updateUserPreference, {
		onSuccess: () => {
			// No need to do anything on success since we've already updated the state optimistically
		},
		onError: (error) => {
			showErrorNotification(notifications, error as AxiosError);
		},
	});

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
		logEvent('Account Settings: Theme Changed', {
			theme: value,
		});
		setTheme(value);
		toggleTheme();
	};

	const handleSideNavPinnedChange = (checked: boolean): void => {
		logEvent('Account Settings: Sidebar Pinned Changed', {
			pinned: checked,
		});
		// Optimistically update the UI
		setSideNavPinned(checked);

		// Update the context immediately
		const save = {
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: checked,
		};
		updateUserPreferenceInContext(save as UserPreference);

		// Make the API call in the background
		updateUserPreferenceMutation(
			{
				name: USER_PREFERENCES.SIDENAV_PINNED,
				value: checked,
			},
			{
				onError: (error) => {
					// Revert the state if the API call fails
					setSideNavPinned(!checked);
					updateUserPreferenceInContext({
						name: USER_PREFERENCES.SIDENAV_PINNED,
						value: !checked,
					} as UserPreference);
					showErrorNotification(notifications, error as AxiosError);
				},
			},
		);
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
					<div className="user-preference-section-content-item theme-selector">
						<div className="user-preference-section-content-item-title-action">
							Select your theme
							<Radio.Group
								options={themeOptions}
								onChange={handleThemeChange}
								value={theme}
								optionType="button"
								buttonStyle="solid"
								data-testid="theme-selector"
								size="small"
							/>
						</div>

						<div className="user-preference-section-content-item-description">
							Select if SigNoz&apos;s appearance should be light or dark
						</div>
					</div>

					<TimezoneAdaptation />

					<div className="user-preference-section-content-item">
						<div className="user-preference-section-content-item-title-action">
							Keep the primary sidebar always open{' '}
							<Switch
								checked={sideNavPinned}
								onChange={handleSideNavPinnedChange}
								loading={isUpdatingUserPreference}
							/>
						</div>

						<div className="user-preference-section-content-item-description">
							Keep the primary sidebar always open by default, unless collapsed with
							the keyboard shortcut
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default MySettings;
