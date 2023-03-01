import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const LegendsContainer = styled.div`
	height: 10%;

	* {
		::-webkit-scrollbar {
			width: 0.3rem;
		}
		::-webkit-scrollbar:horizontal {
			height: 0.3rem;
		}
		::-webkit-scrollbar-track {
			background: transparent;
		}
		::-webkit-scrollbar-thumb {
			background: ${themeColors.royalGrey};
			border-radius: 0.625rem;
		}
		::-webkit-scrollbar-thumb:hover {
			background: ${themeColors.matterhornGrey};
		}
		::-webkit-scrollbar-corner {
			background: transparent;
		}
	}
`;
