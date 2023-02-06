import { themeColors } from 'constants/theme';

const positionCss: React.CSSProperties['position'] = 'relative';

export const iconStyle = { color: themeColors.gainsboro, fontSize: '1.12rem' };

export const modalIcon = {
	backgroundColor: themeColors.navyBlue,
	position: positionCss,
	top: '0.625rem',
};

export const modalFooterStyle = {
	display: 'flex',
	gap: '0.5rem',
	marginLeft: '0.875rem',
	alignItems: 'center',
};

export const modalTitleStyle = {
	fontStyle: 'normal',
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
};
