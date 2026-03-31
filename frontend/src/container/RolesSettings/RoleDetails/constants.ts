import {
	BadgePlus,
	Eye,
	LayoutList,
	PencilRuler,
	Settings,
	Trash2,
} from '@signozhq/icons';

export const ROLE_ID_REGEX = /\/settings\/roles\/([^/]+)/;

export type IconComponent = React.ComponentType<any>;

export const PERMISSION_ICON_MAP: Record<string, IconComponent> = {
	create: BadgePlus,
	list: LayoutList,
	read: Eye,
	update: PencilRuler,
	delete: Trash2,
};

export const FALLBACK_PERMISSION_ICON: IconComponent = Settings;
