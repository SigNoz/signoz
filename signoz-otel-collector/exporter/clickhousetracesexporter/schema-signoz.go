// Copyright  The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clickhousetracesexporter

import (
	"fmt"

	"go.uber.org/zap/zapcore"
)

type Event struct {
	Name         string            `json:"name,omitempty"`
	TimeUnixNano uint64            `json:"timeUnixNano,omitempty"`
	AttributeMap map[string]string `json:"attributeMap,omitempty"`
	IsError      bool              `json:"isError,omitempty"`
}

func (e *Event) MarshalLogObject(enc zapcore.ObjectEncoder) error {
	enc.AddString("name", e.Name)
	enc.AddUint64("timeUnixNano", e.TimeUnixNano)
	enc.AddBool("isError", e.IsError)
	enc.AddString("attributeMap", fmt.Sprintf("%v", e.AttributeMap))
	return nil
}

type TraceModel struct {
	TraceId           string             `json:"traceId,omitempty"`
	SpanId            string             `json:"spanId,omitempty"`
	Name              string             `json:"name,omitempty"`
	DurationNano      uint64             `json:"durationNano,omitempty"`
	StartTimeUnixNano uint64             `json:"startTimeUnixNano,omitempty"`
	ServiceName       string             `json:"serviceName,omitempty"`
	Kind              int8               `json:"kind,omitempty"`
	References        references         `json:"references,omitempty"`
	StatusCode        int16              `json:"statusCode,omitempty"`
	TagMap            map[string]string  `json:"tagMap,omitempty"`
	StringTagMap      map[string]string  `json:"stringTagMap,omitempty"`
	NumberTagMap      map[string]float64 `json:"numberTagMap,omitempty"`
	BoolTagMap        map[string]bool    `json:"boolTagMap,omitempty"`
	Events            []string           `json:"event,omitempty"`
	HasError          bool               `json:"hasError,omitempty"`
}

func (t *TraceModel) MarshalLogObject(enc zapcore.ObjectEncoder) error {
	enc.AddString("traceId", t.TraceId)
	enc.AddString("spanId", t.SpanId)
	enc.AddString("name", t.Name)
	enc.AddUint64("durationNano", t.DurationNano)
	enc.AddUint64("startTimeUnixNano", t.StartTimeUnixNano)
	enc.AddString("serviceName", t.ServiceName)
	enc.AddInt8("kind", t.Kind)
	enc.AddInt16("statusCode", t.StatusCode)
	enc.AddBool("hasError", t.HasError)
	enc.AddArray("references", &t.References)
	enc.AddString("tagMap", fmt.Sprintf("%v", t.TagMap))
	enc.AddString("event", fmt.Sprintf("%v", t.Events))
	return nil
}

type references []OtelSpanRef

func (s *references) MarshalLogArray(enc zapcore.ArrayEncoder) error {
	for _, e := range *s {
		err := enc.AppendObject(&e)
		if err != nil {
			return err
		}
	}
	return nil
}

type Span struct {
	TraceId            string             `json:"traceId,omitempty"`
	SpanId             string             `json:"spanId,omitempty"`
	ParentSpanId       string             `json:"parentSpanId,omitempty"`
	Name               string             `json:"name,omitempty"`
	DurationNano       uint64             `json:"durationNano,omitempty"`
	StartTimeUnixNano  uint64             `json:"startTimeUnixNano,omitempty"`
	ServiceName        string             `json:"serviceName,omitempty"`
	Kind               int8               `json:"kind,omitempty"`
	StatusCode         int16              `json:"statusCode,omitempty"`
	ExternalHttpMethod string             `json:"externalHttpMethod,omitempty"`
	HttpUrl            string             `json:"httpUrl,omitempty"`
	HttpMethod         string             `json:"httpMethod,omitempty"`
	HttpHost           string             `json:"httpHost,omitempty"`
	HttpRoute          string             `json:"httpRoute,omitempty"`
	HttpCode           string             `json:"httpCode,omitempty"`
	MsgSystem          string             `json:"msgSystem,omitempty"`
	MsgOperation       string             `json:"msgOperation,omitempty"`
	ExternalHttpUrl    string             `json:"externalHttpUrl,omitempty"`
	Component          string             `json:"component,omitempty"`
	DBSystem           string             `json:"dbSystem,omitempty"`
	DBName             string             `json:"dbName,omitempty"`
	DBOperation        string             `json:"dbOperation,omitempty"`
	PeerService        string             `json:"peerService,omitempty"`
	Events             []string           `json:"event,omitempty"`
	ErrorEvent         Event              `json:"errorEvent,omitempty"`
	ErrorID            string             `json:"errorID,omitempty"`
	ErrorGroupID       string             `json:"errorGroupID,omitempty"`
	TagMap             map[string]string  `json:"tagMap,omitempty"`
	StringTagMap       map[string]string  `json:"stringTagMap,omitempty"`
	NumberTagMap       map[string]float64 `json:"numberTagMap,omitempty"`
	BoolTagMap         map[string]bool    `json:"boolTagMap,omitempty"`
	ResourceTagsMap    map[string]string  `json:"resourceTagsMap,omitempty"`
	HasError           bool               `json:"hasError,omitempty"`
	TraceModel         TraceModel         `json:"traceModel,omitempty"`
	GRPCCode           string             `json:"gRPCCode,omitempty"`
	GRPCMethod         string             `json:"gRPCMethod,omitempty"`
	RPCSystem          string             `json:"rpcSystem,omitempty"`
	RPCService         string             `json:"rpcService,omitempty"`
	RPCMethod          string             `json:"rpcMethod,omitempty"`
	ResponseStatusCode string             `json:"responseStatusCode,omitempty"`
	Tenant             *string            `json:"-"`
	SpanAttributes     []SpanAttribute    `json:"spanAttributes,omitempty"`
	IssueStatus        int8               `json:"issueStatus,omitempty"`
}

type SpanAttribute struct {
	Key         string
	TagType     string
	DataType    string
	StringValue string
	NumberValue float64
	IsColumn    bool
}

func (s *Span) MarshalLogObject(enc zapcore.ObjectEncoder) error {
	enc.AddString("traceId", s.TraceId)
	enc.AddString("spanId", s.SpanId)
	enc.AddString("parentSpanId", s.ParentSpanId)
	enc.AddString("name", s.Name)
	enc.AddUint64("durationNano", s.DurationNano)
	enc.AddUint64("startTimeUnixNano", s.StartTimeUnixNano)
	enc.AddString("serviceName", s.ServiceName)
	enc.AddInt8("kind", s.Kind)
	enc.AddInt16("statusCode", s.StatusCode)
	enc.AddString("externalHttpMethod", s.ExternalHttpMethod)
	enc.AddString("httpUrl", s.HttpUrl)
	enc.AddString("httpMethod", s.HttpMethod)
	enc.AddString("httpHost", s.HttpHost)
	enc.AddString("httpRoute", s.HttpRoute)
	enc.AddString("httpCode", s.HttpCode)
	enc.AddString("msgSystem", s.MsgSystem)
	enc.AddString("msgOperation", s.MsgOperation)
	enc.AddString("externalHttpUrl", s.ExternalHttpUrl)
	enc.AddString("component", s.Component)
	enc.AddString("dbSystem", s.DBSystem)
	enc.AddString("dbName", s.DBName)
	enc.AddString("dbOperation", s.DBOperation)
	enc.AddString("peerService", s.PeerService)
	enc.AddString("gRPCCode", s.GRPCCode)
	enc.AddString("gRPCMethod", s.GRPCMethod)
	enc.AddString("rpcSystem", s.RPCSystem)
	enc.AddString("rpcService", s.RPCService)
	enc.AddString("rpcMethod", s.RPCMethod)
	enc.AddString("responseStatusCode", s.ResponseStatusCode)
	enc.AddBool("hasError", s.HasError)
	enc.AddString("errorID", s.ErrorID)
	enc.AddString("errorGroupID", s.ErrorGroupID)
	enc.AddObject("errorEvent", &s.ErrorEvent)
	enc.AddObject("traceModel", &s.TraceModel)
	enc.AddString("event", fmt.Sprintf("%v", s.Events))
	enc.AddString("tagMap", fmt.Sprintf("%v", s.TagMap))

	return nil
}

type OtelSpanRef struct {
	TraceId string `json:"traceId,omitempty"`
	SpanId  string `json:"spanId,omitempty"`
	RefType string `json:"refType,omitempty"`
}

func (r *OtelSpanRef) MarshalLogObject(enc zapcore.ObjectEncoder) error {
	enc.AddString("traceId", r.TraceId)
	enc.AddString("spanId", r.SpanId)
	enc.AddString("refType", r.RefType)
	return nil
}
