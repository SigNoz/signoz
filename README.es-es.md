<h1 align="center" style="border-bottom: none">
    <a href="https://signoz.io" target="_blank">
        <img alt="SigNoz" src="https://github.com/user-attachments/assets/ef9a33f7-12d7-4c94-8908-0a02b22f0c18" width="100" height="100">
    </a>
    <br>SigNoz
</h1>

<p align="center">Todos tus logs, métricas y trazas en un solo lugar. Monitorea tu aplicación, detecta problemas antes de que ocurran y soluciona tiempos de inactividad rápidamente con un contexto rico. SigNoz es una alternativa de código abierto y rentable a Datadog y New Relic. Visita <a href="https://signoz.io" target="_blank">signoz.io</a> para la documentación completa, tutoriales y guías.</p>

<p align="center">
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>
  
  
<h3 align="center">
  <a href="https://signoz.io/docs"><b>Documentación</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.md"><b>ReadMe en inglés</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.zh-cn.md"><b>ReadMe en chino</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.de-de.md"><b>ReadMe en alemán</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.pt-br.md"><b>ReadMe en portugués</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Comunidad de Slack</b></a> &bull;
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

## ✨ Características


### Monitoreo del Rendimiento de Aplicaciones (APM)

Utiliza SigNoz APM para monitorear tus aplicaciones y servicios. Viene con gráficos listos para usar para métricas clave como latencia p99, tasa de errores, Apdex y operaciones por segundo. También puedes registrar llamadas a base de datos y externas desde tu aplicación. Lee [más](https://signoz.io/application-performance-monitoring/).

Puedes [instrumentar](https://signoz.io/docs/instrumentation/) tu aplicación con OpenTelemetry para comenzar.

![apm-cover](https://github.com/user-attachments/assets/fa5c0396-0854-4c8b-b972-9b62fd2a70d2)


### Gestión de Registros (Logs)

SigNoz actúa como una solución centralizada de gestión de logs. Utilizamos ClickHouse (usado por gigantes como Uber y Cloudflare) como almacén de datos ⎯ un almacenamiento extremadamente rápido y optimizado para logs. Busca instantáneamente entre millones de registros con filtros rápidos y un potente constructor de consultas.

Crea gráficos sobre tus logs y monitorealos con dashboards personalizados. Lee [más](https://signoz.io/log-management/).

![logs-management-cover](https://github.com/user-attachments/assets/343588ee-98fb-4310-b3d2-c5bacf9c7384)


### Rastreo Distribuido

Esencial para solucionar problemas en microservicios. Impulsado por OpenTelemetry, el rastreo distribuido en SigNoz te ayuda a seguir las solicitudes de los usuarios a través de múltiples servicios e identificar cuellos de botella.

Visualiza las solicitudes en detalle con Flamegraphs y Diagramas de Gantt. Haz clic en cualquier span ('tramo') para ver la traza completa bellamente representada, lo que te ayudará a entender dónde ocurrieron realmente los problemas.

Lee [más](https://signoz.io/distributed-tracing/).

![distributed-tracing-cover](https://github.com/user-attachments/assets/9bfe060a-0c40-4922-9b55-8a97e1a4076c)



### Métricas y Dashboards

Ingesta métricas de tu infraestructura o aplicaciones y crea dashboards personalizados para monitorearlos. Diseña visualizaciones a medida con paneles variados como gráficos circulares, series temporales, barras, etc.

Crea consultas sobre tus datos métricos rápidamente con una interfaz fácil de usar. Añade múltiples consultas y combínalas con fórmulas para crear análisis complejos al instante.

Lee [más](https://signoz.io/metrics-and-dashboards/).

![metrics-n-dashboards-cover](https://github.com/user-attachments/assets/a536fd71-1d2c-4681-aa7e-516d754c47a5)

### Observabilidad LLM 🤖

Monitorea y depura tus aplicaciones de Grandes Modelos de Lenguaje (LLM) con observabilidad completa. Rastrea llamadas LLM, analiza el uso de tokens, monitorea el rendimiento y obtén información sobre el comportamiento de tu IA en producción.

La observabilidad LLM de SigNoz te ayuda a entender el rendimiento de tus modelos, identificar problemas con prompts y respuestas, rastrear costos y optimizar la fiabilidad.

[Comienza con Observabilidad LLM →](https://signoz.io/docs/llm-observability/)

![llm-observability-cover](https://github.com/user-attachments/assets/a6cc0ca3-59df-48f9-9c16-7c843fccff96)


### Alertas 🔔

Recibe notificaciones cuando algo inusual ocurra. Configura alertas sobre cualquier señal (logs, métricas, trazas), define umbrales y canales de notificación. Funciones avanzadas incluyen historial de alertas y detección de anomalías.

Identifica problemas proactivamente antes de que afecten a tus clientes.

Lee [más](https://signoz.io/alerts-management/).

![alerts-cover](https://github.com/user-attachments/assets/03873bb8-1b62-4adf-8f56-28bb7b1750ea)

### Monitoreo de Excepciones 🐛

Monitorea excepciones automáticamente en Python, Java, Ruby y Javascript. Para otros lenguajes, solo añade unas líneas de código.

Ve el stack trace detallado de todas las excepciones. Registra atributos personalizados para añadir contexto; por ejemplo, identifica qué usuario experimentó el error.

Lee [más](https://signoz.io/exceptions-monitoring/).


![exceptions-cover](https://github.com/user-attachments/assets/4be37864-59f2-4e8a-8d6e-e29ad04298c5)


<br /><br />

## ❓ ¿Por qué SigNoz?

SigNoz es una herramienta única para todas tus necesidades de monitoreo y observabilidad. Algunas razones para elegirnos:

- **Herramienta Única**: Logs, métricas y trazas en un solo lugar.

- **OpenTelemetry Nativo**: Construido sobre [OpenTelemetry](https://opentelemetry.io/), el estándar abierto que te libera del vendor lock-in.

- **Contexto Rico**: Logs, métricas y trazas correlacionadas para una depuración superior.

- **Potencia ClickHouse**: Usamos ClickHouse (como Uber y Cloudflare) para un almacenamiento extremadamente rápido y optimizado.

- **Consultas Flexibles**: Query builder visual, PromQL y SQL directo (ClickHouse) para cualquier caso de uso.

- **Open Source**: Usa la versión open source, nuestro [servicio cloud](https://signoz.io/teams/) o una mezcla según te convenga.


## 🚀 Primeros Pasos

### Crear cuenta en SigNoz Cloud

La forma más fácil de empezar. Ideal si quieres insights inmediatos sin preocuparte por el mantenimiento.

[Comienza gratis](https://signoz.io/teams/)

### Despliegue con Docker (Self-hosted) 🐳

Sigue los pasos [aquí](https://signoz.io/docs/install/docker/) para instalar con Docker.

Consulta la [guía de solución de problemas](https://signoz.io/docs/install/troubleshooting/) si tienes inconvenientes.

<p>&nbsp  </p>
  
  
### Despliegue en Kubernetes con Helm (Self-hosted) ☸️

Sigue los pasos [aquí](https://signoz.io/docs/deployment/helm_chart) para instalar con Helm charts.

<br /><br />

También ofrecemos servicios gestionados en tu infraestructura. Consulta nuestros [planes de precios](https://signoz.io/pricing/).


## 💬 Únete a nuestra comunidad de Slack

Ven a saludarnos en [Slack](https://signoz.io/slack) 👋

<br /><br />


### Lenguajes soportados:

SigNoz soporta todos los principales lenguajes. Cualquier framework soportado por OpenTelemetry funciona en SigNoz. Instrucciones de instrumentación:

- [Java](https://signoz.io/docs/instrumentation/java/)
- [Python](https://signoz.io/docs/instrumentation/python/)
- [Node.js o Javascript](https://signoz.io/docs/instrumentation/javascript/)
- [Go](https://signoz.io/docs/instrumentation/golang/)
- [PHP](https://signoz.io/docs/instrumentation/php/)
- [.NET](https://signoz.io/docs/instrumentation/dotnet/)
- [Ruby](https://signoz.io/docs/instrumentation/ruby-on-rails/)
- [Elixir](https://signoz.io/docs/instrumentation/elixir/)
- [Rust](https://signoz.io/docs/instrumentation/rust/)
- [Swift](https://signoz.io/docs/instrumentation/swift/)

Documentación completa [aquí](https://signoz.io/docs/introduction/).

<br /><br />


## ⚖️ Comparaciones con Herramientas Familiares

### SigNoz vs Prometheus

Prometheus es excelente solo para métricas. Pero si quieres una experiencia fluida entre métricas, logs y trazas, unirlo con otras herramientas es tedioso. SigNoz unifica las 3 señales usando OpenTelemetry, permitiendo correlacionar datos para solucionar problemas más rápido.

*Ejemplo*: Si ves un pico en métricas de infraestructura, salta directamente a logs y trazas relacionadas para entender la causa raíz al instante.

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaeger solo hace rastreo distribuido. SigNoz soporta métricas, trazas y logs (los 3 pilares). Además:

- UI de Jaeger no muestra métricas en trazas.
- Jaeger no puede agregar datos en trazas filtradas (ej. latencia p99 de clientes 'premium'). SigNoz sí puede.
- SigNoz permite saltar de trazas a logs fácilmente.

<p>&nbsp  </p>

### SigNoz vs Elastic 

- SigNoz usa ClickHouse, mucho más eficiente para consultas agregadas que Elastic.
- **50% menos recursos** requeridos durante la ingestión comparado con Elastic.

Benchmarks: Elastic vs SigNoz [aquí](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<p>&nbsp  </p>

### SigNoz vs Loki

- SigNoz soporta agregaciones en datos de alta cardinalidad sobre grandes volúmenes; Loki no.
- SigNoz no tiene límite de índices; Loki alcanza el máximo de streams con pocos índices.
- Búsquedas en grandes volúmenes son lentas en Loki comparado con SigNoz.

Benchmarks: Loki vs SigNoz [aquí](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<br /><br />


## 🤝 Contribuyendo

Nos encantan las contribuciones grandes o pequeñas. Lee [CONTRIBUTING.md](CONTRIBUTING.md) para empezar.

¿Dudas? Escríbenos en `#contributing` en nuestro [Slack](https://signoz.io/slack).

### Mantenedores del proyecto

#### Backend

- [Ankit Nayan](https://github.com/ankitnayan)
- [Nityananda Gohain](https://github.com/nityanandagohain)
- [Srikanth Chekuri](https://github.com/srikanthccv)
- [Vishal Sharma](https://github.com/makeavish)
- [Shivanshu Raj Shrivastava](https://github.com/shivanshuraj1333)
- [Ekansh Gupta](https://github.com/eKuG)
- [Aniket Agarwal](https://github.com/aniketio-ctrl)

#### Frontend

- [Yunus M](https://github.com/YounixM)
- [Vikrant Gupta](https://github.com/vikrantgupta25)
- [Sagar Rajput](https://github.com/SagarRajput-7)
- [Shaheer Kochai](https://github.com/ahmadshaheer)
- [Amlan Kumar Nandy](https://github.com/amlannandy)
- [Sahil Khan](https://github.com/sawhil)
- [Aditya Singh](https://github.com/aks07)
- [Abhi Kumar](https://github.com/ahrefabhi)

#### DevOps

- [Prashant Shahi](https://github.com/prashant-shahi)
- [Vibhu Pandey](https://github.com/therealpandey)

<br /><br />


## 📚 Documentación

Encuentra docs en https://signoz.io/docs/. Si falta algo, abre un issue con la etiqueta `documentation` o contáctanos en Slack.

<br /><br />


## 🌍 Comunidad

Únete a la [comunidad de Slack](https://signoz.io/slack) para conectar con otros usuarios y contribuidores.

Comparte ideas y feedback en nuestras [Discusiones de Github](https://github.com/SigNoz/signoz/discussions).

¡Gracias a nuestros increíbles contribuidores!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>
