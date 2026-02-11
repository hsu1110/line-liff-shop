# 🚀 Step 1: 基礎建設 (Infrastructure)

請依序完成以下步驟。

## 1. 建立 GAS 專案與試算表
1. [ ] 前往 [Google Apps Script](https://script.google.com/home) 建立新專案。
2. [ ] 將提供的 `src/Code.js` 程式碼完全複製貼上。
3. [ ] 點擊上方的「執行」按鈕來執行 `setup` 函式。
   - 首次執行需審查權限：選擇帳號 -> 進階 -> 前往(不安全) -> 允許。
   - 觀察 Log，點擊生成的 `試算表網址`。
4. [ ] 打開該試算表，你會看到三個分頁：`Products`, `Orders`, `SystemConfig`。

## 2. 填寫設定檔 (SystemConfig 分頁)
**請切換到 `SystemConfig` 分頁，將以下資料填入 B 欄 (Value)：**

### A. LINE 設定
1. [ ] 登入 [LINE Developers Console](https://developers.line.biz/)。
2. [ ] 建立 Messaging API Channel。
3. [ ] 取得 **Channel Access Token** (Messaging API 頁面底下) -> 填入 Sheet 的 `LINE_ACCESS_TOKEN`。
4. [ ] 取得你的 **User ID** (Basic Settings 頁面底下) -> 填入 Sheet 的 `ADMIN_ID`。

### B. Cloudinary 設定
1. [ ] 登入 [Cloudinary Console](https://console.cloudinary.com/)。
2. [ ] 複製 Dashboard 上的 **Cloud Name** -> 填入 Sheet 的 `CLOUDINARY_NAME`。
3. [ ] 前往 Settings -> Upload -> Upload presets -> Add upload preset：
   - **Signing Mode** 改為 **Unsigned**。
   - 自訂 Name (例如 `daygo_upload`) -> 填入 Sheet 的 `CLOUDINARY_PRESET`。

## 3. 部署 (Deploy)
1. [ ] 回到 GAS 編輯器，點擊右上角「部署」 -> 「新增部署作業」。
2. [ ] 類型選擇 **網頁應用程式 (Web App)**。
   - 執行身分：**我 (Me)** (重要！這樣才有權限寫入 Sheet)。
   - 誰可以存取：**任何人 (Anyone)** (這樣 LINE 才呼叫得到)。
3. [ ] 點擊「部署」，複製 **網頁應用程式網址 (Web App URL)**。
4. [ ] 回到 LINE Developers -> Messaging API -> **Webhook URL**。
   - 貼上網址，按下 Verify (可能會失敗，沒關係，先儲存)。
   - 開啟 **Use webhook**。
   - 關閉 **Auto-reply messages** (自動回應)。

🎉 **完成！現在傳張圖片給機器人試試看！**
