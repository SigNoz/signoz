import styled from 'styled-components';

export const TypographyText = styled.span<{
	$isInNin: boolean;
	$isEnabled: boolean;
	$disabled?: boolean;
}>`
	width: ${({ $isInNin }): string => ($isInNin ? '10rem' : 'auto')};
	cursor: ${({ $isEnabled }): string =>
		$isEnabled ? 'not-allowed' : 'pointer'};
	pointer-events: ${({ $isEnabled }): string => ($isEnabled ? 'none' : 'auto')};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	padding-left: 8px;
	${({ $disabled }): string => ($disabled ? 'opacity: 0.6' : '')}
`;
