import { ReactNode } from 'react';

export type LocalTopNavProps = {
	actions?: ReactNode;
	renderPermissions?: { isDateTimeEnabled: boolean };
};
