import ReleaseNoteProps from 'components/ReleaseNote/ReleaseNoteProps';
import ReleaseNote0120 from 'components/ReleaseNote/Releases/ReleaseNote0120';
import React from 'react';
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

const ComponentMap: ComponentMapType[] = [
	{
		match: (
			path: string | undefined,
			version: string,
			userFlags: UserFlags | null,
		): boolean => {
			return (
				userFlags?.ReleaseNote0120Hide !== 'Y' &&
				(path === '/alerts' || path === '/services' || path === '/dashboard') &&
				version.startsWith('v0.12')
			);
		},
		component: ReleaseNote0120,
	},
];

// ReleaseNote prints release specific warnings and notes that
// user needs to be aware of before using the upgraded version.
function ReleaseNote({ path }: ReleaseNoteProps): JSX.Element | null {
	const { userFlags, currentVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const c = ComponentMap.find((item) => {
		return item.match(path, currentVersion, userFlags);
	});

	if (!c) {
		return null;
	}

	return <c.component path={path} release={currentVersion} />;
}

ReleaseNote.defaultProps = {
	path: '',
};

export default ReleaseNote;
