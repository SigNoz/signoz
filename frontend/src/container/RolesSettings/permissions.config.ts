import { Bot, Key, Shield } from '@signozhq/icons';

import permissionsType from 'hooks/useAuthZ/permissions.type';
import {
	AuthZResource,
	AuthZVerb,
	OBJECT_SCOPED_VERBS,
	ObjectScopedVerb,
} from 'hooks/useAuthZ/types';
import { CoretypesTypeDTO } from 'api/generated/services/sigNoz.schemas';

/** Shared shape of the icon components exported by `@signozhq/icons`. */
type IconComponent = typeof Shield;

const OBJECT_SCOPED_VERB_SET = new Set<string>(OBJECT_SCOPED_VERBS);

export interface ResourcePanelConfig {
	label: string;
	description: string;
	icon: IconComponent;
	selectorPlaceholder: string;
	docsAnchor: string;
}

/**
 * Do not use CoretypesTypeDTO to represent this,
 * we want to add resource panel configs for only types we actually are using,
 * not all of them
 */
export const RESOURCE_PANELS: Record<AuthZResource, ResourcePanelConfig> = {
	'factor-api-key': {
		label: 'API Keys',
		description: 'Programmatic access tokens for the workspace.',
		icon: Key,
		selectorPlaceholder: 'Type API key ID, separate multiple with comma or space',
		docsAnchor: 'factor-api-key',
	},
	role: {
		label: 'Roles',
		description: 'Custom and managed roles and their assignments.',
		icon: Shield,
		selectorPlaceholder: 'Type role name, separate multiple with comma or space',
		docsAnchor: 'role',
	},
	serviceaccount: {
		label: 'Service Accounts',
		description: 'Non-human identities used by integrations.',
		icon: Bot,
		selectorPlaceholder:
			'Type service account ID, separate multiple with comma or space',
		docsAnchor: 'service-account',
	},
};

export const RESOURCE_ORDER = Object.keys(RESOURCE_PANELS) as AuthZResource[];

export function getResourcePanel(resource: AuthZResource): ResourcePanelConfig {
	const panel = RESOURCE_PANELS[resource];

	if (panel) {
		return panel;
	}

	// Ideally we will have all the resources mapped by compile time, in case we forgot or we are using a backend
	// that is newer than frontend, we should have this as fallback to avoid crashing the UI
	return {
		label: resource,
		description: 'Manage permissions for this resource.',
		icon: Shield,
		selectorPlaceholder: 'Type ID, separate multiple with comma or space',
		docsAnchor: '',
	};
}

export function getResourceVerbs(
	resource: AuthZResource,
): readonly AuthZVerb[] {
	const match = permissionsType.data.resources.find(
		(entry) => entry.kind === resource,
	);

	if (!match) {
		return [];
	}

	// Role resource cannot have assignee verb
	// TODO(H4ad): Remove this once we get rid of frontend/src/hooks/useAuthZ/legacy.ts
	if (resource === 'role') {
		return match.allowedVerbs.filter((verb) => verb !== 'assignee');
	}

	return match.allowedVerbs;
}

export function getResourceType(resource: AuthZResource): CoretypesTypeDTO {
	const match = permissionsType.data.resources.find(
		(entry) => entry.kind === resource,
	);
	return match
		? (match.type as CoretypesTypeDTO)
		: CoretypesTypeDTO.metaresource;
}

export function supportsOnlySelected(
	verb: AuthZVerb,
): verb is ObjectScopedVerb {
	return OBJECT_SCOPED_VERB_SET.has(verb);
}
