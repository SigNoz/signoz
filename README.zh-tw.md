<h1 align="center" style="border-bottom: none">
    <a href="https://signoz.io" target="_blank">
        <img alt="SigNoz" src="https://github.com/user-attachments/assets/ef9a33f7-12d7-4c94-8908-0a02b22f0c18" width="100" height="100">
    </a>
    <br>SigNoz
</h1>

<p align="center">將所有日誌、指標和追蹤集中在一個地方。監控您的應用程式，在問題發生前發現問題，並通過豐富的上下文快速排除停機故障。SigNoz 是 Datadog 和 New Relic 的開源替代方案，具有成本效益。訪問 <a href="https://signoz.io" target="_blank">signoz.io</a> 獲取完整的文檔、教程和指南。</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/query-service?label=Docker Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>
  
  
<h3 align="center">
  <a href="https://signoz.io/docs"><b>文檔</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.md"><b>英文說明</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.zh-cn.md"><b>簡體中文說明</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.de-de.md"><b>德文說明</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.pt-br.md"><b>葡萄牙文說明</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Slack 社群</b></a> &bull;
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

## 功能


### 應用程式效能監控

使用 SigNoz APM 監控您的應用程式和服務。它提供了關鍵應用程式指標的即時圖表，如 p99 延遲、錯誤率、Apdex 和每秒操作數。您還可以監控應用程式的數據庫和外部調用。閱讀 [更多](https://signoz.io/application-performance-monitoring/)。

您可以使用 OpenTelemetry 來 [儀器化](https://signoz.io/docs/instrumentation/) 您的應用程式以開始使用。

![apm-cover](https://github.com/user-attachments/assets/fa5c0396-0854-4c8b-b972-9b62fd2a70d2)


### 日誌管理

SigNoz 可以用作集中式日誌管理解決方案。我們使用 ClickHouse（Uber 和 Cloudflare 等公司使用）作為數據存儲，這是一種極快且高度優化的日誌數據存儲。使用快速過濾器和強大的查詢構建器立即搜索所有日誌。

您還可以在日誌上創建圖表並使用自定義儀表板進行監控。閱讀 [更多](https://signoz.io/log-management/)。

![logs-management-cover](https://github.com/user-attachments/assets/343588ee-98fb-4310-b3d2-c5bacf9c7384)


### 分佈式追蹤

分佈式追蹤對於排除微服務應用程式中的問題至關重要。由 OpenTelemetry 提供支持，SigNoz 中的分佈式追蹤可以幫助您跟踪用戶請求，幫助您識別性能瓶頸。

使用 Flamegraphs 和 Gantt 圖查看用戶請求的詳細分解。點擊任何 span 查看整個追蹤的美觀表示，這將幫助您了解問題實際發生的位置。

閱讀 [更多](https://signoz.io/distributed-tracing/)。

![distributed-tracing-cover](https://github.com/user-attachments/assets/9bfe060a-0c40-4922-9b55-8a97e1a4076c)



### 指標和儀表板

從您的基礎設施或應用程式中攝取指標並創建自定義儀表板進行監控。使用多種面板類型（如餅圖、時間序列、條形圖等）創建適合您需求的可視化。

使用易於使用的指標查詢構建器快速創建指標數據查詢。添加多個查詢並將這些查詢與公式結合起來，快速創建非常複雜的查詢。

閱讀 [更多](https://signoz.io/metrics-and-dashboards/)。

![metrics-n-dashboards-cover](https://github.com/user-attachments/assets/a536fd71-1d2c-4681-aa7e-516d754c47a5)

### 警報

使用 SigNoz 中的警報在應用程式發生任何異常時獲得通知。您可以在任何類型的遙測信號（日誌、指標、追蹤）上設置警報，創建閾值並設置通知通道以獲得通知。高級功能如警報歷史和異常檢測可以幫助您創建更智能的警報。

SigNoz 中的警報幫助您主動識別問題，以便您在問題到達客戶之前解決它們。

閱讀 [更多](https://signoz.io/alerts-management/)。

![alerts-cover](https://github.com/user-attachments/assets/03873bb8-1b62-4adf-8f56-28bb7b1750ea)

### 異常監控

自動監控 Python、Java、Ruby 和 Javascript 中的異常。對於其他語言，只需添加幾行代碼即可開始監控異常。

查看應用程式中捕獲的所有異常的詳細堆棧跟踪。您還可以登錄自定義屬性以添加更多上下文到您的異常。例如，您可以添加屬性來識別發生異常的用戶。

閱讀 [更多](https://signoz.io/exceptions-monitoring/)。

![exceptions-cover](https://github.com/user-attachments/assets/4be37864-59f2-4e8a-8d6e-e29ad04298c5)


<br /><br />

## 為什麼選擇 SigNoz？

SigNoz 是一個滿足您所有監控和可觀察性需求的單一工具。以下是您應該選擇 SigNoz 的幾個原因：

- 單一工具實現可觀察性（日誌、指標和追蹤）

- 基於 [OpenTelemetry](https://opentelemetry.io/)，這是一個開源標準，讓您免受任何類型的供應商鎖定

- 相關的日誌、指標和追蹤，提供更豐富的調試上下文

- 使用 ClickHouse（Uber 和 Cloudflare 等公司使用）作為數據存儲，這是一種極快且高度優化的可觀察性數據存儲

- DIY 查詢構建器、PromQL 和 ClickHouse 查詢，滿足您所有關於查詢可觀察性數據的需求

- 開源 - 您可以根據您的使用情況使用開源、我們的 [雲服務](https://signoz.io/teams/) 或兩者結合


## 入門

### 創建 SigNoz 雲帳戶

SigNoz 雲是開始使用 SigNoz 的最簡單方法。我們的雲服務適合那些希望花更多時間獲取應用程式性能見解而不必擔心維護的用戶。

[免費開始](https://signoz.io/teams/)

### 使用 Docker 部署（自託管）

請按照 [此處](https://signoz.io/docs/install/docker/) 列出的步驟安裝 Docker

如果您遇到任何問題，[故障排除說明](https://signoz.io/docs/install/troubleshooting/) 可能會有所幫助。

<p>&nbsp  </p>
  
  
### 使用 Helm 在 Kubernetes 中部署（自託管）

請按照 [此處](https://signoz.io/docs/deployment/helm_chart) 列出的步驟安裝 Helm 圖表

<br /><br />

我們還提供在您的基礎設施中的託管服務。查看我們的 [定價計劃](https://signoz.io/pricing/) 了解所有詳情。


## 加入我們的 Slack 社群

來 [Slack](https://signoz.io/slack) 和我們打招呼 👋

<br /><br />


### 支持的語言：

SigNoz 支持所有主要編程語言的監控。任何由 OpenTelemetry 支持的框架和語言都由 SigNoz 支持。以下是不同語言的儀器化說明：

- [Java](https://signoz.io/docs/instrumentation/java/)
- [Python](https://signoz.io/docs/instrumentation/python/)
- [Node.js 或 Javascript](https://signoz.io/docs/instrumentation/javascript/)
- [Go](https://signoz.io/docs/instrumentation/golang/)
- [PHP](https://signoz.io/docs/instrumentation/php/)
- [.NET](https://signoz.io/docs/instrumentation/dotnet/)
- [Ruby](https://signoz.io/docs/instrumentation/ruby-on-rails/)
- [Elixir](https://signoz.io/docs/instrumentation/elixir/)
- [Rust](https://signoz.io/docs/instrumentation/rust/)
- [Swift](https://signoz.io/docs/instrumentation/swift/)

您可以在 [此處](https://signoz.io/docs/introduction/) 找到我們的完整文檔。

<br /><br />


## 與熟悉工具的比較

### SigNoz vs Prometheus

如果您只想做指標，Prometheus 很好。但如果您想在指標、日誌和追蹤之間有無縫體驗，那麼將 Prometheus 和其他工具拼湊在一起的當前體驗並不理想。

SigNoz 是一個一站式解決方案，適用於指標和其他遙測信號。由於您將使用相同的標準（OpenTelemetry）來收集所有遙測信號，因此您還可以關聯這些信號以快速排除故障。

例如，如果您看到在某個時間戳 k8s 集群的基礎設施指標存在問題，您可以跳轉到其他信號（如日誌和追蹤）以快速了解問題。

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaeger 只做分佈式追蹤。SigNoz 支持指標、追蹤和日誌 - 可觀察性的三大支柱。

此外，SigNoz 在 Jaeger 方面還有一些更高級的功能：

- Jaeger UI 不顯示任何追蹤或過濾追蹤的指標
- Jaeger 無法獲取過濾追蹤的聚合。例如，具有標籤 customer_type='premium' 的請求的 p99 延遲。這可以在 SigNoz 上輕鬆完成
- 您還可以在 SigNoz 中輕鬆從追蹤轉到日誌

<p>&nbsp  </p>

### SigNoz vs Elastic 

- SigNoz 日誌管理基於 ClickHouse，一種列式 OLAP 數據存儲，使聚合日誌分析查詢更加高效
- 與 Elastic 相比，SigNoz 在攝取期間的資源需求降低了 50%

我們發布了比較 Elastic 和 SigNoz 的基準測試。查看 [此處](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<p>&nbsp  </p>

### SigNoz vs Loki

- SigNoz 支持在大量高基數數據上的聚合，而 Loki 不支持。
- SigNoz 支持高基數數據的索引，並且對索引數量沒有限制，而 Loki 在添加幾個索引後達到最大流。
- 與 SigNoz 相比，在 Loki 中搜索大量數據困難且緩慢

我們發布了比較 Loki 和 SigNoz 的基準測試。查看 [此處](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<br /><br />


## 貢獻

我們 ❤️ 大小貢獻。請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md) 開始對 SigNoz 做出貢獻。

不確定如何開始？只需在我們的 [slack 社群](https://signoz.io/slack) 中的 `#contributing` 頻道上與我們聯繫

### 項目維護者

#### 後端

- [Ankit Nayan](https://github.com/ankitnayan)
- [Nityananda Gohain](https://github.com/nityanandagohain)
- [Srikanth Chekuri](https://github.com/srikanthccv)
- [Vishal Sharma](https://github.com/makeavish)

#### 前端

- [Yunus M](https://github.com/YounixM)
- [Vikrant Gupta](https://github.com/vikrantgupta25)
- [Sagar Rajput](https://github.com/SagarRajput-7)

#### DevOps

- [Prashant Shahi](https://github.com/prashant-shahi)
- [Vibhu Pandey](https://github.com/grandwizard28)

<br /><br />


## 文檔

您可以在 https://signoz.io/docs/ 找到文檔。如果您需要任何澄清或發現缺少的內容，請隨時提出帶有標籤 `documentation` 的 GitHub 問題或在社群 slack 頻道上與我們聯繫。

<br /><br />


## 社群

加入 [slack 社群](https://signoz.io/slack) 了解更多關於分佈式追蹤、可觀察性或 SigNoz 的信息，並與其他用戶和貢獻者聯繫。

如果您有任何想法、問題或反饋，請在我們的 [Github 討論](https://github.com/SigNoz/signoz/discussions) 中分享

一如既往，感謝我們的驚人貢獻者！

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>
