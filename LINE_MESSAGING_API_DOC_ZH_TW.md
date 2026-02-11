# LINE Messaging API 中文完整參考手冊

本文件提供 LINE Messaging API 的詳細功能說明、使用情境、參數定義與範例。

**官方文件**: [LINE Developers - Messaging API Reference](https://developers.line.biz/en/reference/messaging-api/)

## 1. 基礎設定 (Basic Configuration)

所有 API 呼叫皆需包含以下 Header，用於驗證身分與指定資料格式：

* **Content-Type**: `application/json` (指定傳送的是 JSON 格式資料)
* **Authorization**: `Bearer {Channel Access Token}` (帶入您的長期或短期存取權杖)

---

## 2. 訊息傳送 API (Message)

這類 API 用於發送訊息給使用者。

### 2.1 回覆訊息 (Reply Message)

* **用途**: 當使用者傳送訊息給官方帳號時，系統會收到 Webhook，其中包含 `replyToken`。使用此 API 可以「被動」回應使用者。
* **特點**: **免費** (通常不計入月費額度)。
* **限制**: `replyToken` 有效期極短（約 30 秒至 1 分鐘），且**只能使用一次**。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/message/reply`
* **Body Parameters**:
  * `replyToken` (String, Required): Webhook 收到的回覆權杖。
  * `messages` (Array, Required): 訊息物件陣列，最多 5 則。
  * `notificationDisabled` (Boolean, Optional): 是否關閉推播通知 (預設 false)。
* **Example Request**:

    ```json
    {
        "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA...",
        "messages": [
            { "type": "text", "text": "你好！這是回覆訊息。" }
        ]
    }
    ```

### 2.2 主動推播 (Push Message)

* **用途**: 官方帳號「主動」發送訊息給指定的使用者、群組或聊天室。
* **特點**: **付費** (會消耗每月的免費訊息額度，超過需額外付費)。
* **情境**: 發送通知、行銷活動、系統警報。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/message/push`
* **Body Parameters**:
  * `to` (String, Required): 目標 ID (User/Group/Room ID)。
  * `messages` (Array, Required): 訊息物件陣列，最多 5 則。
* **Example Request**:

    ```json
    {
        "to": "U4af4980629...",
        "messages": [
            { "type": "text", "text": "這是主動推播的訊息" }
        ]
    }
    ```

### 2.3 多人推播 (Multicast)

* **用途**: 一次請求發送給「多個」指定的使用者。
* **特點**: 效率比單次 Push 高，但仍會消耗額度 (發給 N 人 = 消耗 N 則額度)。
* **限制**: 一次請求最多指定 **500** 個 User ID。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/message/multicast`
* **Body Parameters**:
  * `to` (Array, Required): User ID 陣列。
  * `messages` (Array, Required): 訊息物件陣列。
* **Example Request**:

    ```json
    {
        "to": ["U4af4980629...", "U12345678..."],
        "messages": [
            { "type": "text", "text": "這是發給多人的訊息" }
        ]
    }
    ```

### 2.4 全員廣播 (Broadcast)

* **用途**: 發送訊息給該官方帳號的「所有」好友。
* **特點**: 最方便的群發方式，但會消耗大量額度 (好友數 x 訊息數)。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/message/broadcast`
* **Body Parameters**:
  * `messages` (Array, Required): 訊息物件陣列。
* **Example Request**:

    ```json
    {
        "messages": [
            { "type": "text", "text": "這是全站公告" }
        ]
    }
    ```

---

## 3. 額度與統計 API (Insight)

這類 API 用於監控訊息用量與費用狀態。

### 3.1 查詢本月已用量 (Get quota consumption)

* **用途**: 查詢這個月「已經發送」了多少則訊息。
* **注意**: 包含 Push, Multicast, Broadcast。API 回傳的是**總數**，不區分付費/免費，需自行與 Quota 比對。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/message/quota/consumption`
* **Example Response**:

    ```json
    { "totalUsage": 120 }
    ```

### 3.2 查詢本月額度上限 (Get quota)

* **用途**: 查詢這個月方案的「免費額度」是多少。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/message/quota`
* **Example Response**:

    ```json
    { "type": "limited", "value": 500 }
    ```

    *(若 type 為 "none"，表示無上限，通常是付費吃到飽方案)*

### 3.3 查詢發送統計 (Get delivery statistics)

* **用途**: 查詢「特定日期」的各類訊息發送狀況。
* **Method**: `GET`
* **Endpoint**:
  * Reply: `https://api.line.me/v2/bot/message/delivery/reply?date={yyyyMMdd}`
  * Push: `https://api.line.me/v2/bot/message/delivery/push?date={yyyyMMdd}`
  * Multicast: `https://api.line.me/v2/bot/message/delivery/multicast?date={yyyyMMdd}`
  * Broadcast: `https://api.line.me/v2/bot/message/delivery/broadcast?date={yyyyMMdd}`
* **Example Response**:

    ```json
    {
        "status": "ready",  // ready (完成), unready (計算中), out_of_service (暫停)
        "success": 500      // 成功傳送數
    }
    ```

---

## 4. 使用者與群組 API (User & Group)

這類 API 用於獲取使用者資料或管理群組。

### 4.1 取得使用者資料 (Get Profile)

* **用途**: 透過 User ID 取得使用者的暱稱、大頭貼、狀態消息。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/profile/{userId}`
* **Example Response**:

    ```json
    {
        "displayName": "LINE taro",
        "userId": "U4af4980629...",
        "pictureUrl": "https://profile.line-scdn.net/...",
        "statusMessage": "Hello, LINE!",
        "language": "en"
    }
    ```

### 4.2 取得群組摘要 (Get Group Summary)

* **用途**: 透過 Group ID 取得群組的名稱與圖片。
* **限制**: 機器人必須在該群組內。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/group/{groupId}/summary`
* **Example Response**:

    ```json
    {
        "groupId": "Ca56f94637c...",
        "groupName": "Group Name",
        "pictureUrl": "https://profile.line-scdn.net/..."
    }
    ```

### 4.3 取得群組人數 (Get Members Count)

* **用途**: 查詢群組內有多少成員。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/group/{groupId}/members/count`
* **Example Response**:

    ```json
    { "count": 15 }
    ```

### 4.4 離開群組 (Leave Group)

* **用途**: 讓機器人主動退出某個群組。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/group/{groupId}/leave`
* **Body**: (Empty)
* **Example Response**: `{}`

---

## 5. 內容取得 API (Content)

### 5.1 下載訊息內容 (Get Content)

* **用途**: 當使用者傳送圖片、影片、音訊給機器人時，Webhook 只會給 `messageId`。需透過此 API 下載實際檔案。
* **注意**: 回應是二進位資料 (Binary)，需自行存檔。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/message/{messageId}/content`
* **Example Request**:

    ```http
    GET https://api.line.me/v2/bot/message/1234567890/content
    Authorization: Bearer {token}
    ```

---

## 6. 圖文選單 API (Rich Menu)

這類 API 用於管理聊天室下方的圖文選單。

### 6.1 建立圖文選單 (Create Rich Menu)

* **用途**: 定義選單的大小、圖片區域與點擊後的動作。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/richmenu`
* **Body**:

    ```json
    {
      "size": { "width": 2500, "height": 1686 },
      "selected": false,
      "name": "選單名稱",
      "chatBarText": "點擊開啟",
      "areas": [
        {
          "bounds": { "x": 0, "y": 0, "width": 2500, "height": 1686 },
          "action": { "type": "postback", "data": "action=buy" }
        }
      ]
    }
    ```

* **Example Response**:

    ```json
    { "richMenuId": "richmenu-123456789..." }
    ```

### 6.2 上傳選單圖片 (Upload Rich Menu Image)

* **用途**: 將製作好的選單圖片上傳並綁定到 Rich Menu ID。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/richmenu/{richMenuId}/content`
* **Header**: `Content-Type: image/jpeg` 或 `image/png`
* **Body**: 圖片檔案 (Binary)。
* **Example Response**: `{}`

### 6.3 設定預設選單 (Set Default Rich Menu)

* **用途**: 設定一個「預設」選單，讓所有新加入或未綁定特定選單的使用者都看到這個。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}`
* **Example Response**: `{}`

### 6.4 取得預設選單 ID (Get Default Rich Menu ID)

* **用途**: 查詢目前設定的預設選單是哪一個。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/user/all/richmenu`
* **Example Response**:

    ```json
    { "richMenuId": "richmenu-123456789..." }
    ```

### 6.5 刪除圖文選單 (Delete Rich Menu)

* **用途**: 刪除不再使用的選單設定。
* **Method**: `DELETE`
* **Endpoint**: `https://api.line.me/v2/bot/richmenu/{richMenuId}`
* **Example Response**: `{}`

---

## 7. 機器人資訊 API (Bot Info)

### 7.1 取得機器人資訊 (Get Bot Info)

* **用途**: 取得機器人自己的基本資料 (ID, 名稱, 頭貼)。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/info`
* **Example Response**:

    ```json
    {
        "userId": "U123456...",
        "basicId": "@abc1234",
        "premiumId": "@mybot",
        "displayName": "My Bot",
        "pictureUrl": "https://profile.line-scdn.net/...",
        "chatMode": "chat",
        "markAsReadMode": "auto"
    }
    ```

---

## 8. Webhook 管理 (Webhook)

這類 API 用於管理 Webhook 設定。

### 8.1 設定 Webhook URL

* **用途**: 透過 API 設定 Webhook 網址 (通常在 LINE Developers 後台設定即可，此 API 適合自動化部署)。
* **Method**: `PUT`
* **Endpoint**: `https://api.line.me/v2/bot/channel/webhook/endpoint`
* **Body**:

    ```json
    { "endpoint": "https://example.com/webhook" }
    ```

* **Example Response**: `{}`

### 8.2 取得 Webhook URL

* **用途**: 查詢目前設定的 Webhook 網址。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/channel/webhook/endpoint`
* **Example Response**:

    ```json
    { "endpoint": "https://example.com/webhook", "active": true }
    ```

### 8.3 測試 Webhook

* **用途**: 請求 LINE 平台發送一個測試請求到您的 Webhook URL，確認連線是否正常。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/channel/webhook/test`
* **Body**:

    ```json
    { "endpoint": "https://example.com/webhook" }
    ```

* **Example Response**:

    ```json
    { "success": true, "timestamp": 1609459200000, "statusCode": 200, "reason": "OK", "detail": "OK" }
    ```

---

## 9. 帳號連結 (Account Link)

### 9.1 取得 Link Token

* **用途**: 用於「帳號綁定」流程。當使用者在 LINE 中點擊連結要綁定您的服務帳號時，需先取得此 Token。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/user/{userId}/linkToken`
* **Example Response**:

    ```json
    {
        "linkToken": "NMZTNuVrPTqlr2IF8Bqn...",
        "expire": 1694567890
    }
    ```

---

## 10. 受眾管理 (Audience Management)

這類 API 用於建立「受眾群組」，以便進行更精準的推播 (Narrowcast)。

### 10.1 建立受眾 (Create Audience Group)

* **用途**: 上傳一批 User ID，建立一個受眾群組 (例如：VIP 客戶、購買過產品的客戶)。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/audienceGroup/upload`
* **Body**:

    ```json
    {
        "description": "VIP Users",
        "isIfaAudience": false,
        "audiences": [
            { "id": "U123456..." },
            { "id": "U234567..." }
        ]
    }
    ```

* **Example Response**:

    ```json
    {
        "audienceGroupId": 123456789,
        "type": "UPLOAD",
        "description": "VIP Users",
        "created": 1609459200
    }
    ```

### 10.2 取得受眾列表

* **用途**: 查詢目前已建立的所有受眾群組。
* **Method**: `GET`
* **Endpoint**: `https://api.line.me/v2/bot/audienceGroup/list`
* **Query Params**: `page=1`
* **Example Response**:

    ```json
    {
        "audienceGroups": [
            {
                "audienceGroupId": 123456789,
                "type": "UPLOAD",
                "description": "VIP Users",
                "status": "READY",
                "audienceCount": 100,
                "created": 1609459200
            }
        ],
        "hasNextPage": false,
        "totalCount": 1,
        "readWriteAudienceGroupTotalCount": 1,
        "page": 1,
        "size": 20
    }
    ```

---

## 11. 票券 (Coupon)

### 11.1 建立票券

* **用途**: 建立優惠券。
* **注意**: 票券功能通常建議在 LINE Official Account Manager 後台操作，API 功能較有限且複雜。
* **Method**: `POST`
* **Endpoint**: `https://api.line.me/v2/bot/message/coupon`

---

## 12. Webhook 事件 (Webhook Events)

當使用者與官方帳號互動時，LINE Platform 會發送 Webhook 到您的伺服器 (或 GAS)。以下是常見的事件類型：

### 12.1 訊息事件 (Message Event)

* **Type**: `message`
* **觸發時機**: 使用者傳送訊息 (文字、貼圖、圖片、影片等) 給機器人。
* **用途**: 最基礎的互動，用於接收指令或對話。

### 12.2 加好友事件 (Follow Event)

* **Type**: `follow`
* **觸發時機**: 使用者將機器人**加入好友**，或**解除封鎖**時。
* **用途**: 發送歡迎詞、記錄使用者資料。

### 12.3 解除好友事件 (Unfollow Event)

* **Type**: `unfollow`
* **觸發時機**: 使用者**封鎖**機器人時。
* **用途**: 清除資料庫中的無效名單，節省資源。

### 12.4 加入群組事件 (Join Event)

* **Type**: `join`
* **觸發時機**: 機器人被邀請進入群組或聊天室。
* **用途**: 發送群組歡迎詞、記錄群組 ID。

### 12.5 離開群組事件 (Leave Event)

* **Type**: `leave`
* **觸發時機**: 機器人被踢出群組，或主動離開群組。
* **用途**: 清除資料庫中的群組資料。

### 12.6 回傳事件 (Postback Event)

* **Type**: `postback`
* **觸發時機**: 使用者點擊了 Template Message 或 Rich Menu 中的按鈕 (Action 為 postback)。
* **用途**: 處理按鈕互動，例如「確認購買」、「參加活動」，不會在聊天室顯示文字，體驗較佳。

### 12.7 藍牙訊號事件 (Beacon Event)

* **Type**: `beacon`
* **觸發時機**: 使用者進入 LINE Beacon 設備的訊號範圍內。
* **用途**: 實體店面導覽、打卡活動。

### 12.8 帳號連結事件 (Account Link Event)

* **Type**: `accountLink`
* **觸發時機**: 使用者完成帳號綁定流程。
* **用途**: 確認 LINE 帳號已成功與您的系統帳號連結。

### 12.9 成員加入事件 (Member Joined Event)

* **Type**: `memberJoined`
* **觸發時機**: 有新成員加入機器人所在的群組。
* **用途**: 歡迎新成員 (需注意隱私設定，未必能取得成員 ID)。

### 12.10 成員離開事件 (Member Left Event)

* **Type**: `memberLeft`
* **觸發時機**: 有成員離開機器人所在的群組。
* **用途**: 記錄群組人數變化。
