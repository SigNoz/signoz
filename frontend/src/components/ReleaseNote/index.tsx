import ReleaseNoteProps from 'components/ReleaseNote/ReleaseNoteProps';
import ReleaseNote0120 from 'components/ReleaseNote/Releases/ReleaseNote0120';
import ROUTES from 'constants/routes';
import { useAppContext } from 'providers/App/App';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { UserFlags } from 'types/api/user/setFlags';
import AppReducer from 'types/reducer/app';

interface ComponentMapType {
	match: (
		path: string | undefined,
		version: string,
		userFlags: UserFlags | null,
	) => boolean;
	component: ({ path, release }: ReleaseNoteProps) => JSX.Element | null;
}

const allComponentMap: ComponentMapType[] = [
	{
		match: (
			path: string | undefined,
			version: string,
			userFlags: UserFlags | null,
		): boolean => {
			if (!path) {
				return false;
			}
			const allowedPaths: string[] = [
				ROUTES.LIST_ALL_ALERT,
				ROUTES.APPLICATION,
				ROUTES.ALL_DASHBOARD,
			];

			return (
				userFlags?.ReleaseNote0120Hide !== 'Y' &&
				allowedPaths.includes(path) &&
				version.startsWith('v0.12')
			);
		},
		component: ReleaseNote0120,
	},
];

// ReleaseNote prints release specific warnings and notes that
// user needs to be aware of before using the upgraded version.
function ReleaseNote({ path }: ReleaseNoteProps): JSX.Element | null {
	const { user } = useAppContext();
	const { currentVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const c = allComponentMap.find((item) =>
		item.match(path, currentVersion, user.flags),
	);

	if (!c) {
		return null;
	}

	return <c.component path={path} release={currentVersion} />;
}

ReleaseNote.defaultProps = {
	path: '',
};

export default ReleaseNote;
