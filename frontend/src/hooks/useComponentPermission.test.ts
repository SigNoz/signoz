import { renderHook } from '@testing-library/react';
import { ComponentTypes } from 'utils/permission';

import useComponentPermission from './useComponentPermission';

describe('useComponentPermission', () => {
	const componentList: ComponentTypes[] = [
		'current_org_settings',
		'invite_members',
		'create_new_dashboards',
		'import_dashboard',
		'export_dashboard',
		'add_new_alert',
		'add_new_channel',
		'set_retention_period',
		'action',
		'save_layout',
		'edit_dashboard',
		'delete_widget',
		'new_dashboard',
		'new_alert_action',
		'edit_widget',
		'add_panel',
	];

	it('should return correct permissions for ADMIN role', () => {
		const { result } = renderHook(() =>
			useComponentPermission(componentList, 'ADMIN'),
		);
		const expectedResult = [
			true, // current_org_settings
			true, // invite_members
			true, // create_new_dashboards
			true, // import_dashboard
			true, // export_dashboard
			true, // add_new_alert
			true, // add_new_channel
			true, // set_retention_period
			true, // action
			true, // save_layout
			true, // edit_dashboard
			true, // delete_widget
			true, // new_dashboard
			true, // new_alert_action
			true, // edit_widget
			true, // add_panel
		];
		expect(result.current).toEqual(expectedResult);
	});

	it('should return correct permissions for EDITOR role', () => {
		const { result } = renderHook(() =>
			useComponentPermission(componentList, 'EDITOR'),
		);
		const expectedResult = [
			false, // current_org_settings
			false, // invite_members
			true, // create_new_dashboards
			true, // import_dashboard
			true, // export_dashboard
			true, // add_new_alert
			false, // add_new_channel
			false, // set_retention_period
			true, // action
			true, // save_layout
			true, // edit_dashboard
			true, // delete_widget
			true, // new_dashboard
			false, // new_alert_action
			true, // edit_widget
			true, // add_panel
		];
		expect(result.current).toEqual(expectedResult);
	});

	it('should return correct permissions for VIEWER role', () => {
		const { result } = renderHook(() =>
			useComponentPermission(componentList, 'VIEWER'),
		);
		const expectedResult = [
			false, // current_org_settings
			false, // invite_members
			false, // create_new_dashboards
			false, // import_dashboard
			true, // export_dashboard
			false, // add_new_alert
			false, // add_new_channel
			false, // set_retention_period
			false, // action
			false, // save_layout
			false, // edit_dashboard
			false, // delete_widget
			false, // new_dashboard
			false, // new_alert_action
			false, // edit_widget
			false, // add_panel
		];
		expect(result.current).toEqual(expectedResult);
	});
});
