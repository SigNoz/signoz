import {
	SEMCONV_FAMILIES,
	SemconvFamily,
} from 'constants/generated/semconvFamilies.gen';

export type SemconvRename = {
	old: string;
	current: string;
	family: SemconvFamily;
};

const OLD_NAMES = SEMCONV_FAMILIES.flatMap((family) =>
	family.old.map((old) => ({ old, current: family.current, family })),
);

const OLD_NAME_INDEX = new Map(OLD_NAMES.map((rename) => [rename.old, rename]));

export function getSemconvRename(name: string): SemconvRename | undefined {
	return OLD_NAME_INDEX.get(name);
}

export function findOldSemconvNames(text: string): SemconvRename[] {
	if (!text) {
		return [];
	}

	return OLD_NAMES.filter(({ old }) => containsSemconvName(text, old));
}

function containsSemconvName(text: string, name: string): boolean {
	let offset = 0;
	while (offset < text.length) {
		const index = text.indexOf(name, offset);
		if (index === -1) {
			return false;
		}
		const before = index === 0 ? '' : text[index - 1];
		const afterIndex = index + name.length;
		const after = afterIndex === text.length ? '' : text[afterIndex];
		if (!isSemconvNameCharacter(before) && !isSemconvNameCharacter(after)) {
			return true;
		}
		offset = index + 1;
	}
	return false;
}

function isSemconvNameCharacter(value: string): boolean {
	return /[A-Za-z0-9_.-]/.test(value);
}
