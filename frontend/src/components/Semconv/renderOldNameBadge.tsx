import { ReactNode } from 'react';
import { getSemconvRename } from 'utils/semconv';

import SemconvOldNameBadge from './SemconvOldNameBadge';

const ATTRIBUTE_MAPS = new Set(['attributes', 'resource']);

// A span and a log record hold their attributes in these two maps. A key of
// the same spelling at another depth, for example in a JSON body, is not an
// attribute name.
export function renderOldNameBadge(
	fieldKeyPath: readonly (string | number)[],
): ReactNode {
	if (
		fieldKeyPath.length !== 2 ||
		!ATTRIBUTE_MAPS.has(String(fieldKeyPath[0]))
	) {
		return null;
	}

	const rename = getSemconvRename(String(fieldKeyPath[1]));
	if (!rename || rename.family.kind !== 'attribute') {
		return null;
	}

	return <SemconvOldNameBadge old={rename.old} current={rename.current} />;
}
