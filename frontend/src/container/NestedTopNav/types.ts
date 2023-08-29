import { ReactNode } from 'react';

export type NestedTopNavProps = {
	actions?: ReactNode;
	renderPermissions?: { isDateTimeEnabled: boolean };
};
