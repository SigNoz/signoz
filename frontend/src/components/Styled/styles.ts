import { css, FlattenSimpleInterpolation } from 'styled-components';

const cssProprty = (key: string, value: any): FlattenSimpleInterpolation =>
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
	${cssProprty('flex-direction', flexDirection)}
	${cssProprty('flex', flex)}
`;

interface IDisplayProps {
	display?: string;
}
export const Display = ({
	display,
}: IDisplayProps): FlattenSimpleInterpolation => css`
	${cssProprty('display', display)}
`;

interface ISpacingProps {
	margin?: string;
	padding?: string;
}
export const Spacing = ({
	margin,
	padding,
}: ISpacingProps): FlattenSimpleInterpolation => css`
	${cssProprty('margin', margin)}
	${cssProprty('padding', padding)}
`;
