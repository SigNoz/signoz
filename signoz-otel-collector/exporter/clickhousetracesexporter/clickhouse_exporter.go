// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clickhousetracesexporter

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/SigNoz/signoz-otel-collector/usage"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/google/uuid"
	"go.opencensus.io/stats/view"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	conventions "go.opentelemetry.io/collector/semconv/v1.5.0"
	"go.uber.org/zap"
)

// Crete new exporter.
func newExporter(cfg component.Config, logger *zap.Logger) (*storage, error) {

	if err := component.ValidateConfig(cfg); err != nil {
		return nil, err
	}

	configClickHouse := cfg.(*Config)

	id := uuid.New()

	f := ClickHouseNewFactory(id, configClickHouse.Migrations, configClickHouse.Datasource, configClickHouse.DockerMultiNodeCluster, configClickHouse.QueueSettings.NumConsumers)

	err := f.Initialize(logger)
	if err != nil {
		return nil, err
	}
	spanWriter, err := f.CreateSpanWriter()
	if err != nil {
		return nil, err
	}

	collector := usage.NewUsageCollector(
		id,
		f.db,
		usage.Options{ReportingInterval: usage.DefaultCollectionInterval},
		"signoz_traces",
		UsageExporter,
	)
	if err != nil {
		log.Fatalf("Error creating usage collector for traces: %v", err)
	}
	collector.Start()

	if err := view.Register(SpansCountView, SpansCountBytesView); err != nil {
		return nil, err
	}

	storage := storage{
		id:             id,
		Writer:         spanWriter,
		usageCollector: collector,
		config: storageConfig{
			lowCardinalExceptionGrouping: configClickHouse.LowCardinalExceptionGrouping,
		},
		wg:        new(sync.WaitGroup),
		closeChan: make(chan struct{}),
	}

	return &storage, nil
}

type storage struct {
	id             uuid.UUID
	Writer         Writer
	usageCollector *usage.UsageCollector
	config         storageConfig
	wg             *sync.WaitGroup
	closeChan      chan struct{}
}

type storageConfig struct {
	lowCardinalExceptionGrouping bool
}

func makeJaegerProtoReferences(
	links ptrace.SpanLinkSlice,
	parentSpanID pcommon.SpanID,
	traceID pcommon.TraceID,
) ([]OtelSpanRef, error) {

	parentSpanIDSet := len([8]byte(parentSpanID)) != 0
	if !parentSpanIDSet && links.Len() == 0 {
		return nil, nil
	}

	refsCount := links.Len()
	if parentSpanIDSet {
		refsCount++
	}

	refs := make([]OtelSpanRef, 0, refsCount)

	// Put parent span ID at the first place because usually backends look for it
	// as the first CHILD_OF item in the model.SpanRef slice.
	if parentSpanIDSet {

		refs = append(refs, OtelSpanRef{
			TraceId: utils.TraceIDToHexOrEmptyString(traceID),
			SpanId:  utils.SpanIDToHexOrEmptyString(parentSpanID),
			RefType: "CHILD_OF",
		})
	}

	for i := 0; i < links.Len(); i++ {
		link := links.At(i)

		refs = append(refs, OtelSpanRef{
			TraceId: utils.TraceIDToHexOrEmptyString(link.TraceID()),
			SpanId:  utils.SpanIDToHexOrEmptyString(link.SpanID()),

			// Since Jaeger RefType is not captured in internal data,
			// use SpanRefType_FOLLOWS_FROM by default.
			// SpanRefType_CHILD_OF supposed to be set only from parentSpanID.
			RefType: "FOLLOWS_FROM",
		})
	}

	return refs, nil
}

// ServiceNameForResource gets the service name for a specified Resource.
// TODO: Find a better package for this function.
func ServiceNameForResource(resource pcommon.Resource) string {
	// if resource.IsNil() {
	// 	return "<nil-resource>"
	// }

	service, found := resource.Attributes().Get(conventions.AttributeServiceName)
	if !found {
		return "<nil-service-name>"
	}

	return service.Str()
}

func populateOtherDimensions(attributes pcommon.Map, span *Span) {

	attributes.Range(func(k string, v pcommon.Value) bool {
		if k == "http.status_code" || k == "http.response.status_code" {
			// Handle both string/int http status codes.
			statusString, err := strconv.Atoi(v.Str())
			statusInt := v.Int()
			if err == nil && statusString != 0 {
				statusInt = int64(statusString)
			}
			span.HttpCode = strconv.FormatInt(statusInt, 10)
			span.ResponseStatusCode = span.HttpCode
		} else if (k == "http.url" || k == "url.full") && span.Kind == 3 {
			value := v.Str()
			valueUrl, err := url.Parse(value)
			if err == nil {
				value = valueUrl.Hostname()
			}
			span.ExternalHttpUrl = value
			span.HttpUrl = v.Str()
		} else if (k == "http.method" || k == "http.request.method") && span.Kind == 3 {
			span.ExternalHttpMethod = v.Str()
			span.HttpMethod = v.Str()
		} else if (k == "http.url" || k == "url.full") && span.Kind != 3 {
			span.HttpUrl = v.Str()
		} else if (k == "http.method" || k == "http.request.method") && span.Kind != 3 {
			span.HttpMethod = v.Str()
		} else if k == "http.route" {
			span.HttpRoute = v.Str()
		} else if k == "http.host" {
			span.HttpHost = v.Str()
		} else if k == "messaging.system" {
			span.MsgSystem = v.Str()
		} else if k == "messaging.operation" {
			span.MsgOperation = v.Str()
		} else if k == "component" { // TODO: There was never a "component" attribute in the spec, this was from OpenCensus/OpenTracing
			span.Component = v.Str()
		} else if k == "db.system" {
			span.DBSystem = v.Str()
		} else if k == "db.name" {
			span.DBName = v.Str()
		} else if k == "db.operation" {
			span.DBOperation = v.Str()
		} else if k == "peer.service" {
			span.PeerService = v.Str()
		} else if k == "rpc.grpc.status_code" {
			// Handle both string/int status code in GRPC spans.
			statusString, err := strconv.Atoi(v.Str())
			statusInt := v.Int()
			if err == nil && statusString != 0 {
				statusInt = int64(statusString)
			}
			span.GRPCCode = strconv.FormatInt(statusInt, 10)
			span.ResponseStatusCode = span.GRPCCode
		} else if k == "rpc.method" {
			span.RPCMethod = v.Str()
			system, found := attributes.Get("rpc.system")
			if found && system.Str() == "grpc" {
				span.GRPCMethod = v.Str()
			}
		} else if k == "rpc.service" {
			span.RPCService = v.Str()
		} else if k == "rpc.system" {
			span.RPCSystem = v.Str()
		} else if k == "rpc.jsonrpc.error_code" {
			span.ResponseStatusCode = v.Str()
		}
		return true

	})

}

func populateEvents(events ptrace.SpanEventSlice, span *Span, lowCardinalExceptionGrouping bool) {
	for i := 0; i < events.Len(); i++ {
		event := Event{}
		event.Name = events.At(i).Name()
		event.TimeUnixNano = uint64(events.At(i).Timestamp())
		event.AttributeMap = map[string]string{}
		event.IsError = false
		events.At(i).Attributes().Range(func(k string, v pcommon.Value) bool {
			event.AttributeMap[k] = v.AsString()
			return true
		})
		if event.Name == "exception" {
			event.IsError = true
			span.ErrorEvent = event
			uuidWithHyphen := uuid.New()
			uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)
			span.ErrorID = uuid
			var hash [16]byte
			if lowCardinalExceptionGrouping {
				hash = md5.Sum([]byte(span.ServiceName + span.ErrorEvent.AttributeMap["exception.type"]))
			} else {
				hash = md5.Sum([]byte(span.ServiceName + span.ErrorEvent.AttributeMap["exception.type"] + span.ErrorEvent.AttributeMap["exception.message"]))

			}
			span.ErrorGroupID = fmt.Sprintf("%x", hash)
		}
		stringEvent, _ := json.Marshal(event)
		span.Events = append(span.Events, string(stringEvent))
	}
}

func populateTraceModel(span *Span) {
	span.TraceModel.Events = span.Events
	span.TraceModel.HasError = span.HasError
}

func newStructuredSpan(otelSpan ptrace.Span, ServiceName string, resource pcommon.Resource, config storageConfig) *Span {
	durationNano := uint64(otelSpan.EndTimestamp() - otelSpan.StartTimestamp())

	attributes := otelSpan.Attributes()
	resourceAttributes := resource.Attributes()
	tagMap := map[string]string{}
	stringTagMap := map[string]string{}
	numberTagMap := map[string]float64{}
	boolTagMap := map[string]bool{}
	spanAttributes := []SpanAttribute{}

	resourceAttrs := map[string]string{}

	attributes.Range(func(k string, v pcommon.Value) bool {
		tagMap[k] = v.AsString()
		spanAttribute := SpanAttribute{
			Key:      k,
			TagType:  "tag",
			IsColumn: false,
		}
		if v.Type() == pcommon.ValueTypeDouble {
			numberTagMap[k] = v.Double()
			spanAttribute.NumberValue = v.Double()
			spanAttribute.DataType = "float64"
		} else if v.Type() == pcommon.ValueTypeInt {
			numberTagMap[k] = float64(v.Int())
			spanAttribute.NumberValue = float64(v.Int())
			spanAttribute.DataType = "float64"
		} else if v.Type() == pcommon.ValueTypeBool {
			boolTagMap[k] = v.Bool()
			spanAttribute.DataType = "bool"
		} else {
			stringTagMap[k] = v.AsString()
			spanAttribute.StringValue = v.AsString()
			spanAttribute.DataType = "string"
		}
		spanAttributes = append(spanAttributes, spanAttribute)
		return true

	})

	resourceAttributes.Range(func(k string, v pcommon.Value) bool {
		tagMap[k] = v.AsString()
		spanAttribute := SpanAttribute{
			Key:      k,
			TagType:  "resource",
			IsColumn: false,
		}
		resourceAttrs[k] = v.AsString()
		if v.Type() == pcommon.ValueTypeDouble {
			numberTagMap[k] = v.Double()
			spanAttribute.NumberValue = v.Double()
			spanAttribute.DataType = "float64"
		} else if v.Type() == pcommon.ValueTypeInt {
			numberTagMap[k] = float64(v.Int())
			spanAttribute.NumberValue = float64(v.Int())
			spanAttribute.DataType = "float64"
		} else if v.Type() == pcommon.ValueTypeBool {
			boolTagMap[k] = v.Bool()
			spanAttribute.DataType = "bool"
		} else {
			stringTagMap[k] = v.AsString()
			spanAttribute.StringValue = v.AsString()
			spanAttribute.DataType = "string"
		}
		spanAttributes = append(spanAttributes, spanAttribute)
		return true

	})

	references, _ := makeJaegerProtoReferences(otelSpan.Links(), otelSpan.ParentSpanID(), otelSpan.TraceID())

	tenant := usage.GetTenantNameFromResource(resource)

	var span *Span = &Span{
		TraceId:           utils.TraceIDToHexOrEmptyString(otelSpan.TraceID()),
		SpanId:            utils.SpanIDToHexOrEmptyString(otelSpan.SpanID()),
		ParentSpanId:      utils.SpanIDToHexOrEmptyString(otelSpan.ParentSpanID()),
		Name:              otelSpan.Name(),
		StartTimeUnixNano: uint64(otelSpan.StartTimestamp()),
		DurationNano:      durationNano,
		ServiceName:       ServiceName,
		Kind:              int8(otelSpan.Kind()),
		StatusCode:        int16(otelSpan.Status().Code()),
		TagMap:            tagMap,
		StringTagMap:      stringTagMap,
		NumberTagMap:      numberTagMap,
		BoolTagMap:        boolTagMap,
		ResourceTagsMap:   resourceAttrs,
		HasError:          false,
		TraceModel: TraceModel{
			TraceId:           utils.TraceIDToHexOrEmptyString(otelSpan.TraceID()),
			SpanId:            utils.SpanIDToHexOrEmptyString(otelSpan.SpanID()),
			Name:              otelSpan.Name(),
			DurationNano:      durationNano,
			StartTimeUnixNano: uint64(otelSpan.StartTimestamp()),
			ServiceName:       ServiceName,
			Kind:              int8(otelSpan.Kind()),
			References:        references,
			TagMap:            tagMap,
			StringTagMap:      stringTagMap,
			NumberTagMap:      numberTagMap,
			BoolTagMap:        boolTagMap,
			HasError:          false,
		},
		Tenant: &tenant,
	}

	if otelSpan.Status().Code() == ptrace.StatusCodeError {
		span.HasError = true
	}
	populateOtherDimensions(attributes, span)
	populateEvents(otelSpan.Events(), span, config.lowCardinalExceptionGrouping)
	populateTraceModel(span)
	spanAttributes = append(spanAttributes, extractSpanAttributesFromSpanIndex(span)...)
	span.SpanAttributes = spanAttributes
	return span
}

// traceDataPusher implements OTEL exporterhelper.traceDataPusher
func (s *storage) pushTraceData(ctx context.Context, td ptrace.Traces) error {
	s.wg.Add(1)
	defer s.wg.Done()

	select {
	case <-s.closeChan:
		return errors.New("shutdown has been called")
	default:
		rss := td.ResourceSpans()
		var batchOfSpans []*Span
		for i := 0; i < rss.Len(); i++ {
			rs := rss.At(i)

			serviceName := ServiceNameForResource(rs.Resource())

			ilss := rs.ScopeSpans()
			for j := 0; j < ilss.Len(); j++ {
				ils := ilss.At(j)

				spans := ils.Spans()

				for k := 0; k < spans.Len(); k++ {
					span := spans.At(k)
					structuredSpan := newStructuredSpan(span, serviceName, rs.Resource(), s.config)
					batchOfSpans = append(batchOfSpans, structuredSpan)
				}
			}
		}
		err := s.Writer.WriteBatchOfSpans(batchOfSpans)
		if err != nil {
			zap.S().Error("Error in writing spans to clickhouse: ", err)
			return err
		}
		return nil
	}
}

// Shutdown will shutdown the exporter.
func (s *storage) Shutdown(_ context.Context) error {

	close(s.closeChan)
	s.wg.Wait()

	if s.usageCollector != nil {
		s.usageCollector.Stop()
	}

	if closer, ok := s.Writer.(io.Closer); ok {
		return closer.Close()
	}
	return nil
}

func extractSpanAttributesFromSpanIndex(span *Span) []SpanAttribute {
	spanAttributes := []SpanAttribute{}
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "traceID",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.TraceId,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "spanID",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.SpanId,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "parentSpanID",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.ParentSpanId,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "name",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.Name,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "serviceName",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.ServiceName,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "kind",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "float64",
		NumberValue: float64(span.Kind),
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "durationNano",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "float64",
		NumberValue: float64(span.DurationNano),
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "statusCode",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "float64",
		NumberValue: float64(span.StatusCode),
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:      "hasError",
		TagType:  "tag",
		IsColumn: true,
		DataType: "bool",
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "externalHttpMethod",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.ExternalHttpMethod,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "externalHttpUrl",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.ExternalHttpUrl,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "component",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.Component,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "dbSystem",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.DBSystem,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "dbName",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.DBName,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "dbOperation",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.DBOperation,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "peerService",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.PeerService,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "httpMethod",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.HttpMethod,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "httpUrl",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.HttpUrl,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "httpRoute",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.HttpRoute,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "httpHost",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.HttpHost,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "msgSystem",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.MsgSystem,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "msgOperation",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.MsgOperation,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "rpcSystem",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.RPCSystem,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "rpcService",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.RPCService,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "rpcMethod",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.RPCMethod,
	})
	spanAttributes = append(spanAttributes, SpanAttribute{
		Key:         "responseStatusCode",
		TagType:     "tag",
		IsColumn:    true,
		DataType:    "string",
		StringValue: span.ResponseStatusCode,
	})
	return spanAttributes
}
