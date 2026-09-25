package alertmanagertypes

import (
	"fmt"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// ChannelDefect names why v2 cannot read a stored channel. Unrepresentable
// covers everything the read path rejects that no repair action addresses.
type ChannelDefect struct {
	valuer.String
}

var (
	ChannelDefectNone                = ChannelDefect{valuer.NewString("none")}
	ChannelDefectMissingType         = ChannelDefect{valuer.NewString("missing_type")}
	ChannelDefectMultipleNotifiers   = ChannelDefect{valuer.NewString("multiple_notifiers")}
	ChannelDefectUnsupportedNotifier = ChannelDefect{valuer.NewString("unsupported_notifier")}
	ChannelDefectUnrepresentable     = ChannelDefect{valuer.NewString("unrepresentable")}
)

func (ChannelDefect) Enum() []any {
	return []any{ChannelDefectNone, ChannelDefectMissingType, ChannelDefectMultipleNotifiers, ChannelDefectUnsupportedNotifier, ChannelDefectUnrepresentable}
}

type ChannelRepairAction struct {
	valuer.String
}

var (
	ChannelRepairActionNone   = ChannelRepairAction{valuer.NewString("none")}
	ChannelRepairActionRetype = ChannelRepairAction{valuer.NewString("retype")}
	ChannelRepairActionSplit  = ChannelRepairAction{valuer.NewString("split")}
	ChannelRepairActionDelete = ChannelRepairAction{valuer.NewString("delete")}
)

func (ChannelRepairAction) Enum() []any {
	return []any{ChannelRepairActionNone, ChannelRepairActionRetype, ChannelRepairActionSplit, ChannelRepairActionDelete}
}

// RepairChannelParams defaults to a dry run; only apply=true writes anything.
type RepairChannelParams struct {
	Apply bool `query:"apply" json:"apply"`
}

// ChannelRepair is one channel's diagnosis and the action that makes it
// readable by v2. Channels lists what exists once the action is applied: the
// channel itself for none and retype, every part of a split, nothing for a
// delete. Blockers explain why an action was not, or would not be, applied.
type ChannelRepair struct {
	ID       valuer.UUID                  `json:"id" required:"true"`
	Defect   ChannelDefect                `json:"defect" required:"true"`
	Detail   string                       `json:"detail"`
	Action   ChannelRepairAction          `json:"action" required:"true"`
	Blockers []string                     `json:"blockers,omitempty"`
	Channels []*ListedNotificationChannel `json:"channels"`
	Applied  bool                         `json:"applied" required:"true"`
}

// Diagnose reads the channel the way v2 does and reports the first defect in
// the order a repair has to address them: data that does not decode, several
// notifiers, a notifier v2 does not model, a missing stored type, and last
// anything else the read path rejects.
func (c *Channel) Diagnose() *ChannelRepair {
	repair := &ChannelRepair{ID: c.ID, Defect: ChannelDefectNone, Action: ChannelRepairActionNone}

	receiver, err := NewReceiver(c.Data)
	if err != nil {
		repair.Defect, repair.Detail = ChannelDefectUnrepresentable, err.Error()
		return repair
	}

	if total := countNotifierConfigs(receiver); total > 1 {
		repair.Defect, repair.Action = ChannelDefectMultipleNotifiers, ChannelRepairActionSplit
		repair.Detail = fmt.Sprintf("carries %d notifier configurations", total)
		return repair
	}

	if !hasModelledNotifier(receiver) {
		repair.Defect, repair.Action = ChannelDefectUnsupportedNotifier, ChannelRepairActionDelete
		repair.Detail = fmt.Sprintf("notifier %q is not modelled by v2", receiverChannelType(receiver))
		return repair
	}

	if c.Type == "" {
		repair.Defect, repair.Action = ChannelDefectMissingType, ChannelRepairActionRetype
		repair.Detail = fmt.Sprintf("stored type is empty, receiver carries %q", receiverChannelType(receiver))
		return repair
	}

	if _, err := c.toChannelConfig(); err != nil {
		repair.Defect, repair.Detail = ChannelDefectUnrepresentable, err.Error()
		return repair
	}

	return repair
}

// Retype derives the stored type from the notifier the data carries, leaving
// the data itself untouched.
func (c *Channel) Retype() error {
	receiver, err := NewReceiver(c.Data)
	if err != nil {
		return err
	}

	c.Type = receiverChannelType(receiver)
	c.UpdatedAt = time.Now()

	return nil
}

// SplitByNotifier turns a receiver carrying several notifier configurations into
// one channel per configuration. The first keeps this channel's identity so
// references to it stay valid; the rest are new channels numbered after it.
func (c *Channel) SplitByNotifier() ([]*Channel, error) {
	receiver, err := NewReceiver(c.Data)
	if err != nil {
		return nil, err
	}

	singles := splitReceiverByNotifier(receiver)
	if len(singles) < 2 {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q carries %d notifier configuration; nothing to split", c.DisplayName, len(singles))
	}

	if err := c.Update(singles[0]); err != nil {
		return nil, err
	}

	channels := []*Channel{c}
	for i, single := range singles[1:] {
		single.Name = fmt.Sprintf("%s (%d)", c.DisplayName, i+2)
		channel, err := NewChannelFromReceiver(single, c.OrgID)
		if err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}

	return channels, nil
}

func hasModelledNotifier(receiver *Receiver) bool {
	for _, channelKind := range channelKinds {
		if channelKind.countConfigs(receiver) > 0 {
			return true
		}
	}

	return false
}

// splitReceiverByNotifier yields one receiver per *_configs entry, walking
// SigNoz's own notifier lists first and upstream's second, each in declaration
// order.
func splitReceiverByNotifier(receiver *Receiver) []*Receiver {
	var singles []*Receiver
	for _, upstream := range []bool{false, true} {
		holder := reflect.ValueOf(receiver).Elem()
		if upstream {
			holder = reflect.ValueOf(receiver.Receiver).Elem()
		}

		for i := 0; i < holder.NumField(); i++ {
			list := holder.Field(i)
			if list.Kind() != reflect.Slice || !receiverTypeRegex.MatchString(holder.Type().Field(i).Tag.Get("yaml")) {
				continue
			}

			for j := 0; j < list.Len(); j++ {
				single := &Receiver{Receiver: &config.Receiver{Name: receiver.Name}}
				target := reflect.ValueOf(single).Elem()
				if upstream {
					target = reflect.ValueOf(single.Receiver).Elem()
				}
				target.Field(i).Set(reflect.Append(reflect.MakeSlice(list.Type(), 0, 1), list.Index(j)))
				singles = append(singles, single)
			}
		}
	}

	return singles
}
