import type { ReactNode } from 'react';

export enum StripTone {
	Default = 'default',
	Warning = 'warning',
	Error = 'error',
}

export enum StripItemKind {
	/** A phrase in the page's own words, e.g. "18 services". */
	Text = 'text',
	/** A labelled number, rendered `label : value`. */
	KeyValue = 'keyValue',
}

/** What a page may put on the left of the strip. */
export type StripItem =
	| {
			kind: StripItemKind.Text;
			text: string;
			prefix?: ReactNode;
	  }
	| {
			kind: StripItemKind.KeyValue;
			/** Without a colon; the strip renders the separator. */
			label: string;
			value: string | number;
			prefix?: ReactNode;
			/** Tints the icon; the text stays neutral at every tone. */
			tone?: StripTone;
	  };
