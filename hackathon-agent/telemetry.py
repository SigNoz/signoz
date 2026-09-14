"""
telemetry.py - OpenTelemetry setup for ANO agents.
Karpathy rule: instrument everything, measure everything.
"""
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from openinference.instrumentation.langchain import LangChainInstrumentor


def setup_telemetry(service_name: str, endpoint: str) -> trace.Tracer:
    """
    Initialize OpenTelemetry and return a Tracer for manual spans.
    Also auto-instruments LangChain so every LLM call is traced.
    """
    resource = Resource(attributes={"service.name": service_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Auto-instrument LangChain — every invoke() call becomes a span
    LangChainInstrumentor().instrument()

    tracer = trace.get_tracer(service_name)
    print(f"[telemetry] {service_name} -> sending traces to {endpoint}")
    return tracer
