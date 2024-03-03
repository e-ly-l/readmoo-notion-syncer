# 同步讀墨(Readmoo)到Notion筆記

這個專案是用來同步讀墨(Readmoo)的筆記到Notion的，主要是用來同步電子書的標注到 Notion 的筆記中。

PS: 這個專案是讀墨版的[Kindle Notion Syncer](https://github.com/erikliu0801/kindle-notion-syncer)，Notion 設定的部分內容可以參考此專案。

## 為什麼要做這個專案

我目前會將大部分的電子書筆記同步到 Readwise 上，但是 Readwise 並不直接支援讀墨，而從讀墨匯出到 Readwise 則需要一本一本書地去做匯出，所以我想要寫一個工具來將讀墨的筆記同步到 Notion 上，同時也自動化地匯出到 Readwise 。

## 如何使用

### 步驟 1. 建立一個新的 Notion API 金鑰並複製

前往 [Notion Integrations](https://www.notion.so/my-integrations) 並建立一個新的 API 金鑰。

![](/images/notion-integration.png)

### 步驟 2. 建立一個新的 Notion 資料庫並複製資料庫 ID

建立一個新的 Notion 資料庫，並複製資料庫的 ID。
或者，你也可以填入頁面的 ID，這樣就會在這個頁面下新建資料庫。

### 步驟 3. 複製這個專案並設定環境變數

下載這個專案後，複製 `.env.example` 到 `.env`，並填入剛剛複製的 Notion API 金鑰和資料庫 ID (或頁面ID)。

### 步驟 4. 填入讀墨的帳號、密碼和 Readwise 的 API 金鑰(可選)

在上一步的 `.env` 中填入讀墨的帳號和密碼，須注意：目前只支援使用帳號密碼登入，不支援使用 其他登入方式。

如果你想要同步到 Readwise 上，也可以填入 Readwise 的 API 金鑰。 那麼工具在運行時會一起將筆記匯出到 Readwise 上。

### 步驟 5. 安裝依賴並運行

```bash
sh install.sh # if first time
sh run.sh
```

### 步驟 6. 開始同步

運行後，工具會開始同步讀墨的筆記到 Notion 上，同時也會將筆記匯出到 Readwise 上。
如果你有設定 Readwise 的 API 金鑰，那麼你可以在 Readwise 上看到匯出的筆記。

當你遇到問題時可以在專案的 `data` 資料夾下查看檔案進行除錯。 或者你也可以開一個 issue。
