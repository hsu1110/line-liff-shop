# 🛍️ 全自動代購小幫手系統設計規格書 (Lite Version)

**專案代號：** Daigou-Bot-V1  
**適用規模：** 月單量約 200~500 筆  
**核心技術：** Google Apps Script (GAS) + Google Sheets + LINE Messaging API + Cloudinary  
**文件日期：** 2026-02-10

---

## 1. 系統概述 (Overview)

本系統旨在協助代購業者解決「人工統計繁瑣」與「漏單」痛點。透過將 Google 試算表當作輕量級資料庫，結合 LINE 官方帳號的互動功能，實現「**賣家拍照即上架，買家點擊即下單**」的自動化流程。

### 核心價值
1.  **極速上架：** 賣家僅需傳送圖片與價格，系統自動生成精美卡片。
2.  **轉傳擴散：** 利用 LINE 原生「轉傳」功能，將商品卡片分享至各群組。
3.  **自助下單：** 買家透過 LIFF 介面選規格，無需手動輸入 "+1"。
4.  **自動記帳：** 訂單資訊直接寫入 Google Sheet，省去人工對帳。

---

## 2. 系統架構 (Architecture)

**資料流向：**
1.  **賣家端：** LINE Bot (傳圖/文) -> GAS -> Cloudinary (存圖) -> Sheets (存商品) -> 回傳 Flex Message。
2.  **買家端：** LINE Flex Message (轉傳後) -> LIFF (讀取 Sheet 商品資訊) -> 送出訂單 -> GAS (查價 & 寫入 Sheet)。

**技術堆疊：**
* **前端 (User Interface):** LINE App (Official Account Chat & LIFF View).
* **中介層 (Controller):** Google Apps Script (Web App).
* **資料層 (Model):** Google Sheets (儲存商品與訂單).
* **媒體層 (Media):** Cloudinary (儲存商品圖片，提供 CDN 連結).

---

## 3. 資料庫設計 (Google Sheets Schema)

請建立一個新的 Google Sheet，並重新命名分頁如下：

### 3.1 商品表 (分頁名稱: `Products`)
*用途：儲存上架過的商品資訊，供下單時查價使用。*

| 欄位 (Col) | 名稱 | 變數名 (Ref) | 說明 |
| :--- | :--- | :--- | :--- |
| **A** | **商品ID** | `pid` | **唯一鍵 (Key)**，建議用 `ROW_時間戳` (例: `P_16987233`) |
| B | 商品名稱 | `name` | 商品品名 |
| C | 價格 | `price` | **真實售價** (後端查價以此為準) |
| D | 圖片連結 | `image_url` | Cloudinary 的 `secure_url` |
| E | 狀態 | `status` | `ON_SALE` (上架中) / `SOLD_OUT` (完售) |
| F | 上架時間 | `created_at` | 格式 `YYYY-MM-DD HH:mm:ss` |

### 3.2 訂單表 (分頁名稱: `Orders`)
*用途：儲存所有客戶的下單紀錄。*

| 欄位 (Col) | 名稱 | 變數名 (Ref) | 說明 |
| :--- | :--- | :--- | :--- |
| A | 訂單編號 | `order_id` | 系統生成 (例: `ORD_20231027_001`) |
| B | 下單時間 | `order_time` | 系統時間 |
| C | 客戶名稱 | `user_name` | LINE Display Name |
| D | UserID | `user_id` | 客戶的 LINE User ID (隱藏欄位，用於推播) |
| **E** | **商品ID** | `pid` | 關聯到 `Products` 表 |
| F | 購買品項 | `item_name` | 備份商品名稱 (方便閱讀) |
| G | 規格 | `spec` | 客戶填寫 (如：紅色/L號) |
| H | 數量 | `qty` | 整數 |
| I | 總金額 | `total_amount` | **後端計算結果** (`price` * `qty`) |
| J | 訂單狀態 | `order_status` | `未付款` / `已付款` / `已出貨` |

---

## 4. 關鍵流程與邏輯 (Core Workflows)

### 4.1 賣家上架流程 (Admin Workflow)
*設計目標：單手操作，防呆。*

1.  **觸發：** 管理員傳送 **「圖片」** 給官方帳號。
2.  **GAS 處理 (Image Step)：**
    * 驗證 `userId` 是否為管理員。
    * 將圖片上傳至 Cloudinary (Unsigned Upload)。
    * 使用 `CacheService` 記錄狀態：`{ userId: "AdminID", step: "WAIT_PRICE", img: "URL..." }`。
    * **回覆：** 「圖片已接收！請換行輸入：\n第一行：品名\n第二行：價格」。
3.  **觸發：** 管理員傳送 **「文字」**。
4.  **GAS 處理 (Text Step)：**
    * 檢查 `CacheService` 是否有暫存圖片。
    * 解析文字，**以換行符號 (`\n`) 分隔**，第一行為「品名」，第二行為「價格」。
    * 寫入 `Products` 表，生成 `pid`。
    * **回覆 Flex Message：** 生成一張漂亮的商品卡片，按鈕連結帶有參數 `?pid=...`。
5.  **操作：** 管理員長按卡片，**「轉傳」** 至代購群組。

### 4.2 買家下單流程 (User Workflow)
*設計目標：直覺，確保金額正確。*

1.  **觸發：** 買家點擊卡片上的 **「🛒 立即下單」**。
2.  **前端 (LIFF)：**
    * 開啟半版網頁。
    * 解析 URL 中的 `pid`。
    * 呼叫 GAS `doGet(pid)` 取得商品資訊 (圖、名、價) 並顯示。
    * 買家輸入規格與數量，送出表單。
3.  **GAS 處理 (Order Step)：**
    * 接收 `{ pid, qty, spec, userId }`。
    * **安全檢核：** 忽略前端傳來的價格，根據 `pid` 去 `Products` 表查找真實價格。
    * 計算總金額。
    * 使用 `LockService` (鎖定 5秒) 寫入 `Orders` 表。
    * **回覆：** 推播訊息給買家「✅ 訂單成立！總金額 $xxx」。
    * **通知管理員：** 推播給 Admin「新訂單通知」 (目前不做庫存檢核，缺貨由人工聯繫)。

---

## 5. 開發實作細節 (Implementation Guide)

### 5.1 環境準備
1.  **Cloudinary:**
    * 註冊免費帳號。
    * 在 Settings -> Upload 頁面，新增一個 **Upload Preset**。
    * **關鍵設定：** Signing Mode 選 **"Unsigned"** (這很重要！這樣 GAS 才不用算簽名)。
2.  **LINE Developers:**
    * 建立 Messaging API Channel (取得 Access Token)。
    * 建立 LINE Login Channel (用於 LIFF)。
    * 將 LIFF ID 綁定到 GAS Web App URL (開發後期設定)。

### 5.2 GAS 關鍵程式碼結構 (Pseudo-code)

這不是完整的程式碼，而是邏輯骨架，開發時請填入具體 API 呼叫。

```javascript
// 全域變數
const ADMIN_ID = "U123456789..."; // 你的 UserID
const SHEET_ID = "你的試算表ID";

function doPost(e) {
  const event = JSON.parse(e.postData.contents).events[0];
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  // 1. 權限檢查 & 路由分派
  if (userId === ADMIN_ID) {
    handleAdminMessage(event, replyToken);
  } else {
    // 處理一般使用者的文字 (如果是從 LIFF 送來的資料，通常走另一個 doGet/doPost 邏輯)
    // 建議：LIFF 下單動作透過 AJAX Post 到這個同一個 URL，但帶上特殊參數區分
  }
}

// 處理管理員訊息
function handleAdminMessage(event, replyToken) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "admin_step_" + event.source.userId;

  if (event.message.type === 'image') {
    // A. 處理圖片上傳
    const imageUrl = uploadToCloudinary(event.message.id); // 實作上傳邏輯
    cache.put(cacheKey, JSON.stringify({step: 'WAIT_INFO', img: imageUrl}), 600);
    replyText(replyToken, "圖片已存！請換行輸入：\n品名\n價格");
    
  } else if (event.message.type === 'text') {
    // B. 處理文字上架
    const cachedData = JSON.parse(cache.get(cacheKey));
    
    if (cachedData && cachedData.step === 'WAIT_INFO') {
      const text = event.message.text;
      // 解析文字 (換行分隔)
      const lines = text.split('\n');
      const name = lines[0].trim();
      const price = lines[1].trim(); 
      const pid = "PROD_" + new Date().getTime();
      
      // 寫入 Google Sheet
      saveProductToSheet(pid, name, price, cachedData.img);
      
      // 回傳 Flex Message
      const flexMsg = createFlexMessage(pid, name, price, cachedData.img);
      replyLineMessage(replyToken, flexMsg);
      
      cache.remove(cacheKey); // 清除狀態
    }
  }
}

// 處理 LIFF 下單 (通常寫在 doPost 的另一個分支)
function handleOrder(data) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) { // 等待 5 秒
    try {
      // 1. 查價 (Security Lookup)
      const realPrice = getPriceFromSheet(data.pid);
      
      // 2. 算錢
      const total = realPrice * data.qty;
      
      // 3. 寫入訂單
      saveOrderToSheet(data, total);

      // 4. 通知管理員 (無庫存檢核，皆可下單)
      pushToAdmin(`💰 新訂單！\n${data.user_name} 下單 PID: ${data.pid} x ${data.qty}\n總額：$${total}`);
      
      return ContentService.createTextOutput(JSON.stringify({result: "success"}));
    } catch(e) {
      // 錯誤處理
    } finally {
      lock.releaseLock();
    }
  }
}

### 5.3 Flex Message JSON 範本 (The Card)

這是回傳給管理員的那張卡片結構。注意 `action` 部分。

```json
{
  "type": "bubble",
  "hero": {
    "type": "image",
    "url": "${CLOUDINARY_URL}", 
    "size": "full",
    "aspectRatio": "20:13",
    "aspectMode": "cover"
  },
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      { "type": "text", "text": "${PRODUCT_NAME}", "weight": "bold", "size": "xl" },
      { "type": "text", "text": "$ ${PRICE}", "color": "#ff5555", "size": "xl", "weight": "bold" }
    ]
  },
  "footer": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "color": "#06c755",
        "action": {
          "type": "uri",
          "label": "🛒 立即下單",
          "uri": "[https://liff.line.me/你的LIFF_ID?pid=$](https://liff.line.me/你的LIFF_ID?pid=$){PID}" 
        }
      }
    ]
  }
}
```
*注意：`uri` 中的 `${PID}` 是動態變數，要在 GAS 中替換進去。*

---

## 6. 安全與風險控制 (Security & Risks)

1.  **後端查價 (必要)：** 永遠不要信任前端 LIFF 傳來的價格。一定要用 PID 回 Sheet 查。
2.  **圖片備份：** 雖然 Cloudinary 很穩，但建議每個月手動備份一次 Sheet 裡的資料。
3.  **錯誤處理：** 如果 Sheet 寫入失敗 (極低機率)，Bot 應該要回傳「系統忙碌中」給客人，而不是已讀不回。

---

## 7. 下一步行動計畫 (Action Plan)

1.  **[ ] 基礎建設：** 建立 Google Sheet，申請 Cloudinary，取得 LINE Token。
2.  **[ ] 核心測試：** 寫一段簡單的 GAS，測試能不能把圖片傳到 Cloudinary。
3.  **[ ] 上架功能：** 完成「管理員傳圖+文 -> 寫入 Sheet -> 回傳 Flex Message」的閉環。
4.  **[ ] 下單功能：** 製作 LIFF 頁面，串接 GAS 查價與寫入訂單。
5.  **[ ] 驗收：** 實際走一遍流程，確認轉傳後的按鈕是否有效。