import DraggableTableRow from 'components/DraggableTableRow';
import { themeColors } from 'constants/theme';

const positionCss: React.CSSProperties['position'] = 'relative';

export const tableComponents = {
	body: {
		row: DraggableTableRow,
	},
};

export const iconStyle = { color: themeColors.gainsboro, fontSize: '1.5rem' };

export const modalIcon = {
	backgroundColor: themeColors.navyBlue,
	position: positionCss,
	top: '0.625rem',
};

export const modalFooterStyle = {
	display: 'flex',
	gap: '0.5rem',
	marginLeft: '5.875rem',
	alignItems: 'center',
	fontWeight: 400,
	fontSize: '0.875rem',
	lineHeight: '1.25rem',
};

export const modalTitleStyle = {
	fontWeight: 600,
	fontSize: '0.875rem',
	lineHeight: '1rem',
};

export const sublistDataStyle = {
	backgroundColor: themeColors.navyBlue,
	height: '1rem',
	width: '1rem',
	fontSize: '0.75rem',
	lineHeight: '0.813rem',
	fontWeight: 400,
};
