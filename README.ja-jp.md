<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme-assets/signoz-hero-dark.png" width="900">
    <source media="(prefers-color-scheme: light)" srcset="docs/readme-assets/signoz-hero-light.png" width="900">
    <img alt="SigNoz - オープン標準を基盤とした、あなたの流儀で使えるオブザーバビリティ。" src="docs/readme-assets/signoz-hero-light.png" width="900">
  </picture>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-cn.md">中文</a> ·
  <a href="README.de-de.md">Deutsch</a> ·
  <a href="README.pt-br.md">Português</a>
</p>

<p align="center">
  <a href="https://github.com/SigNoz/signoz/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/SigNoz/signoz"></a>
  <a href="https://github.com/SigNoz/signoz/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/SigNoz/signoz?label=release"></a>
  <a href="https://signoz.io/slack"><img alt="Slack community" src="https://img.shields.io/badge/slack-community-4A154B?logo=slack&logoColor=white"></a>
  <a href="https://www.linkedin.com/company/signozio/"><img alt="LinkedIn" src="https://img.shields.io/badge/linkedin-SigNoz-0A66C2?logo=linkedin&logoColor=white"></a>
  <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"><img alt="Tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"></a>
</p>

SigNoz は OpenTelemetry を基盤に構築されたオープンソースのオブザーバビリティプラットフォームです。ログ、メトリクス、トレース、アラート、ダッシュボードを一箇所に集約し、分断された監視スタックに代わるエンタープライズグレードの選択肢を提供します。

### SigNoz の利用形態を選ぶ

#### SigNoz Cloud（推奨）

フルマネージドの SigNoz。30 日間の無料トライアル（クレジットカード不要）、$49 からの従量課金制、リージョン別のデータホスティングを提供します。

[**無料で始める →**](https://signoz.io/teams/)

#### Enterprise

Enterprise Cloud、BYOC、Enterprise Self-Hosted。コンプライアンス、サポート、カスタム保持期間、RBAC、取り込み制御、データレジデンシー、リージョン選択に対応します。

[**Enterprise を見る →**](https://signoz.io/enterprise/)

#### Community

自社インフラで動かせる無料のオープンソース版 SigNoz。Docker、Kubernetes、Linux でデプロイでき、データプレーンを完全に自分で管理できます。

[**SigNoz をインストール →**](https://signoz.io/docs/install/self-host/)

### 何を監視できるか

SigNoz はログ、メトリクス、トレース、アラート、ダッシュボード、例外、エージェントネイティブなワークフローを一箇所でつなぎ、本番環境の問題をより速くデバッグできるようにします。

#### APM 概要

サービスのレイテンシ、エラー率、スループット、Apdex、主要エンドポイント、データベース呼び出し、外部呼び出しを監視します。

<p align="center">
  <img alt="レイテンシ、スループット、Apdex、主要オペレーションを表示する SigNoz APM ダッシュボード" src="docs/readme-assets/monitor/apm.png" width="900">
</p>

詳細: [APM ドキュメント](https://signoz.io/docs/instrumentation/overview/)

#### ログ管理

ビジュアルなクエリビルダーを使って、ログの取り込み・検索・集計を行い、トレースやメトリクスと相関付けます。

<p align="center">
  <img alt="フィルター、頻度チャート、ログ行を備えた SigNoz ログエクスプローラー" src="docs/readme-assets/monitor/log-management.svg" width="900">
</p>

詳細: [ログ管理ドキュメント](https://signoz.io/docs/logs-management/overview/)

#### メトリクスとダッシュボード

Query Builder、PromQL、ClickHouse SQL を使って、アプリケーション、インフラ、カスタムメトリクスのダッシュボードを構築します。

<p align="center">
  <img alt="システム負荷とネットワークのチャートを備えた SigNoz ホストメトリクスダッシュボード" src="docs/readme-assets/monitor/metrics.png" width="900">
</p>

詳細: [メトリクスドキュメント](https://signoz.io/docs/metrics-management/overview/)

#### インフラ監視

Kubernetes のクラスター、Pod、ノード、ワークロードに加え、ホストレベルの CPU、メモリ、ディスク、ネットワーク、ログ、トレースを監視します。

<p align="center">
  <img alt="Pod とノードのメトリクスを表示する SigNoz Kubernetes インフラダッシュボード" src="docs/readme-assets/monitor/infrastructure.png" width="900">
</p>

詳細: [インフラ監視ドキュメント](https://signoz.io/docs/infrastructure-monitoring/overview/)

#### LLM / AI オブザーバビリティ

LLM アプリ、RAG パイプライン、プロンプト、ツール呼び出し、トークン、レイテンシ、コストを、アプリケーションやインフラのテレメトリと並べてトレースします。

<p align="center">
  <img alt="トレース、トークン使用量、レイテンシ、コストを表示する SigNoz LLM オブザーバビリティダッシュボード" src="docs/readme-assets/monitor/llm.png" width="900">
</p>

詳細: [LLM オブザーバビリティドキュメント](https://signoz.io/docs/llm-observability/)

#### エージェントネイティブなオブザーバビリティと MCP

SigNoz MCP サーバーを使ってコーディングエージェントにテレメトリを取り込んだり、SigNoz 内の Noz を使って本番環境のコンテキストとともにインシデント調査、アラート調整、ダッシュボード構築を行えます。[Noz](https://signoz.io/docs/ai/noz/) は SigNoz Cloud でのみ利用できます。

<p align="center">
  <img alt="MCP を活用したエージェントワークフローと並ぶ SigNoz Noz インターフェース" src="docs/readme-assets/monitor/agent-native.png" width="900">
</p>

詳細: [SigNoz MCP サーバードキュメント](https://signoz.io/docs/ai/signoz-mcp-server/) · [エージェントスキルドキュメント](https://signoz.io/docs/ai/agent-skills/#install-the-plugin)

#### 分散トレーシング

フレームグラフ、ウォーターフォール、スパンイベント、フィルター、トレース分析を使って、サービスをまたぐリクエストを追跡します。

<p align="center">
  <img alt="フレームグラフとウォーターフォールスパンを表示する SigNoz 分散トレースビュー" src="docs/readme-assets/monitor/distributed-tracing.png" width="900">
</p>

詳細: [分散トレーシングドキュメント](https://signoz.io/docs/instrumentation/)

#### トレースファネル

トレースからファネルを作成し、リクエストフローの離脱、失敗した遷移、システム的なワークフローの問題を把握します。

<p align="center">
  <img alt="リクエストフローの離脱と失敗した遷移を表示する SigNoz トレースファネル" src="docs/readme-assets/monitor/trace-funnels.png" width="900">
</p>

詳細: [トレースファネルドキュメント](https://signoz.io/docs/trace-funnels/overview/)

さらに、[**例外**](https://signoz.io/docs/userguide/exceptions/)、[**アラート**](https://signoz.io/docs/alerts/)、[**外部 API**](https://signoz.io/docs/external-api-monitoring/overview/)、および OpenTelemetry、Prometheus、Kubernetes、クラウドプロバイダー、各言語 SDK、アプリケーションフレームワーク、データベース、LLM ツール向けの[**インテグレーション**](https://signoz.io/docs/integrations/integrations-list/)も監視できます。

### チームが SigNoz を選ぶ理由

1. **OpenTelemetry ネイティブ**<br>
   オープン標準で一度計装すれば、テレメトリの所有権を保ち続けられます。
2. **シグナルの相関**<br>
   ツールを切り替えることなく、サービスのチャートからトレース、ログ、インフラメトリクス、例外へ移動できます。
3. **単一のカラムナーデータベース**<br>
   高カーディナリティかつ大容量のオブザーバビリティワークロード向けに構築されています。
4. **予測可能な料金体系**<br>
   ホスト単位の課金なし、ユーザーシート課金なし、カスタムメトリクスの特別料金もありません。
5. **エンタープライズ対応**<br>
   SOC 2 Type II および HIPAA 準拠、RBAC、取り込み制御、カスタム保持期間、サポート、BYOC、セルフホスティング。

### はじめる

#### Cloud で始める

マネージドな SigNoz ワークスペースを作成し、オブザーバビリティ基盤を自前で運用することなく最初のダッシュボードを手に入れましょう。

[**SigNoz Cloud を無料で始める**](https://signoz.io/teams/)

#### SigNoz をセルフホストする

Foundry、Docker、Kubernetes、Linux を使って、自社インフラで SigNoz を実行します。

[**Foundry**](https://github.com/SigNoz/foundry) · [**Docker**](https://signoz.io/docs/install/docker/) · [**Kubernetes**](https://signoz.io/docs/install/kubernetes/) · [**Linux**](https://signoz.io/docs/install/linux/)

#### データを送信する

OpenTelemetry、Prometheus、各言語 SDK、インテグレーションを使って、アプリケーションとインフラを計装します。

[**計装**](https://signoz.io/docs/instrumentation/) · [**インテグレーション**](https://signoz.io/docs/integrations/integrations-list/)

### 既存ツールとの比較

SigNoz は、単機能ツールの寄せ集めや、料金が予測しづらい商用プラットフォームからの移行先としてよく採用されています。

**Prometheus**<br>
メトリクスだけが必要なら Prometheus で十分です。SigNoz はメトリクス、ログ、トレース、ダッシュボード、アラートをまとめて扱えるため、チームは相関付けられたコンテキストでデバッグできます。

**Jaeger**<br>
Jaeger は分散トレーシング専用です。SigNoz はそれに加えて、メトリクス、ログ、トレース分析、ダッシュボード、アラート、例外、トレースからログへのワークフローを提供します。

**Elastic**<br>
SigNoz はカラムナーデータベースを採用し、効率的なオブザーバビリティ分析と高カーディナリティなログワークロードを実現します。取り込み時のリソース要件は Elastic と比較して 50% 低くなっています。[詳細な調査](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)をご覧ください。

**Loki**<br>
リンク先のベンチマークでは、SigNoz はテスト環境のすべてのキーをインデックス化できた一方、Loki はラベルを増やすと最大ストリームエラーに達しました。[詳細な調査](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)をご覧ください。

## コントリビューション

大小を問わず、コントリビューションを歓迎します ❤️ SigNoz への貢献を始めるには [CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。

始め方がわからない場合は、[Slack コミュニティ](https://signoz.io/slack)の **`#contributing` チャンネルで気軽に声をかけてください。**

いつも支えてくれる素晴らしいコントリビューターの皆さんに感謝します！

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img alt="SigNoz contributors" src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>
