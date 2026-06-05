<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme-assets/signoz-hero-dark.png" width="900">
    <source media="(prefers-color-scheme: light)" srcset="docs/readme-assets/signoz-hero-light.png" width="900">
    <img alt="SigNoz - Observability nach deinen Bedingungen, basierend auf offenen Standards." src="docs/readme-assets/signoz-hero-light.png" width="900">
  </picture>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-cn.md">中文</a> ·
  <a href="README.pt-br.md">Português</a>
</p>

SigNoz ist eine Open-Source-Observability-Plattform auf Basis von OpenTelemetry. Wir bauen eine Enterprise-taugliche Alternative zu fragmentierten Monitoring-Stacks, mit Logs, Metriken, Traces, Alerts und Dashboards an einem Ort.

### Wähle, wie du SigNoz betreibst

#### SigNoz Cloud (empfohlen)

Vollständig verwaltetes SigNoz mit 30 Tagen kostenloser Testphase, ohne Kreditkarte, nutzungsbasierter Preisgestaltung ab 49 USD und regionalem Datenhosting.

[**Kostenlos starten →**](https://signoz.io/teams/)

#### Enterprise

Enterprise Cloud, BYOC oder Enterprise Self-Hosted mit Compliance, Support, benutzerdefinierter Aufbewahrung, RBAC, Ingestion Controls, Datenresidenz und Regionsauswahl.

[**Enterprise entdecken →**](https://signoz.io/enterprise/)

#### Community

Kostenloses Open-Source-SigNoz, das in deiner eigenen Infrastruktur läuft. Deployment mit Docker, Kubernetes oder Linux, während du die volle Kontrolle über deine Datenebene behältst.

[**SigNoz installieren →**](https://signoz.io/docs/install/self-host/)

### Was kannst du überwachen?

SigNoz hilft Teams, Produktionsprobleme schneller zu debuggen, indem Logs, Metriken, Traces, Alerts, Dashboards, Exceptions und agent-native Workflows an einem Ort verbunden werden.

#### APM-Überblick

Überwache Service-Latenz, Fehlerrate, Durchsatz, Apdex, wichtige Endpunkte, Datenbankaufrufe und externe Aufrufe.

<p align="center">
  <img alt="SigNoz APM-Dashboard mit Latenz, Durchsatz, Apdex und wichtigen Operationen" src="docs/readme-assets/monitor/apm.png" width="900">
</p>

#### Log-Management

Erfasse, suche, aggregiere und korreliere Logs mit Traces und Metriken über einen visuellen Query Builder.

<p align="center">
  <img alt="SigNoz Logs Explorer mit Filtern, Frequenzdiagramm und Log-Zeilen" src="docs/readme-assets/monitor/log-management.svg" width="900">
</p>

#### Metriken und Dashboards

Erstelle Dashboards für Anwendungs-, Infrastruktur- und benutzerdefinierte Metriken mit Query Builder, PromQL oder ClickHouse SQL.

<p align="center">
  <img alt="SigNoz Host-Metrics-Dashboard mit Systemlast- und Netzwerkdiagrammen" src="docs/readme-assets/monitor/metrics.png" width="900">
</p>

#### Infrastruktur-Monitoring

Überwache Kubernetes-Cluster, Pods, Nodes, Workloads sowie Host-CPU, Arbeitsspeicher, Festplatten, Netzwerk, Logs und Traces.

<p align="center">
  <img alt="SigNoz Kubernetes-Infrastruktur-Dashboard mit Pod- und Node-Metriken" src="docs/readme-assets/monitor/infrastructure.png" width="900">
</p>

#### LLM- und AI-Observability

Verfolge LLM-Apps, RAG-Pipelines, Prompts, Tool Calls, Tokens, Latenz und Kosten zusammen mit Anwendungs- und Infrastruktur-Telemetrie.

<p align="center">
  <img alt="SigNoz LLM-Observability-Dashboard für Traces, Token-Nutzung, Latenz und Kosten" src="docs/readme-assets/monitor/llm.png" width="900">
</p>

#### Agent-Native Observability und MCP

Ermögliche AI-Coding-Assistenten, SigNoz-Telemetrie über MCP abzufragen, Traces, Logs, Alerts und Dashboards zu prüfen und Incidents mit den Runbooks deines Teams zu untersuchen.

<p align="center">
  <img alt="SigNoz agent-native Observability-Oberfläche mit Kontext für AI-Assistenten-Workflows" src="docs/readme-assets/monitor/agent-native.png" width="900">
</p>

#### Distributed Tracing

Verfolge Requests über Services hinweg mit Flamegraphs, Waterfalls, Span Events, Filtern und Trace Analytics.

<p align="center">
  <img alt="SigNoz Distributed-Tracing-Ansicht mit Flamegraph und Waterfall-Spans" src="docs/readme-assets/monitor/distributed-tracing.png" width="900">
</p>

#### Trace Funnels

Erstelle Funnels aus Traces, um Drop-offs im Request-Flow, fehlgeschlagene Übergänge und systemische Workflow-Probleme zu verstehen.

<p align="center">
  <img alt="SigNoz Trace Funnels mit Request-Flow-Drop-offs und fehlgeschlagenen Übergängen" src="docs/readme-assets/monitor/trace-funnels.png" width="900">
</p>

Du kannst außerdem **Exceptions**, **Alerts**, **externe APIs** und **Integrationen** für OpenTelemetry, Prometheus, Kubernetes, Cloud-Anbieter, Sprach-SDKs, Application Frameworks, Datenbanken und LLM-Tools überwachen.

### Warum Teams SigNoz nutzen

1. **OpenTelemetry-native**<br>
   Einmal mit offenen Standards instrumentieren und die Kontrolle über deine Telemetrie behalten.
2. **Korrelierte Signale**<br>
   Von Service-Charts zu Traces, Logs, Infrastrukturmetriken und Exceptions wechseln, ohne das Tool zu wechseln.
3. **Eine einzelne spaltenorientierte Datenbank**<br>
   Gebaut für hochkardinale Observability-Workloads mit hohem Volumen.
4. **Vorhersehbare Preise**<br>
   Keine Preise pro Host, keine Preise pro Nutzerplatz und keine Sonderpreise für Custom Metrics.
5. **Enterprise-ready**<br>
   SOC 2 Type II und HIPAA Compliance, RBAC, Ingestion Controls, benutzerdefinierte Aufbewahrung, Support, BYOC und Self-Hosting.

### Erste Schritte

#### Mit Cloud starten

Erstelle einen verwalteten SigNoz-Workspace und erhalte dein erstes Dashboard, ohne Observability-Infrastruktur betreiben zu müssen.

[**Kostenlos mit SigNoz Cloud starten**](https://signoz.io/teams/)

#### SigNoz selbst hosten

Betreibe SigNoz in deiner eigenen Infrastruktur mit Docker, Kubernetes oder Linux.

[**Docker**](https://signoz.io/docs/install/docker/) · [**Kubernetes**](https://signoz.io/docs/install/kubernetes/) · [**Linux**](https://signoz.io/docs/install/linux/)

#### Daten senden

Instrumentiere Anwendungen und Infrastruktur mit OpenTelemetry, Prometheus, Sprach-SDKs und Integrationen.

[**Instrumentation**](https://signoz.io/docs/instrumentation/) · [**Integrationen**](https://signoz.io/docs/integrations/integrations-list/)

### Vergleich mit bekannten Tools

SigNoz wird häufig von Teams eingeführt, die von einzelnen Spezialtools oder kommerziellen Plattformen mit unvorhersehbarer Preisgestaltung wechseln.

**Prometheus**<br>
Gut, wenn du nur Metriken brauchst. SigNoz hält Metriken, Logs, Traces, Dashboards und Alerts zusammen, damit Teams mit korreliertem Kontext debuggen können.

**Jaeger**<br>
Jaeger macht ausschließlich Distributed Tracing. SigNoz ergänzt Metriken, Logs, Trace Analytics, Dashboards, Alerts, Exceptions und Trace-to-Log-Workflows.

**Elastic**<br>
SigNoz nutzt eine spaltenorientierte Datenbank für effiziente Observability-Analysen und hochkardinale Log-Workloads, mit 50 % geringerem Ressourcenbedarf gegenüber Elastic während der Ingestion. Lies die [detaillierte Studie](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark).

**Loki**<br>
Im verlinkten Benchmark indexierte SigNoz alle Keys im Test-Setup, während Loki beim Hinzufügen weiterer Labels Max-Stream-Fehler erreichte. Lies die [detaillierte Studie](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark).

---

Tritt der <a href="https://signoz.io/slack">SigNoz Slack Community</a> bei, lies die <a href="https://signoz.io/docs/">Dokumentation</a> oder starte eine Diskussion in <a href="https://github.com/SigNoz/signoz/discussions">GitHub Discussions</a>.

Beiträge sind willkommen. Lies <a href="CONTRIBUTING.md">CONTRIBUTING.md</a>, um loszulegen.

Wie immer: Danke an unsere großartigen Contributors!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img alt="SigNoz Contributors" src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>
