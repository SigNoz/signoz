package alertmanagertypes

type channelKindEntry struct {
	kind         ChannelKind
	newEmptySpec func() ChannelSpec
	// countConfigs guards extractSpec, which reads the receiver's first config of
	// this kind and so must not be called when there is none.
	countConfigs func(receiver *Receiver) int
	extractSpec  func(name string, receiver *Receiver) (ChannelSpec, error)
}

// channelKinds registers each notification kind with the spec constructor
// UnmarshalJSON picks by kind and the extractor that reads a stored receiver
// back. The ChannelKind enum derives from it; the JSON schema hooks stay
// literal lists so each branch reads as one line.
var channelKinds = []channelKindEntry{
	{
		kind:         ChannelKindSlack,
		newEmptySpec: func() ChannelSpec { return new(ChannelSlackConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.SlackConfigs) },
		extractSpec:  newChannelSlackConfigFromReceiver,
	},
	{
		kind:         ChannelKindEmail,
		newEmptySpec: func() ChannelSpec { return new(ChannelEmailConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.EmailConfigs) },
		extractSpec:  newChannelEmailConfigFromReceiver,
	},
	{
		kind:         ChannelKindWebhook,
		newEmptySpec: func() ChannelSpec { return new(ChannelWebhookConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.WebhookConfigs) },
		extractSpec:  newChannelWebhookConfigFromReceiver,
	},
	{
		kind:         ChannelKindPagerduty,
		newEmptySpec: func() ChannelSpec { return new(ChannelPagerdutyConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.PagerdutyConfigs) },
		extractSpec:  newChannelPagerdutyConfigFromReceiver,
	},
	{
		kind:         ChannelKindOpsgenie,
		newEmptySpec: func() ChannelSpec { return new(ChannelOpsgenieConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.OpsGenieConfigs) },
		extractSpec:  newChannelOpsgenieConfigFromReceiver,
	},
	{
		kind:         ChannelKindMSTeams,
		newEmptySpec: func() ChannelSpec { return new(ChannelMSTeamsConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.MSTeamsV2Configs) },
		extractSpec:  newChannelMSTeamsConfigFromReceiver,
	},
	{
		kind:         ChannelKindGoogleChat,
		newEmptySpec: func() ChannelSpec { return new(ChannelGoogleChatConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.GoogleChatConfigs) },
		extractSpec:  newChannelGoogleChatConfigFromReceiver,
	},
	{
		kind:         ChannelKindJira,
		newEmptySpec: func() ChannelSpec { return new(ChannelJiraConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.JiraConfigs) },
		extractSpec:  newChannelJiraConfigFromReceiver,
	},
	{
		kind:         ChannelKindJSMOps,
		newEmptySpec: func() ChannelSpec { return new(ChannelJSMOpsConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.JSMOpsConfigs) },
		extractSpec:  newChannelJSMOpsConfigFromReceiver,
	},
	{
		kind:         ChannelKindIncidentIO,
		newEmptySpec: func() ChannelSpec { return new(ChannelIncidentIOConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.IncidentIOConfigs) },
		extractSpec:  newChannelIncidentIOConfigFromReceiver,
	},
}

func buildEmptyChannelSpecForKind(kind ChannelKind) (ChannelSpec, bool) {
	for _, channelKind := range channelKinds {
		if channelKind.kind == kind {
			return channelKind.newEmptySpec(), true
		}
	}
	return nil, false
}
