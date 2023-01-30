import { themeColors } from 'constants/theme';

const positionCss: React.CSSProperties['position'] = 'fixed';

export const spinnerStyles = { position: positionCss, right: '0.5rem' };
export const tooltipStyles = {
	fontSize: '1rem',
	top: '0.313rem',
	position: positionCss,
	right: '0.313rem',
	color: themeColors.errorColor,
};

export const errorTooltipPosition = 'top';

export const overlayStyles: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	position: 'absolute',
};
