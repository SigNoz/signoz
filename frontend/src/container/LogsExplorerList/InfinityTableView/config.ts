/* eslint-disable no-nested-ternary */
import { FontSize } from 'container/OptionsMenu/types';
import { CSSProperties } from 'react';

export const infinityDefaultStyles: CSSProperties = {
	width: '100%',
	overflowX: 'scroll',
	marginTop: '15px',
};

export function getInfinityDefaultStyles(fontSize: FontSize): CSSProperties {
	return {
		width: '100%',
		overflowX: 'scroll',
		marginTop:
			fontSize === FontSize.SMALL
				? '10px'
				: fontSize === FontSize.MEDIUM
				? '12px'
				: '15px',
	};
}
