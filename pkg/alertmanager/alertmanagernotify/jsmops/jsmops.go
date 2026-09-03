// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

// Package jsmops delivers Jira Service Management Ops alerts by reusing the
// Opsgenie notifier: JSM Ops is the ex-Opsgenie alert API, so we map the JSM
// config onto config.OpsGenieConfig with APIURL pinned to the JSM native
// integration-events gateway.
package jsmops

import (
	"log/slog"
	"net/url"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/opsgenie"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/template"
	commoncfg "github.com/prometheus/common/config"
)

const (
	Integration = "jsmops"
	source      = "SigNoz"
)

// New builds an Opsgenie notifier pointed at the JSM native endpoint.
// advancedFeatures enables the rich treatment: HTML body and a note timeline
// (per fire and on resolve).
func New(c *alertmanagertypes.JSMOpsReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, advancedFeatures bool) (*opsgenie.Notifier, error) {
	conf, err := toOpsGenieConfig(c)
	if err != nil {
		return nil, err
	}
	return opsgenie.New(conf, t, l, templater, advancedFeatures)
}

// toOpsGenieConfig maps the JSM config onto config.OpsGenieConfig with APIURL
// pinned to the JSM native gateway.
func toOpsGenieConfig(c *alertmanagertypes.JSMOpsReceiverConfig) (*config.OpsGenieConfig, error) {
	apiURL, err := url.Parse(alertmanagertypes.JSMOpsAPIBaseURL)
	if err != nil {
		return nil, err
	}

	httpConfig := c.HTTPConfig
	if httpConfig == nil {
		httpConfig = &commoncfg.HTTPClientConfig{}
	}

	return &config.OpsGenieConfig{
		NotifierConfig: c.NotifierConfig,
		HTTPConfig:     httpConfig,
		APIKey:         c.APIKey,
		APIURL:         &config.URL{URL: apiURL},
		Message:        c.Message,
		Description:    c.Description,
		Priority:       c.Priority,
		Tags:           c.Tags,
		Source:         source,
	}, nil
}
