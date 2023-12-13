import { SelectProps } from 'antd';

export const popupContainer: SelectProps['getPopupContainer'] = (
	trigger,
): HTMLElement => trigger.parentNode;
