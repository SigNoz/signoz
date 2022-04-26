import { createMachine } from 'xstate';

export const ResourceAttributesFilterMachine =
	/** @xstate-layout N4IgpgJg5mDOIC5QBECGsAWAjA9qgThAAQDKYBAxhkQIIB2xAYgJYA2ALmPgHQAqqUANJgAngGIAcgFEAGr0SgADjljN2zHHQUgAHogAcAFgAM3AOz6ATAEYAzJdsA2Y4cOWAnABoQIxAFpDR2tuQ319AFYTcKdbFycAX3jvNExcAmIySmp6JjZOHn4hUTFNACFWAFd8bWVVdU1tPQQzY1MXY2tDdzNHM3dHd0NvXwR7biMTa313S0i+63DE5PRsPEJScnwqWgYiFg4ubgB5RS5Udhx8SVl5JBBatQ0tO6brBfDuSxdrdw6w6Icw38gWCoQijksZj6hlsZjsSxAKVW6Q2WR2uQOPBOZwuVzKlWqdwe9WeoFexgG3FsYUsX1+EPCPSBCGsQXG1mMRn01j6LiCjgRSLS60yW2yu32+T4AgAaqhKmASnRylUaipHg0XohrB4PmZYZ13G8Zm9LMzLEZuDN9LZGfoKe4nNZBSthRlNtscns8ocAJIQViK6RyNV1J6NRCRfTcXq2KYcxwGoLMgJ9K3-Jw2xOsxJJEB0HAQODaIVrd1or2Sw6FYQjJTqkkR5qtK0DIyQ2LhWZmnz+BZmKlwqatWzddxGl2pMuosXo72Y46nfDnS6hjWk3TakfcDpxRP6fVdHsjPz9wc64y0qyOqaLPOllGiz0Sn0FWXyipgNeNrUs2KWGMdX7I8WksRwUzPA1aUMLtnEcGCzEnZERQ9cUMSlf1A2-cNfxhaNDB5ONul6cJjGiCDGXPYdjFHPoJ3vV1pyfND53ybDNTJRACMMEJCJ+HozFI8jewQPxwi7dMIltHUCKMXN4iAA */
	createMachine({
		tsTypes: {} as import('./ResourceAttributesFilter.Machine.typegen').Typegen0,
		initial: 'Idle',
		states: {
			TagKey: {
				on: {
					NEXT: {
						actions: 'onSelectOperator',
						target: 'Operator',
					},
					onBlur: {
						actions: 'onBlurPurge',
						target: 'Idle',
					},
				},
			},
			Operator: {
				on: {
					NEXT: {
						actions: 'onSelectTagValue',
						target: 'TagValue',
					},
					onBlur: {
						actions: 'onBlurPurge',
						target: 'Idle',
					},
				},
			},
			TagValue: {
				on: {
					onBlur: {
						actions: ['onValidateQuery', 'onBlurPurge'],
						target: 'Idle',
					},
				},
			},
			Idle: {
				on: {
					NEXT: {
						actions: 'onSelectTagKey',
						description: 'Select Category',
						target: 'TagKey',
					},
				},
			},
		},
		id: 'Dashboard Search And Filter',
	});
