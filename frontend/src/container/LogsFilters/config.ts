import { blue, red } from '@ant-design/colors';

export const RESTRICTED_SELECTED_FIELDS = ['timestamp', 'id'];

// Fields that can be filtered on but not grouped by in the log details view.
export const RESTRICTED_GROUP_BY_FIELDS = ['body', 'trace_id'];

export const ICON_STYLE = {
	PLUS: { color: blue[5] },
	CLOSE: { color: red[5] },
};
