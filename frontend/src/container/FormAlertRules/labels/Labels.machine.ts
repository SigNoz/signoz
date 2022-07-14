import { createMachine } from 'xstate';

export const ResourceAttributesFilterMachine =
	/** @xstate-layout N4IgpgJg5mDOIC5QBECGsAWAjA9qgThAAQDKYBAxhkQIIB2xAYgJYA2ALmPgHQAqqUANJgAngGIAcgFEAGr0SgADjljN2zHHQUgAHogAcAFgAM3AOz6ATAEYAzJdsA2Y4cOWAnABoQIxAFpDR2tuQ319AFYTcKdbFycAX3jvNExcAmIySmp6JjZOHn4hUTFNACFWAFd8bWVVdU1tPQQzY1MXY2tDdzNHM3dHd0NvXwR7biMTa313S0i+63DE5PRsPEJScnwqWgYiFg4uPgFhcQAlKRIpeSQQWrUNLRumx3Czbg8TR0sbS31jfUcw38fW47gBHmm4XCVms3SWIBSq3SGyyO1yBx4AHlFFxUOwcPhJLJrkoVPcGk9ENYFuF3i5YR0wtEHECEAEgiEmV8zH1DLYzHZ4Yi0utMltsrt9vluNjcfjCWVKtUbnd6o9QE1rMYBtxbGFvsZ3NrZj1WdYOfotUZLX0XEFHEKViKMpttjk9nlDrL8HiCWJzpcSbcyWrGoh3NCQj0zK53P1ph1WeFLLqnJZ2s5vmZLA6kginWsXaj3VLDoUAGqoSpgEp0cpVGohh5hhDWDy0sz8zruakzamWVm-Qyg362V5-AZOayO1KFlHitEejFHKCV6v+i5XRt1ZuU1s52zjNOOaZfdOWIY+RDZ0Hc6ZmKEXqyLPPCudit2Sz08ACSEFYNbSHI27kuquiIOEjiONwjJgrM3RWJYZisgEIJgnYPTmuEdi2OaiR5nQOAQHA2hvsiH4Sui0qFCcIGhnuLSmP0YJuJ2xjJsmKELG8XZTK0tjdHG06vgW5GupRS7St6vrKqSO4UhqVL8TBWp8o4eqdl0A5Xmy3G6gK56-B4uERDOSKiuJi6lgUAhrhUYB0buimtrEKZBDYrxaS0OZca8+ltheybOI4hivGZzrzp+VGHH+AGOQp4EIHy+ghNYnawtG4TsbYvk8QKfHGAJfQ9uF76WSW37xWBTSGJ0qXpd0vRZdEKGPqC2YeO2-zfO4+HxEAA */
	createMachine({
		tsTypes: {} as import('./Labels.machine.typegen').Typegen0,
		initial: 'Idle',
		states: {
			LabelKey: {
				on: {
					NEXT: {
						actions: 'onSelectLabelValue',
						target: 'LabelValue',
					},
					onBlur: {
						actions: 'onSelectLabelValue',
						target: 'LabelValue',
					},
					RESET: {
						target: 'Idle',
					},
				},
			},
			LabelValue: {
				on: {
					NEXT: {
						actions: ['onValidateQuery'],
					},
					onBlur: {
						actions: ['onValidateQuery'],
						// target: 'Idle',
					},
					RESET: {
						target: 'Idle',
					},
				},
			},
			Idle: {
				on: {
					NEXT: {
						actions: 'onSelectLabelKey',
						description: 'Enter a label key',
						target: 'LabelKey',
					},
				},
			},
		},
		id: 'Label Key Values',
	});
