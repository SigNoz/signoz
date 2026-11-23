import { type KbdKey, KbdNamedKey } from '@signozhq/ui/kbd';

const KEY_NAMES: Record<string, KbdKey> = {
	shift: KbdNamedKey.Shift,
	alt: KbdNamedKey.Alt,
	ctrl: KbdNamedKey.Control,
	control: KbdNamedKey.Control,
	// The hotkey handlers treat cmd and meta as meta or ctrl, which is `Mod`.
	cmd: KbdNamedKey.Mod,
	meta: KbdNamedKey.Mod,
};

export function toKbdKeys(shortcut?: string[]): KbdKey[] {
	const combo = shortcut?.find((candidate) => candidate.trim());

	if (!combo) {
		return [];
	}

	return combo.split('+').map((key) => {
		const normalized = key.trim().toLowerCase();

		return KEY_NAMES[normalized] ?? normalized;
	});
}
