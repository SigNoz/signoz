import { css, FlattenSimpleInterpolation } from 'styled-components';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cssProperty = (key: any, value: any): FlattenSimpleInterpolation =>
	key &&
	value &&
	css`
		${key}: ${value};
	`;

interface IFlexProps {
	flexDirection?: string; // Need to replace this with exact css props. Not able to find any :(
	flex?: number | string;
}
export const Flex = ({
	flexDirection,
	flex,
}: IFlexProps): FlattenSimpleInterpolation => css`
	${cssProperty('flex-direction', flexDirection)}
	${cssProperty('flex', flex)}
`;

interface IDisplayProps {
	display?: string;
}
export const Display = ({
	display,
}: IDisplayProps): FlattenSimpleInterpolation => css`
	${cssProperty('display', display)}
`;

interface ISpacingProps {
	margin?: string;
	padding?: string;
}
export const Spacing = ({
	margin,
	padding,
}: ISpacingProps): FlattenSimpleInterpolation => css`
	${cssProperty('margin', margin)}
	${cssProperty('padding', padding)}
`;
