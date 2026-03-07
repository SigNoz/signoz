package segmentanalytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
	segment "github.com/segmentio/analytics-go/v3"
)

type provider struct {
	settings factory.ScopedProviderSettings
	client   segment.Client
	stopC    chan struct{}
}

func NewFactory() factory.ProviderFactory[analytics.Analytics, analytics.Config] {
	return factory.NewProviderFactory(factory.MustNewName("segment"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config analytics.Config) (analytics.Analytics, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/analytics/segmentanalytics")

	client, err := segment.NewWithConfig(config.Segment.Key, segment.Config{
		Logger: newSegmentLogger(settings),
	})
	if err != nil {
		return nil, err
	}

	return &provider{
		settings: settings,
		client:   client,
		stopC:    make(chan struct{}),
	}, nil
}

func (provider *provider) Start(_ context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *provider) Send(ctx context.Context, messages ...analyticstypes.Message) {
	for _, message := range messages {
		err := provider.client.Enqueue(message)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
		}
	}
}

func (provider *provider) TrackGroup(ctx context.Context, group, event string, properties map[string]any) {
	if properties == nil {
		provider.settings.Logger().WarnContext(ctx, "empty attributes received, skipping event", "group", group, "event", event)
		return
	}

	err := provider.client.Enqueue(analyticstypes.Track{
		UserId:     "stats_" + group,
		Event:      event,
		Properties: analyticstypes.NewPropertiesFromMap(properties),
		Context: &analyticstypes.Context{
			Extra: map[string]interface{}{
				analyticstypes.KeyGroupID: group,
			},
		},
	})
	if err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
	}
}

func (provider *provider) TrackUser(ctx context.Context, group, user, event string, properties map[string]any) {
	if properties == nil {
		provider.settings.Logger().WarnContext(ctx, "empty attributes received, skipping event", "user", user, "group", group, "event", event)
		return
	}

	err := provider.client.Enqueue(analyticstypes.Track{
		UserId:     user,
		Event:      event,
		Properties: analyticstypes.NewPropertiesFromMap(properties),
		Context: &analyticstypes.Context{
			Extra: map[string]interface{}{
				analyticstypes.KeyGroupID: group,
			},
		},
	})
	if err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
	}
}

func (provider *provider) IdentifyGroup(ctx context.Context, group string, traits map[string]any) {
	if traits == nil {
		provider.settings.Logger().WarnContext(ctx, "empty attributes received, skipping identify", "group", group)
		return
	}

	// identify the user
	err := provider.client.Enqueue(analyticstypes.Identify{
		UserId: "stats_" + group,
		Traits: analyticstypes.NewTraitsFromMap(traits),
	})
	if err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
	}

	// identify the group using the stats user
	err = provider.client.Enqueue(analyticstypes.Group{
		UserId:  "stats_" + group,
		GroupId: group,
		Traits:  analyticstypes.NewTraitsFromMap(traits),
	})
	if err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
	}
}

func (provider *provider) IdentifyUser(ctx context.Context, group, user string, traits map[string]any) {
	if traits == nil {
		provider.settings.Logger().WarnContext(ctx, "empty attributes received, skipping identify", "user", user, "group", group)
		return
	}

	// identify the user
	err := provider.client.Enqueue(analyticstypes.Identify{
		UserId: user,
		Traits: analyticstypes.NewTraitsFromMap(traits),
	})
	if err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
	}

	// associate the user with the group
	err = provider.client.Enqueue(analyticstypes.Group{
		UserId:  user,
		GroupId: group,
		Traits:  analyticstypes.NewTraits().Set("id", group), // A trait is required
	})
	if err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
	}
}

func (provider *provider) Stop(ctx context.Context) error {
	if err := provider.client.Close(); err != nil {
		provider.settings.Logger().WarnContext(ctx, "unable to close segment client", "err", err)
	}

	close(provider.stopC)
	return nil
}
