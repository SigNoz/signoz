package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"gitlab.com/signoz-public/goka"
	sp "gitlab.com/signoz-public/spanprocessor"
	"gitlab.com/signoz-public/spanprocessor/consumer/pdata"
	"go.opentelemetry.io/collector/translator/conventions"
	"go.uber.org/zap"
)

/*

Some error message when processor is kept for running for long duration

	1. Restoring from local storage on application restart
	2. goka best practices
	3. Every persist call writes to kafka topic otel-collector-table with increasing number of spans
	4. In Goka a single processor cannot work with 2 stores? What if I need 2 tables?
	5. Goka does not have Punctuator analogy
	6. The key is used to find the partition. Why do we have just 1 partition?

	Notes:
	1. goka.Context is changed to have setKey func and correctly read key from []byte using hex.EncodeToString
	2. What to do if we receive a span after TIMEOUT_INTERVAL? -> no logic has been implemented
	3. go-routines started are never cleared after Done()
	4. Delete key from table -> gives error


*/

var (
	brokers                  = []string{os.Getenv("KAFKA_BROKER")}
	INPUT_TOPIC  goka.Stream = goka.Stream(os.Getenv("KAFKA_INPUT_TOPIC"))
	OUTPUT_TOPIC goka.Stream = goka.Stream(os.Getenv("KAFKA_OUTPUT_TOPIC"))
	group        goka.Group  = "flattener"
)

type Span struct {
	TraceId            string
	SpanId             string
	ParentSpanId       string
	Name               string
	DurationNano       uint64
	StartTimeUnixNano  uint64
	ServiceName        string
	Kind               int32
	References         []OtelSpanRef
	Tags               []string
	TagsKeys           []string
	TagsValues         []string
	StatusCode         int64
	ExternalHttpMethod string
	ExternalHttpUrl    string
	Component          string
	DBSystem           string
	DBName             string
	DBOperation        string
	PeerService        string
}

type OtelSpanRef struct {
	TraceId string
	SpanId  string
	RefType string
}

var unmarshaller = sp.DefaultUnmarshallers()["otlp_proto"]
var marshaller = sp.DefaultMarshallers()["otlp_proto"]

type OtelCodec struct{}
type OutputCodec struct{}

func (c *OutputCodec) Encode(value interface{}) ([]byte, error) {
	// fmt.Println("Encoding to LevelDB ...")

	// st := value.(*StructuredTrace)
	// for _, span := range st.spans {
	// 	fmt.Println(span.Name)
	// }

	b, err := json.Marshal(value)
	// os.Stderr.Write(b)
	return b, err
}

func (c *OutputCodec) Decode(data []byte) (interface{}, error) {
	// fmt.Println("Decoding from LevelDB ...")
	var ss Span
	err := json.Unmarshal(data, &ss)
	return &ss, err
}

func (c *OtelCodec) Encode(value interface{}) ([]byte, error) {
	// fmt.Println("Encoding Otel Traces ...")
	// messages, err = marshaller.Marshal(td)
	// return messages, err
	return json.Marshal(value)
}

func (c *OtelCodec) Decode(data []byte) (interface{}, error) {
	// fmt.Println("Decoding Otel Traces ...")
	traces, err := unmarshaller.Unmarshal(data)
	// printTraces(&traces)
	return &traces, err
}

func makeJaegerProtoReferences(
	links pdata.SpanLinkSlice,
	parentSpanID pdata.SpanID,
	traceID pdata.TraceID,
) ([]OtelSpanRef, error) {

	parentSpanIDSet := len(parentSpanID.Bytes()) != 0
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
			TraceId: traceID.HexString(),
			SpanId:  parentSpanID.HexString(),
			RefType: "CHILD_OF",
		})
	}

	for i := 0; i < links.Len(); i++ {
		link := links.At(i)
		if link.IsNil() {
			continue
		}

		refs = append(refs, OtelSpanRef{
			TraceId: link.TraceID().HexString(),
			SpanId:  link.SpanID().HexString(),

			// Since Jaeger RefType is not captured in internal data,
			// use SpanRefType_FOLLOWS_FROM by default.
			// SpanRefType_CHILD_OF supposed to be set only from parentSpanID.
			RefType: "FOLLOWS_FROM",
		})
	}

	return refs, nil
}

func printTraces(traces_pt *pdata.Traces) {
	traces := *traces_pt
	rss := traces.ResourceSpans()
	for i := 0; i < rss.Len(); i++ {
		fmt.Printf("ResourceSpans #%d\n", i)
		rs := rss.At(i)
		if rs.IsNil() {
			fmt.Println("* Nil ResourceSpans")
			continue
		}
		ilss := rs.InstrumentationLibrarySpans()
		for j := 0; j < ilss.Len(); j++ {
			fmt.Printf("InstrumentationLibrarySpans #%d\n", j)
			ils := ilss.At(j)
			if ils.IsNil() {
				fmt.Printf("* Nil InstrumentationLibrarySpans\n")
				continue
			}

			spans := ils.Spans()
			for k := 0; k < spans.Len(); k++ {
				span := spans.At(k)
				// references := span.Links()
				jReferences, _ := makeJaegerProtoReferences(span.Links(), span.ParentSpanID(), span.TraceID())
				for _, ref := range jReferences {
					fmt.Println(ref.TraceId)
					fmt.Println(ref.SpanId)
					fmt.Println(ref.RefType)
				}
				// traceID := hex.EncodeToString(span.TraceID())
				traceID_bytes := span.TraceID().Bytes()
				traceID := hex.EncodeToString(traceID_bytes[:])
				fmt.Println(traceID)
				// os.Exit(3)
			}
		}
	}
}

func byteSlice2string(byteSlice []byte) string {
	return hex.EncodeToString(byteSlice)
}

func populateOtherDimensions(attributes pdata.AttributeMap, span *Span) {

	attributes.ForEach(func(k string, v pdata.AttributeValue) {
		if k == "http.status_code" {
			span.StatusCode = v.IntVal()
		}
		if k == "http.url" {
			span.ExternalHttpUrl = v.StringVal()
		}
		if k == "http.method" {
			span.ExternalHttpMethod = v.StringVal()
		}
		if k == "component" {
			span.Component = v.StringVal()
		}

		if k == "db.system" {
			span.DBSystem = v.StringVal()
		}
		if k == "db.name" {
			span.DBName = v.StringVal()
		}
		if k == "db.operation" {
			span.DBOperation = v.StringVal()
		}
		if k == "peer.service" {
			span.PeerService = v.StringVal()
		}

	})

}

func newStructuredSpan(otelSpan pdata.Span, ServiceName string) *Span {

	durationNano := uint64(otelSpan.EndTime() - otelSpan.StartTime())
	traceID_bytes := otelSpan.TraceID().Bytes()
	spanID_bytes := otelSpan.SpanID().Bytes()
	parentSpanID_bytes := otelSpan.ParentSpanID().Bytes()

	attributes := otelSpan.Attributes()

	var tags []string
	var tagsKeys []string
	var tagsValues []string
	var tag string

	attributes.ForEach(func(k string, v pdata.AttributeValue) {
		if v.Type().String() == "INT" {
			tag = fmt.Sprintf("%s:%d", k, v.IntVal())
			tagsValues = append(tagsValues, strconv.FormatInt(v.IntVal(), 10))
		} else {
			tag = fmt.Sprintf("%s:%s", k, v.StringVal())
			tagsValues = append(tagsValues, v.StringVal())
		}

		tags = append(tags, tag)
		tagsKeys = append(tagsKeys, k)

	})

	references, _ := makeJaegerProtoReferences(otelSpan.Links(), otelSpan.ParentSpanID(), otelSpan.TraceID())

	var span *Span = &Span{
		TraceId:           hex.EncodeToString(traceID_bytes[:]),
		SpanId:            hex.EncodeToString(spanID_bytes[:]),
		ParentSpanId:      hex.EncodeToString(parentSpanID_bytes[:]),
		Name:              otelSpan.Name(),
		StartTimeUnixNano: uint64(otelSpan.StartTime()),
		DurationNano:      durationNano,
		ServiceName:       ServiceName,
		Kind:              int32(otelSpan.Kind()),
		References:        references,
		Tags:              tags,
		TagsKeys:          tagsKeys,
		TagsValues:        tagsValues,
	}

	populateOtherDimensions(attributes, span)

	return span
}

// ServiceNameForResource gets the service name for a specified Resource.
// TODO: Find a better package for this function.
func ServiceNameForResource(resource pdata.Resource) string {
	// if resource.IsNil() {
	// 	return "<nil-resource>"
	// }

	service, found := resource.Attributes().Get(conventions.AttributeServiceName)
	if !found {
		return "<nil-service-name>"
	}

	return service.StringVal()
}

func process(ctx goka.Context, msg interface{}) {

	traces_ptr := msg.(*pdata.Traces)

	// printTraces(traces_ptr)

	rss := (*traces_ptr).ResourceSpans()
	for i := 0; i < rss.Len(); i++ {
		// fmt.Printf("ResourceSpans #%d\n", i)
		rs := rss.At(i)
		if rs.IsNil() {
			fmt.Println("* Nil ResourceSpans")
			continue
		}

		serviceName := ServiceNameForResource(rs.Resource())

		ilss := rs.InstrumentationLibrarySpans()
		for j := 0; j < ilss.Len(); j++ {
			// fmt.Printf("InstrumentationLibrarySpans #%d\n", j)
			ils := ilss.At(j)
			if ils.IsNil() {
				fmt.Printf("* Nil InstrumentationLibrarySpans\n")
				continue
			}

			spans := ils.Spans()

			for k := 0; k < spans.Len(); k++ {
				span := spans.At(k)
				// traceID := hex.EncodeToString(span.TraceID())
				structuredSpan := newStructuredSpan(span, serviceName)
				ctx.Emit(OUTPUT_TOPIC, structuredSpan.TraceId, structuredSpan)
			}
		}
	}

}

func runProcessor() {

	g := goka.DefineGroup(group,
		goka.Input(INPUT_TOPIC, new(OtelCodec), process),
		goka.Output(OUTPUT_TOPIC, new(OutputCodec)),
	)

	p, err := goka.NewProcessor(brokers, g)
	if err != nil {
		zap.S().Error(err)
		panic(err)
	}

	zap.S().Info("Running flattener processor ...")

	p.Run(context.Background())

}

func main() {
	runProcessor()

}
