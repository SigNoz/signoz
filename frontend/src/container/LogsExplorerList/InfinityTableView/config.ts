import { CSSProperties } from 'react';
import { FontSize } from 'container/OptionsMenu/types';

export const infinityDefaultStyles: CSSProperties = {
	width: '100%',
	overflowX: 'scroll',
};

export function getInfinityDefaultStyles(_fontSize: FontSize): CSSProperties {
	return {
		width: '100%',
		overflowX: 'scroll',
	};
}
