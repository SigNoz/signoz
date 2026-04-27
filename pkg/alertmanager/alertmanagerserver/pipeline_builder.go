// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2015 Prometheus Team
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package alertmanagerserver

// pipelineBuilder is a local copy of notify.PipelineBuilder that injects
// the maintenance mute stage immediately before the receiver stage.
//
// We maintain our own copy so we can control exactly where in the pipeline
// the maintenance stage runs (between the silence stage and the receiver),
// which is not possible by wrapping the output of the upstream builder.
//
// Upstream pipeline order (notify.PipelineBuilder.New, notify.go:444):
//
//	GossipSettle → Inhibit → TimeActive → TimeMute → Silence → [mms] → Receiver

import (
	"time"

	"github.com/prometheus/alertmanager/featurecontrol"
	"github.com/prometheus/alertmanager/inhibit"
	"github.com/prometheus/alertmanager/nflog/nflogpb"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/silence"
	"github.com/prometheus/alertmanager/timeinterval"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/client_golang/prometheus"
)

type pipelineBuilder struct {
	metrics *notify.Metrics
	ff      featurecontrol.Flagger
	muter   *MaintenanceMuter
}

func newPipelineBuilder(
	r prometheus.Registerer,
	ff featurecontrol.Flagger,
	muter *MaintenanceMuter,
) *pipelineBuilder {
	return &pipelineBuilder{
		metrics: notify.NewMetrics(r, ff),
		ff:      ff,
		muter:   muter,
	}
}

// New returns a map of receivers to Stages, mirroring notify.PipelineBuilder.New
// but inserting a maintenanceMuteStage between the silence stage and the receiver.
func (pb *pipelineBuilder) New(
	receivers map[string][]notify.Integration,
	wait func() time.Duration,
	inhibitor *inhibit.Inhibitor,
	silencer *silence.Silencer,
	intervener *timeinterval.Intervener,
	marker types.GroupMarker,
	notificationLog notify.NotificationLog,
	peer notify.Peer,
) notify.RoutingStage {
	rs := make(notify.RoutingStage, len(receivers))

	ms := notify.NewGossipSettleStage(peer)
	is := notify.NewMuteStage(inhibitor, pb.metrics)
	tas := notify.NewTimeActiveStage(intervener, marker, pb.metrics)
	tms := notify.NewTimeMuteStage(intervener, marker, pb.metrics)
	ss := notify.NewMuteStage(silencer, pb.metrics)

	var mms *maintenanceMuteStage
	if pb.muter != nil {
		mms = &maintenanceMuteStage{muter: pb.muter}
	}

	for name := range receivers {
		stages := notify.MultiStage{ms, is, tas, tms, ss}
		if mms != nil {
			stages = append(stages, mms)
		}
		stages = append(stages, buildReceiverStage(name, receivers[name], wait, notificationLog, pb.metrics))
		rs[name] = stages
	}

	pb.metrics.InitializeFor(receivers)
	return rs
}

// buildReceiverStage is a copy of notify.createReceiverStage (unexported upstream).
func buildReceiverStage(
	name string,
	integrations []notify.Integration,
	wait func() time.Duration,
	notificationLog notify.NotificationLog,
	metrics *notify.Metrics,
) notify.Stage {
	var fs notify.FanoutStage
	for i := range integrations {
		recv := &nflogpb.Receiver{
			GroupName:   name,
			Integration: integrations[i].Name(),
			Idx:         uint32(integrations[i].Index()),
		}
		var s notify.MultiStage
		s = append(s, notify.NewWaitStage(wait))
		s = append(s, notify.NewDedupStage(&integrations[i], notificationLog, recv))
		s = append(s, notify.NewRetryStage(integrations[i], name, metrics))
		s = append(s, notify.NewSetNotifiesStage(notificationLog, recv))
		fs = append(fs, s)
	}
	return fs
}
