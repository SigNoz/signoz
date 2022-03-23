import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

export interface IUseThemeModeReturn {
	isDarkMode: boolean;
}

const useThemeMode = (): IUseThemeModeReturn => {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	return { isDarkMode };
};

export default useThemeMode;
