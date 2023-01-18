import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const LegendsContainer = styled.div`
	height: 17%;

	* {
		::-webkit-scrollbar {
			width: 0.5rem;
		}
		::-webkit-scrollbar-track {
			background: transparent;
		}
		::-webkit-scrollbar-thumb {
			background: ${themeColors.royalGrey};
			border-radius: 10px;
		}
		::-webkit-scrollbar-thumb:hover {
			background: ${themeColors.matterhornGrey};
		}
	}
`;
