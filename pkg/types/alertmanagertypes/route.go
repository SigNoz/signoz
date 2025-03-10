package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/common/model"
)

func NewRouteFromRouteConfig(route *config.Route, cfg RouteConfig) (*config.Route, error) {
	if route == nil {
		route = &config.Route{
			Receiver:       DefaultReceiverName,
			GroupByStr:     cfg.GroupByStr,
			GroupInterval:  (*model.Duration)(&cfg.GroupInterval),
			GroupWait:      (*model.Duration)(&cfg.GroupWait),
			RepeatInterval: (*model.Duration)(&cfg.RepeatInterval),
		}
	} else {
		route.GroupByStr = cfg.GroupByStr
		route.GroupInterval = (*model.Duration)(&cfg.GroupInterval)
		route.GroupWait = (*model.Duration)(&cfg.GroupWait)
		route.RepeatInterval = (*model.Duration)(&cfg.RepeatInterval)
	}

	if err := route.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return nil, err
	}

	return route, nil
}

func NewRouteFromReceiver(receiver Receiver) (*config.Route, error) {
	route := &config.Route{Receiver: receiver.Name, Continue: true, Matchers: config.Matchers{noRuleIDMatcher}}
	if err := route.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return nil, err
	}

	return route, nil
}
