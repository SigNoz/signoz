<p align="center">
  <img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />

  <p align="center">Überwache define Anwendungen und behebe Problem in deinen bereitgestellten Anwendungen. SigNoz ist eine Open Source Alternative zu DataDog, New Relic, etc.</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/query-service?label=Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability">
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a>
</p>

<h3 align="center">
  <a href="https://signoz.io/docs"><b>Dokumentation</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.md"><b>Readme auf Englisch </b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.zh-cn.md"><b>ReadMe auf Chinesisch</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.pt-br.md"><b>ReadMe auf Portugiesisch</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Slack Community</b></a> &bull;
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

##

SigNoz hilft Entwicklern, Anwendungen zu überwachen und Problem in ihren bereitgestellten Anwendungen zu beheben. Mit SigNoz können Sie Folgendes tun:

👉 Visualisieren Sie Metriken, Traces und Logs in einer einzigen Oberfläche.

👉 Sie können Metriken wie die p99-Latenz, Fehlerquoten für Ihre Dienste, externe API-Aufrufe und individuelle Endpunkte anzeigen.

👉 Sie können die Ursache des Problems ermitteln, indem Sie zu den genauen Traces gehen, die das Problem verursachen, und detaillierte Flammenbilder einzelner Anfragetraces anzeigen.

👉 Führen Sie Aggregationen auf Trace-Daten durch, um geschäftsrelevante Metriken zu erhalten.

👉 Filtern und Abfragen von Logs, Erstellen von Dashboards und Benachrichtigungen basierend auf Attribute in den Logs.

👉 Automatische Aufzeichnung von Ausnahmen in Python, Java, Ruby und Javascript.

👉 Einfache Einrichtung von Benachrichtigungen mit dem selbst erstellbaren Abfrage-Builder.

##

### Anwendung Metriken

![application_metrics](https://user-images.githubusercontent.com/83692067/226637410-900dbc5e-6705-4b11-a10c-bd0faeb2a92f.png)

### Verteiltes Tracing

<img width="2068" alt="distributed_tracing_2 2" src="https://user-images.githubusercontent.com/83692067/226536447-bae58321-6a22-4ed3-af80-e3e964cb3489.png">

<img width="2068" alt="distributed_tracing_1" src="https://user-images.githubusercontent.com/83692067/226536462-939745b6-4f9d-45a6-8016-814837e7f7b4.png">

### Log Verwaltung

<img width="2068" alt="logs_management" src="https://user-images.githubusercontent.com/83692067/226536482-b8a5c4af-b69c-43d5-969c-338bd5eaf1a5.png">

### Infrastruktur Überwachung

<img width="2068" alt="infrastructure_monitoring" src="https://user-images.githubusercontent.com/83692067/226536496-f38c4dbf-e03c-4158-8be0-32d4a61158c7.png">

### Exceptions Monitoring

![exceptions_light](https://user-images.githubusercontent.com/83692067/226637967-4188d024-3ac9-4799-be95-f5ea9c45436f.png)

### Alarme

<img width="2068" alt="alerts_management" src="https://user-images.githubusercontent.com/83692067/226536548-2c81e2e8-c12d-47e8-bad7-c6be79055def.png">

<br /><br />

## Werde Teil unserer Slack Community

Sag Hi zu uns auf [Slack](https://signoz.io/slack) 👋

<br /><br />

## Funktionen:

- Einheitliche Benutzeroberfläche für Metriken, Traces und Logs. Keine Notwendigkeit, zwischen Prometheus und Jaeger zu wechseln, um Problem zu debuggen oder ein separates Log-Tool wie Elastic neben Ihrer Metriken- und Traces-Stack zu verwenden.
- Überblick über Anwendungsmetriken wie RPS, Latenzzeiten des 50tes/90tes/99tes Perzentils und Fehlerquoten.
- Langsamste Endpunkte in Ihrer Anwendung.
- Zeigen Sie genaue Anfragetraces an, um Problem in nachgelagerten Diensten, langsamen Datenbankabfragen oder Aufrufen von Drittanbieterdiensten wie Zahlungsgateways zu identifizieren.
- Filtern Sie Traces nach Dienstname, Operation, Latenz, Fehler, Tags/Annotationen.
- Führen Sie Aggregationen auf Trace-Daten (Ereignisse/Spans) durch, um geschäftsrelevante Metriken zu erhalten. Beispielsweise können Sie die Fehlerquote und die 99tes Perzentillatenz für `customer_type: gold` oder `deployment_version: v2` oder `external_call: paypal` erhalten.
- Native Unterstützung für OpenTelemetry-Logs, erweiterten Log-Abfrage-Builder und automatische Log-Sammlung aus dem Kubernetes-Cluster.
- Blitzschnelle Log-Analytik ([Logs Perf. Benchmark](https://signoz.io/blog/logs-performance-benchmark/))
- End-to-End-Sichtbarkeit der Infrastrukturleistung, Aufnahme von Metriken aus allen Arten von Host-Umgebungen.
- Einfache Einrichtung von Benachrichtigungen mit dem selbst erstellbaren Abfrage-Builder.

<br /><br />

## Wieso SigNoz?

Also Entwickler fanden wir es anstrengend, uns für jede kleine Function, die wir haben wollten, auf Closed Source SaaS Anbieter verlassen zu müssen. Closed Source Anbieter überraschen ihre Kunden zum Monatsende oft mit hohen Rechnungen, die keine Transparenz bzgl. der Kostenaufteilung bieten.

Wir wollten eine selbst gehostete, Open Source Variante von Lösungen wie DataDog, NewRelic für Firmen anbieten, die Datenschutz und Sicherheitsbedenken haben, bei der Weitergabe von Kundendaten an Drittanbieter.

Open Source gibt dir außerdem die totale Kontrolle über define Konfiguration, Stichprobenentnahme und Betriebszeit. Du kannst des Weiteren neue Module auf Basis von SigNoz bauen, die erweiterte, geschäftsspezifische Funktionen anbieten.

### Languages supported:

Wir unterstützen [OpenTelemetry](https://opentelemetry.io) also Bibliothek, mit der Sie Ihre Anwendungen instrumentieren können. Daher wird jedes von OpenTelemetry unterstützte Framework und jede Sprache auch von SignNoz unterstützt. Einige der wichtigsten unterstützten Sprachen sind:

- Java
- Python
- NodeJS
- Go
- PHP
- .NET
- Ruby
- Elixir
- Rust

Hier findest du die vollständige Liste von unterstützten Programmiersprachen - https://opentelemetry.io/docs/

<br /><br />

## Erste Schritte mit SigNoz

### Bereitstellung mit Docker

Bitte folge den [hier](https://signoz.io/docs/install/docker/) aufgelisteten Schritten um define Anwendung mit Docker bereitzustellen.

Die [Anleitungen zur Fehlerbehebung](https://signoz.io/docs/install/troubleshooting/) könnten hilfreich sein, falls du auf irgendwelche Schwierigkeiten stößt.

<p>&nbsp  </p>

### Deploy in Kubernetes using Helm

Bitte folge den [hier](https://signoz.io/docs/deployment/helm_chart) aufgelisteten Schritten, um define Anwendung mit Helm Charts bereitzustellen.

<br /><br />

## Vergleiche mit bekannten Tools

### SigNoz vs Prometheus

Prometheus ist gut, falls du dich nur für Metriken interessierst. Wenn du eine nahtlose Integration von Metriken und Einzelschritt-Fehlersuchen haben möchtest, ist die Kombination aus Prometheus und Jaeger nicht das Richtige für dich.

Unser Ziel ist es, eine integrierte Benutzeroberfläche aus Metriken und Einzelschritt-Fehlersuchen anzubieten, ähnlich wie es SaaS Anbieter wie Datadog tun, mit der Möglichkeit von erweitertem filtern und aggregieren von Fehlersuchen. Etwas, was in Jaeger aktuell fehlt.

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaeger kümmert sich nur um verteilte Einzelschritt-Fehlersuche. SigNoz erstellt sowohl Metriken also auch Einzelschritt-Fehlersuche, daneben haben wir auch Protokoll Verwaltung auf unserem Plan.

Außerdem hat SigNoz noch mehr spezielle Funktionen im Vergleich zu Jaeger:

- Jaeger UI zeigt keine Metriken für Einzelschritt-Fehlersuchen oder für gefilterte Einzelschritt-Fehlersuchen an.
- Jaeger erstellt keine Aggregate für gefilterte Einzelschritt-Fehlersuchen, z. B. die P99 Latenz von Abfragen mit dem Tag `customer_type=premium`, was hingegen mit SigNoz leicht umsetzbar ist.

<p>&nbsp  </p>

### SigNoz vs Elastic

- Die Verwaltung von SigNoz-Protokollen basiert auf 'ClickHouse', einem spaltenbasierten OLAP-Datenspeicher, der aggregierte Protokollanalyseabfragen wesentlich effizienter macht.
- 50 % geringerer Ressourcenbedarf im Vergleich zu Elastic während der Aufnahme.

Wir haben Benchmarks veröffentlicht, die Elastic mit SignNoz vergleichen. Schauen Sie es sich [hier](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<p>&nbsp  </p>

### SigNoz vs Loki

- SigNoz unterstützt Aggregationen von Daten mit hoher Kardinalität über ein großes Volumen, Loki hingegen nicht.
- SigNoz unterstützt Indizes über Daten mit hoher Kardinalität und hat keine Beschränkungen hinsichtlich der Anzahl der Indizes, während Loki maximale Streams erreicht, wenn ein paar Indizes hinzugefügt werden.
- Das Durchsuchen großer Datenmengen ist in Loki im Vergleich zu SigNoz schwierig und langsam.

Wir haben Benchmarks veröffentlicht, die Loki mit SigNoz vergleichen. Schauen Sie es sich [hier](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<br /><br />

## Zum Projekt beitragen

Wir ❤️ Beiträge zum Projekt, equal ob große oder kleine. Bitte lies dir zuerst die [CONTRIBUTING.md](CONTRIBUTING.md), durch, bevor du anfängst, Beiträge zu SigNoz zu machen.
Du bist dir nicht sicher, wie du anfangen sollst? Schreib uns einfach auf dem #contributing Kanal in unserer [slack community](https://signoz.io/slack)

<br /><br />

## Dokumentation

Du findest unsere Dokumentation under https://signoz.io/docs/. Falls etwas unverständlich ist oder fehlt, öffne gerne ein Github Issue mit dem Label `documentation` oder schreib uns über den Community Slack Channel.

<br /><br />

## Gemeinschaft

Werde Teil der [slack community](https://signoz.io/slack) um mehr über verteilte Einzelschritt-Fehlersuche, Messung von Systemzuständen oder SigNoz zu erfahren und sich mit anderen Nutzern und Mitwirkenden in Verbindung zu setzen.

Falls du irgendwelche Ideen, Fragen oder Feedback hast, kannst du sie gerne über unsere [Github Discussions](https://github.com/SigNoz/signoz/discussions) mit uns teilen.

Wie immer, Dank an unsere großartigen Mitwirkenden!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>
