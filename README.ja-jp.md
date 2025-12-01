<h1 align="center" style="border-bottom: none">
    <a href="https://signoz.io" target="_blank">
        <img alt="SigNoz" src="https://github.com/user-attachments/assets/ef9a33f7-12d7-4c94-8908-0a02b22f0c18" width="100" height="100">
    </a>
    <br>SigNoz
</h1>

<p align="center">ログ、メトリクス、トレースをすべて一箇所で管理。アプリケーションを監視し、問題が発生する前に検知し、豊富なコンテキストでダウンタイムを迅速にトラブルシューティング。SigNozはDatadogやNew Relicに代わるコスト効率の高いオープンソースソリューションです。完全なドキュメント、チュートリアル、ガイドは<a href="https://signoz.io" target="_blank">signoz.io</a>をご覧ください。</p>

<p align="center">
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability">
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a>
</p>


<h3 align="center">
  <a href="https://signoz.io/docs"><b>ドキュメント</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.md"><b>英語版README</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.zh-cn.md"><b>中国語版README</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.de-de.md"><b>ドイツ語版README</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/main/README.pt-br.md"><b>ポルトガル語版README</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Slackコミュニティ</b></a> &bull;
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

## 機能


### アプリケーションパフォーマンスモニタリング

SigNoz APMを使用してアプリケーションとサービスを監視できます。p99レイテンシ、エラー率、Apdex、毎秒オペレーション数などの主要なアプリケーションメトリクスのチャートがすぐに利用可能です。アプリケーションからのデータベースや外部呼び出しも監視できます。詳細は[こちら](https://signoz.io/application-performance-monitoring/)をご覧ください。

OpenTelemetryでアプリケーションを[計装](https://signoz.io/docs/instrumentation/)して始めましょう。

![apm-cover](https://github.com/user-attachments/assets/fa5c0396-0854-4c8b-b972-9b62fd2a70d2)


### ログ管理

SigNozは一元化されたログ管理ソリューションとして使用できます。データストアにはClickHouse（UberやCloudflareなどが使用）を採用しており、ログデータに対して極めて高速で高度に最適化されたストレージです。クイックフィルターと強力なクエリビルダーを使用して、すべてのログを瞬時に検索できます。

ログに対してチャートを作成し、カスタマイズしたダッシュボードで監視することもできます。詳細は[こちら](https://signoz.io/log-management/)をご覧ください。

![logs-management-cover](https://github.com/user-attachments/assets/343588ee-98fb-4310-b3d2-c5bacf9c7384)


### 分散トレーシング

分散トレーシングは、マイクロサービスアプリケーションの問題をトラブルシューティングするために不可欠です。OpenTelemetryを基盤としたSigNozの分散トレーシングは、サービス間のユーザーリクエストを追跡し、パフォーマンスのボトルネックを特定するのに役立ちます。

フレームグラフとガントチャートを使用して、ユーザーリクエストを詳細に分解して確認できます。任意のスパンをクリックすると、トレース全体が美しく表示され、リクエストフローのどこで実際に問題が発生したかを把握できます。

詳細は[こちら](https://signoz.io/distributed-tracing/)をご覧ください。

![distributed-tracing-cover](https://github.com/user-attachments/assets/9bfe060a-0c40-4922-9b55-8a97e1a4076c)



### メトリクスとダッシュボード

インフラストラクチャやアプリケーションからメトリクスを取り込み、カスタマイズしたダッシュボードで監視できます。円グラフ、時系列、棒グラフなど、さまざまなパネルタイプでニーズに合った可視化を作成できます。

使いやすいメトリクスクエリビルダーで、メトリクスデータに対するクエリを素早く作成できます。複数のクエリを追加し、数式で組み合わせることで、複雑なクエリも素早く作成できます。

詳細は[こちら](https://signoz.io/metrics-and-dashboards/)をご覧ください。

![metrics-n-dashboards-cover](https://github.com/user-attachments/assets/a536fd71-1d2c-4681-aa7e-516d754c47a5)

### アラート

SigNozのアラートを使用して、アプリケーションで異常が発生したときに通知を受け取れます。あらゆる種類のテレメトリシグナル（ログ、メトリクス、トレース）にアラートを設定し、しきい値を作成し、通知チャネルを設定できます。アラート履歴や異常検知などの高度な機能で、よりスマートなアラートを作成できます。

SigNozのアラートは、問題を事前に特定し、顧客に影響が及ぶ前に対処するのに役立ちます。

詳細は[こちら](https://signoz.io/alerts-management/)をご覧ください。

![alerts-cover](https://github.com/user-attachments/assets/03873bb8-1b62-4adf-8f56-28bb7b1750ea)

### 例外モニタリング

Python、Java、Ruby、Javascriptで例外を自動的に監視できます。その他の言語では、数行のコードを追加するだけで例外の監視を開始できます。

アプリケーションでキャッチされたすべての例外の詳細なスタックトレースを確認できます。カスタム属性をログに記録して、例外にさらなるコンテキストを追加することもできます。例えば、例外が発生したユーザーを特定するための属性を追加できます。

詳細は[こちら](https://signoz.io/exceptions-monitoring/)をご覧ください。


![exceptions-cover](https://github.com/user-attachments/assets/4be37864-59f2-4e8a-8d6e-e29ad04298c5)


<br /><br />

## なぜSigNozなのか？

SigNozは、すべての監視とオブザーバビリティのニーズに対応する単一のツールです。SigNozを選ぶ理由は以下の通りです：

- オブザーバビリティ（ログ、メトリクス、トレース）のための単一ツール

- [OpenTelemetry](https://opentelemetry.io/)の上に構築されており、あらゆる種類のベンダーロックインから解放されるオープンソース標準

- ログ、メトリクス、トレースの相関により、デバッグ時により豊富なコンテキストを提供

- データストアにClickHouse（UberやCloudflareなどが使用）を採用 - オブザーバビリティデータに対して極めて高速で高度に最適化されたストレージ

- DIYクエリビルダー、PromQL、ClickHouseクエリで、オブザーバビリティデータのクエリに関するあらゆるユースケースに対応

- オープンソース - ユースケースに応じて、オープンソース、[クラウドサービス](https://signoz.io/teams/)、または両方の組み合わせを使用可能


## はじめに

### SigNoz Cloudアカウントの作成

SigNoz Cloudは、SigNozを始める最も簡単な方法です。クラウドサービスは、メンテナンスを気にせずにアプリケーションパフォーマンスの洞察を得ることに集中したいユーザー向けです。

[無料で始める](https://signoz.io/teams/)

### Docker（セルフホスト）でデプロイ

Dockerを使用してインストールするには、[こちら](https://signoz.io/docs/install/docker/)の手順に従ってください。

問題が発生した場合は、[トラブルシューティングガイド](https://signoz.io/docs/install/troubleshooting/)が参考になります。

<p>&nbsp  </p>


### Helmを使用してKubernetesにデプロイ（セルフホスト）

Helmチャートを使用してインストールするには、[こちら](https://signoz.io/docs/deployment/helm_chart)の手順に従ってください。

<br /><br />

お客様のインフラストラクチャでのマネージドサービスも提供しています。詳細は[料金プラン](https://signoz.io/pricing/)をご確認ください。


## Slackコミュニティに参加

[Slack](https://signoz.io/slack)でお気軽にご連絡ください 👋

<br /><br />


### 対応言語：

SigNozは、主要なすべてのプログラミング言語の監視をサポートしています。OpenTelemetryでサポートされているフレームワークと言語はすべてSigNozでサポートされています。各言語の計装手順は以下をご覧ください：

- [Java](https://signoz.io/docs/instrumentation/java/)
- [Python](https://signoz.io/docs/instrumentation/python/)
- [Node.js / Javascript](https://signoz.io/docs/instrumentation/javascript/)
- [Go](https://signoz.io/docs/instrumentation/golang/)
- [PHP](https://signoz.io/docs/instrumentation/php/)
- [.NET](https://signoz.io/docs/instrumentation/dotnet/)
- [Ruby](https://signoz.io/docs/instrumentation/ruby-on-rails/)
- [Elixir](https://signoz.io/docs/instrumentation/elixir/)
- [Rust](https://signoz.io/docs/instrumentation/rust/)
- [Swift](https://signoz.io/docs/instrumentation/swift/)

完全なドキュメントは[こちら](https://signoz.io/docs/introduction/)でご覧いただけます。

<br /><br />


## 類似ツールとの比較

### SigNoz vs Prometheus

Prometheusはメトリクスだけを扱う場合に適しています。しかし、メトリクス、ログ、トレース間でシームレスな体験を求める場合、Prometheusと他のツールを組み合わせる現在の方法は最適ではありません。

SigNozは、メトリクスとその他のテレメトリシグナルのためのワンストップソリューションです。すべてのテレメトリシグナルを収集するために同じ標準（OpenTelemetry）を使用するため、これらのシグナルを相関させて迅速にトラブルシューティングできます。

例えば、あるタイムスタンプでk8sクラスタのインフラストラクチャメトリクスに問題があることがわかった場合、ログやトレースなどの他のシグナルにジャンプして問題を素早く理解できます。

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaegerは分散トレーシングのみを行います。SigNozはメトリクス、トレース、ログの3つのオブザーバビリティの柱すべてをサポートしています。

さらに、SigNozはJaegerと比較していくつかの高度な機能があります：

- Jaeger UIはトレースやフィルタリングされたトレースに対してメトリクスを表示しません
- Jaegerはフィルタリングされたトレースに対して集計を取得できません。例えば、customer_type='premium'というタグを持つリクエストのp99レイテンシなどです。SigNozではこれを簡単に行えます
- SigNozではトレースからログへの移動も簡単です

<p>&nbsp  </p>

### SigNoz vs Elastic

- SigNozのログ管理は、列指向OLAPデータストアであるClickHouseをベースにしており、集計ログ分析クエリがより効率的です
- 取り込み時のリソース要件がElasticと比較して50%削減

ElasticとSigNozを比較したベンチマークを公開しています。[こちら](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)でご確認ください。

<p>&nbsp  </p>

### SigNoz vs Loki

- SigNozは大量のデータに対する高カーディナリティデータの集計をサポートしていますが、Lokiはサポートしていません
- SigNozは高カーディナリティデータに対するインデックスをサポートし、インデックス数に制限がありませんが、Lokiは少数のインデックスを追加しただけで最大ストリームに達します
- Lokiでは、大量のデータに対する検索が困難で、SigNozと比較して遅くなります

LokiとSigNozを比較したベンチマークを公開しています。[こちら](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)でご確認ください。

<br /><br />


## コントリビューション

大小問わずコントリビューションを歓迎します。SigNozへのコントリビューションを始めるには、[CONTRIBUTING.md](CONTRIBUTING.md)をお読みください。

始め方がわからない場合は、[Slackコミュニティ](https://signoz.io/slack)の`#contributing`でお気軽にご質問ください。

### プロジェクトメンテナー

#### バックエンド

- [Ankit Nayan](https://github.com/ankitnayan)
- [Nityananda Gohain](https://github.com/nityanandagohain)
- [Srikanth Chekuri](https://github.com/srikanthccv)
- [Vishal Sharma](https://github.com/makeavish)
- [Shivanshu Raj Shrivastava](https://github.com/shivanshuraj1333)
- [Ekansh Gupta](https://github.com/eKuG)
- [Aniket Agarwal](https://github.com/aniketio-ctrl)

#### フロントエンド

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


## ドキュメント

ドキュメントは https://signoz.io/docs/ でご覧いただけます。不明な点や不足している情報がある場合は、`documentation`ラベルを付けてGitHub issueを作成するか、Slackコミュニティチャンネルでお問い合わせください。

<br /><br />


## コミュニティ

分散トレーシング、オブザーバビリティ、SigNozについて詳しく知りたい方、また他のユーザーやコントリビューターとつながりたい方は、[Slackコミュニティ](https://signoz.io/slack)にご参加ください。

アイデア、質問、フィードバックがある場合は、[GitHub Discussions](https://github.com/SigNoz/signoz/discussions)で共有してください。

いつもながら、素晴らしいコントリビューターの皆さんに感謝します！

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>
