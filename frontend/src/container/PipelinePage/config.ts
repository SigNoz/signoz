import { themeColors } from 'constants/theme';

const positionCss: React.CSSProperties['position'] = 'relative';

export const iconStyle = { color: themeColors.gainsboro, fontSize: '1.12rem' };

export const ListiconStyle = {
	backgroundColor: themeColors.navyBlue,
	fontSize: '14px',
};

export const modalIconStyle = {
	backgroundColor: themeColors.navyBlue,
};

export const modalIcon = {
	backgroundColor: themeColors.navyBlue,
	position: positionCss,
	top: '10px',
};

export const deleteModalDescriptionStyle = {
	fontWeight: 400,
	fontStyle: 'normal',
	fontSize: '12px',
};

export const modalFooterStyle = {
	display: 'flex',
	gap: '8px',
	marginLeft: '15px',
	alignItems: 'center',
};

export const modalTitleStyle = {
	fontStyle: 'normal',
	fontWeight: 600,
	fontSize: '14px',
	lineHeight: '22px',
};

export const sublistDataStyle = {
	backgroundColor: themeColors.navyBlue,
	height: '22px',
	width: '22px',
};

export const modalFooterTitle = {
	fontStyle: 'normal',
	fontWeight: 400,
	fontSize: '12px',
	lineHeight: '20px',
};
