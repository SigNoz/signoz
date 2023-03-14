<p align="center">
  <img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />
  
  <p align="center">Überwache deine Anwendungen und behebe Probleme in deinen bereitgestellten Anwendungen. SigNoz ist eine Open Source Alternative zu DataDog, New Relic, etc.</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/frontend?label=Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>
  
  
<h3 align="center">
  <a href="https://signoz.io/docs"><b>Dokumentation</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.zh-cn.md"><b>ReadMe auf Chinesisch</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.pt-br.md"><b>ReadMe auf Portugiesisch</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Slack Community</b></a> &bull;
  <a href="https://twitter.com/SigNozHQ"><b>Twitter</b></a>
</h3>

## 

SigNoz hilft Entwicklern, Anwendungen zu überwachen und Probleme in ihren bereitgestellten Anwendungen zu beheben. SigNoz benutzt verteilte Einzelschritt-Fehlersuchen, um Einblick in deinen Software-Stack zu bekommen.

👉 Du kannst Werte wie die P99-Latenz und die Fehler Häufigkeit von deinen Services, externen API Aufrufen und einzelnen Endpunkten sehen.

👉 Du kannst die Ursache des Problems finden, indem du zu dem Einzelschritt gehst, der das Problem verursacht und dir detaillierte Flamegraphs von einzelnen Abfragefehlersuchen anzeigen lassen.

👉 Erstelle Aggregate auf Basis von Fehlersuche Daten, um geschäftsrelevante Metriken zu erhalten.

![SigNoz Feature](https://signoz-public.s3.us-east-2.amazonaws.com/signoz_hero_github.png)

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## Werde Teil unserer Slack Community

Sag Hi zu uns auf [Slack](https://signoz.io/slack) 👋

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Features.svg" width="50px" />

## Funktionen:

- Übersichtsmetriken deiner Anwendung wie RPS, 50tes/90tes/99tes Quantil Latenzen und Fehler Häufigkeiten.
- Übersicht der langsamsten Endpunkte deiner Anwendung.
- Sieh dir die genaue Einzelschritt-Fehlersuche deiner Abfrage an, um Fehler in nachgelagerten Diensten, langsamen Datenbank Abfragen und Aufrufen von Drittanbieter Diensten wie Zahlungsportalen, etc. zu finden.
- Filtere Einzelschritt-Fehlersuchen nach Dienstname, Latenz, Fehler, Stichworten/ Anmerkungen.
- Führe Aggregate auf Basis von Einzelschritt-Fehlersuche Daten (Ereignisse/Abstände) aus, um geschäftsrelevante Metriken zu erhalten. Du kannst dir z. B. die Fehlerrate und 99tes Quantil Latenz von `customer_type: gold`, `deployment_version: v2` oder `external_call: paypal` ausgeben lassen.
- Einheitliche Benutzeroberfläche für Metriken und Einzelschritt-Fehlersuchen. Du musst nicht zwischen Prometheus und Jaeger hin und her wechseln, um Fehler zu beheben.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/WhatsCool.svg" width="50px" />

## Wieso SigNoz?

Als Entwickler fanden wir es anstrengend, uns für jede kleine Funktion, die wir haben wollten, auf Closed Source SaaS Anbieter verlassen zu müssen. Closed Source Anbieter überraschen ihre Kunden zum Monatsende oft mit hohen Rechnungen, die keine Transparenz bzgl. der Kostenaufteilung bieten.

Wir wollten eine selbst gehostete, Open Source Variante von Lösungen wie DataDog, NewRelic für Firmen anbieten, die Datenschutz und Sicherheitsbedenken haben, bei der Weitergabe von Kundendaten an Drittanbieter.

Open Source gibt dir außerdem die totale Kontrolle über deine Konfiguration, Stichprobenentnahme und Betriebszeit. Du kannst des Weiteren neue Module auf Basis von SigNoz bauen, die erweiterte, geschäftsspezifische Funktionen anbieten.

### Unterstützte Programmiersprachen:

Wir unterstützen [OpenTelemetry](https://opentelemetry.io) als die Software Library, die du nutzen kannst um deine Anwendungen auszuführen. Jedes Framework und jede Sprache die von OpenTelemetry unterstützt wird, wird auch von SigNoz unterstützt. Einige der unterstützten, größeren Programmiersprachen sind:

- Java
- Python
- NodeJS
- Go

Hier findest du die vollständige Liste von unterstützten Programmiersprachen - https://opentelemetry.io/docs/

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Philosophy.svg" width="50px" />

## Erste Schritte mit SigNoz
  
  
### Bereitstellung mit Docker

Bitte folge den [hier](https://signoz.io/docs/install/docker/) aufgelisteten Schritten um deine Anwendung mit Docker bereitzustellen.

Die [Anleitungen zur Fehlerbehebung](https://signoz.io/docs/install/troubleshooting/) könnten hilfreich sein, falls du auf irgendwelche Schwierigkeiten stößt.

<p>&nbsp  </p>
  
  
### Bereitstellung mit Kubernetes und Helm

Bitte folge den [hier](https://signoz.io/docs/deployment/helm_chart) aufgelisteten Schritten, um deine Anwendung mit Helm Charts bereitzustellen.
  

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/UseSigNoz.svg" width="50px" />

## Vergleiche mit anderen Lösungen

### SigNoz vs. Prometheus

Prometheus ist gut, falls du dich nur für Metriken interessierst. Wenn du eine nahtlose Integration von Metriken und Einzelschritt-Fehlersuchen haben möchtest, ist die Kombination aus Prometheus und Jaeger nicht das Richtige für dich.

Unser Ziel ist es, eine integrierte Benutzeroberfläche aus Metriken und Einzelschritt-Fehlersuchen anzubieten, ähnlich wie es SaaS Anbieter wie Datadog tun, mit der Möglichkeit von erweitertem filtern und aggregieren von Fehlersuchen. Etwas, was in Jaeger aktuell fehlt.

<p>&nbsp  </p>

### SigNoz vs. Jaeger

Jaeger kümmert sich nur um verteilte Einzelschritt-Fehlersuche. SigNoz erstellt sowohl Metriken als auch Einzelschritt-Fehlersuche, daneben haben wir auch Protokoll Verwaltung auf unserem Plan.

Außerdem hat SigNoz noch mehr spezielle Funktionen im Vergleich zu Jaeger:

- Jaeger UI zeigt keine Metriken für Einzelschritt-Fehlersuchen oder für gefilterte Einzelschritt-Fehlersuchen an
- Jaeger erstellt keine Aggregate für gefilterte Einzelschritt-Fehlersuchen, z. B. die P99 Latenz von Abfragen mit dem Tag - customer_type='premium', was hingegen mit SigNoz leicht umsetzbar ist.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributors.svg" width="50px" />

## Zum Projekt beitragen


Wir ❤️  Beiträge zum Projekt, egal ob große oder kleine. Bitte lies dir zuerst die [CONTRIBUTING.md](CONTRIBUTING.md) durch, bevor du anfängst, Beiträge zu SigNoz zu machen.

Du bist dir nicht sicher, wie du anfangen sollst? Schreib uns einfach auf dem `#contributing` Kanal in unserer [Slack Community](https://signoz.io/slack).

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/DevelopingLocally.svg" width="50px" />

## Dokumentation

Du findest unsere Dokumentation unter https://signoz.io/docs/. Falls etwas unverständlich ist oder fehlt, öffne gerne ein Github Issue mit dem Label `documentation` oder schreib uns über den Community Slack Channel.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## Community

Werde Teil der [Slack Community](https://signoz.io/slack) um mehr über verteilte Einzelschritt-Fehlersuche, Messung von Systemzuständen oder SigNoz zu erfahren und sich mit anderen Nutzern und Mitwirkenden in Verbindung zu setzen.

Falls du irgendwelche Ideen, Fragen oder Feedback hast, kannst du sie gerne über unsere [Github Discussions](https://github.com/SigNoz/signoz/discussions) mit uns teilen.

Wie immer, danke an unsere großartigen Unterstützer!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>



