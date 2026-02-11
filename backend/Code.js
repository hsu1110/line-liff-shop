/**
 * 🛍️ 全自動代購小幫手 - 核心邏輯
 * Project: Daigou-Bot-V1
 * Date: 2026-02-10
 */

// ==========================================
// 1. 環境變數設定 (Configuration)
// ==========================================
// 透過 getConfig() 從 Google Sheet 讀取設定，並快取 10 分鐘
const CONFIG = {
  get SHEET_ID() {
    return PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  },
  
  // 系統參數
  SHEET_TAB: {
    PRODUCTS: "Products",
    ORDERS: "Orders",
    CONFIG: "SystemConfig" // 新增設定分頁
  },

  // 動態讀取設定
  get(key) {
    const cached = CacheService.getScriptCache().get(key);
    if (cached) return cached;
    
    // 如果快取沒有，去 Sheet 讀 (較慢，但第一次必要)
    const val = getValFromConfigSheet(key);
    if (val) CacheService.getScriptCache().put(key, val, 600); // 快取 10 分鐘
    return val;
  }
};

/**
 * 為了方便，封裝常用的 Key
 */
const KEY = {
  LINE_TOKEN: "LINE_ACCESS_TOKEN",
  ADMIN_ID: "ADMIN_ID",
  CLOUD_NAME: "CLOUDINARY_NAME",
  CLOUD_PRESET: "CLOUDINARY_PRESET",
  LIFF_ID: "LIFF_ID" // 新增 LIFF ID
};

// ==========================================
// 2. 只有這兩個進入點 (Entry Points)
// ==========================================

/**
 * 🛠️ 第一次使用請執行這個函式！ (One-time Setup)
 * 它會自動幫你建立 Google Sheet 並設定好標題列。
 */
function setup() {
  const ss = SpreadsheetApp.create("DayGo-DB"); // 建立新試算表
  const sheetId = ss.getId();
  
  // 1. 儲存 Sheet ID 到系統屬性
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', sheetId);
  Logger.log("✅ 試算表建立成功！ID 已存入系統。");
  Logger.log("試算表網址: " + ss.getUrl());
  
  // 2. 建立 "SystemConfig" 分頁 (最優先)
  let configSheet = ss.getSheetByName(CONFIG.SHEET_TAB.CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG.SHEET_TAB.CONFIG);
    // 預填 Key
    configSheet.getRange(1, 1, 5, 2).setValues([
      ["Key", "Value (請填入對應值)"],
      ["LINE_ACCESS_TOKEN", "請填入 Channel Access Token"],
      ["ADMIN_ID", "請填入你的 User ID"],
      ["CLOUDINARY_NAME", "請填入 Cloud Name"],
      ["CLOUDINARY_PRESET", "請填入 Upload Preset (Unsigned)"],
      ["LIFF_ID", "請填入 LIFF ID (稍後申請)"]
    ]);
    // 美化一下
    configSheet.setColumnWidth(1, 200);
    configSheet.setColumnWidth(2, 400);
    configSheet.getRange("A1:B1").setFontWeight("bold").setBackground("#efefef");
  }

  // 3. 處理 "Products" 分頁
  let productSheet = ss.getSheetByName(CONFIG.SHEET_TAB.PRODUCTS);
  if (!productSheet) {
    productSheet = ss.getSheets()[0]; // 拿預設的第一頁
    productSheet.setName(CONFIG.SHEET_TAB.PRODUCTS);
  } else {
    productSheet.clear(); // 清空舊資料
  }
  
  // 設定 Products標題
  productSheet.getRange(1, 1, 1, 6).setValues([
    ["pid", "name", "price", "image_url", "status", "created_at"]
  ]);
  
  // 4. 處理 "Orders" 分頁
  let orderSheet = ss.getSheetByName(CONFIG.SHEET_TAB.ORDERS);
  if (!orderSheet) {
    orderSheet = ss.insertSheet(CONFIG.SHEET_TAB.ORDERS);
  } else {
    orderSheet.clear();
  }
  
  // 設定 Orders標題
  orderSheet.getRange(1, 1, 1, 10).setValues([
    ["order_id", "order_time", "user_name", "user_id", "pid", "item_name", "spec", "qty", "total_amount", "order_status"]
  ]);
  
  Logger.log("✅ 全部設定完成！");
  Logger.log("👉 請現在打開試算表，切換到 'SystemConfig' 分頁，填入 Token 資料。");
}

/**
 * LINE Bot Webhook (接收訊息)
 */
// ==========================================
// 3. Web App API (供外部前端呼叫 - JSON Mode)
// ==========================================

/**
 * 通用回應函式 (處理 CORS)
 */
function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET 請求處理
 * 網址: .../exec?action=getProduct&pid=...
 */
function doGet(e) {
  const params = e.parameter;
  const action = params.action;

  // 1. 取得商品資訊
  if (action === "getProduct") {
    const pid = params.pid;
    if (!pid) return createJSONOutput({ status: "error", message: "Missing PID" });
    
    const product = getProductInfo(pid);
    if (product) {
      return createJSONOutput({ status: "success", data: product });
    } else {
      return createJSONOutput({ status: "error", message: "Product Not Found" });
    }
  }

  // 1.5. 取得已有商品列表 (V2 新增)
  if (action === "getProducts") {
    const products = getAllProducts();
    return createJSONOutput({ status: "success", data: products });
  }

  // 1.6. 取得訂單記錄 (V2 新增)
  if (action === "getOrders") {
    const userId = params.userId;
    if (!userId) return createJSONOutput({ status: "error", message: "Missing User ID" });

    const orders = getOrders(userId);
    return createJSONOutput({ status: "success", data: orders });
  }

  // 2. 測試連線
  if (action === "test") {
    return createJSONOutput({ status: "success", message: "API is working!" });
  }

  // 預設回應
  return createJSONOutput({ status: "error", message: "Unknown Action" });
}

/**
 * POST 請求處理 (下單)
 * Body: { action: "submitOrder", data: {...} }
 */
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    
    // 如果是 LINE Webhook (會有 events 屬性)
    if (contents.events) {
      handleLineWebhook(contents);
      return createJSONOutput({ status: "success" });
    }

    // 如果是前端 API 呼叫
    const action = contents.action;
    
    if (action === "submitOrder") {
      const result = submitOrder(contents.data);
      return createJSONOutput(result);
    }
    
    return createJSONOutput({ status: "error", message: "Unknown Action" });

  } catch (error) {
    return createJSONOutput({ status: "error", message: error.toString() });
  }
}

/**
 * 處理 LINE Webhook 邏輯 (獨立出來)
 */
function handleLineWebhook(contents) {
    const event = contents.events[0];
    const replyToken = event.replyToken;
    const userId = event.source.userId;
    const adminId = CONFIG.get(KEY.ADMIN_ID);

    if (userId === adminId) {
      handleAdminMessage(event, replyToken);
    } else {
      // 處理一般使用者訊息 (例如: 接收 LIFF 傳來的 "我已下單" 並回覆)
      handleUserMessage(event, replyToken);
    }
}

/**
 * 處理一般使用者訊息
 */
function handleUserMessage(event, replyToken) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  
  const text = event.message.text;
  
  // 偵測 "我已下單 #ORD_" 開頭的訊息
  if (text.startsWith("我已下單 #ORD_")) {
    const orderId = text.split("#")[1].trim(); // 取出 ORD_12345
    
    // 1. 去 Orders 表查訂單詳情
    const order = getOrderByOrderId(orderId);
    if (order) {
      // 2. 回覆 Flex Message (免費!)
      const flex = createOrderReceiptCard(order);
      replyFlexMessage(replyToken, flex);
      
      // 3. 順便通知管理員 (雖然這裡用 Push 還是要錢，但管理員通知通常無法省)
      // 如果想省管理員通知，可以改用 LINE Notify，但這裡先維持 Push (因為量少)
      pushToAdmin(`💰 新訂單入帳！\n單號: ${order.order_id}\n買家: ${order.user_name}\n金額: $${order.total}`);
    } else {
      replyText(replyToken, "找不到訂單資料，請聯繫客服。");
    }
  }
}

// ==========================================
// 3. 核心功能函式 (Core Functions)
// ==========================================

/**
 * [API] 取得商品資訊 (供 LIFF 使用)
 */
function getProductInfo(pid) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  
  // 尋找 PID (第一欄)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == pid) {
      // 回傳商品物件
      return {
        pid: data[i][0],
        name: data[i][1],
        price: data[i][2],
        image_url: data[i][3],
        status: data[i][4]
      };
    }
  }
  return null;
}

/**
 * [API] 取得所有上架商品 (供 V2 首頁使用)
 */
function getAllProducts() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  const products = [];
  
  // 從第 2 行開始讀 (跳過標題)
  for (let i = 1; i < data.length; i++) {
    const status = data[i][4];
    // 只回傳上架中或售完的商品 (不回傳下架 OFF_SHELF 的)
    if (status === 'ON_SALE' || status === 'SOLD_OUT') {
      products.push({
        pid: data[i][0],
        name: data[i][1],
        price: data[i][2],
        image_url: data[i][3],
        status: status
      });
    }
  }
  return products.reverse(); // 新的上架排前面
}

/**
 * [API] 取得訂單記錄 (供 V2 History 使用)
 */
function getOrders(targetUserId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.ORDERS);
  const data = sheet.getDataRange().getValues();
  const userOrders = [];

  // 跳過標題列
  for (let i = 1; i < data.length; i++) {
    // 欄位對應: [OrderId, Time, User, PID, ItemName, Spec, Qty, Total]
    // User ID 在第 4 欄 (Index 3)
    const orderUserId = data[i][3];
    
    if (orderUserId === targetUserId) {
      userOrders.push({
        order_id: data[i][0],
        time: Utilities.formatDate(new Date(data[i][1]), "GMT+8", "yyyy/MM/dd HH:mm"),
        item_name: data[i][4],
        price: data[i][7] / data[i][6], // 單價 = 總價 / 數量 (簡單回推，或直接加欄位存單價)
        qty: data[i][6],
        spec: data[i][5],
        total: data[i][7]
      });
    }
  }
  return userOrders.reverse(); // 新的訂單排前面
}

/**
 * [Helper] 依訂單編號查詢訂單 (供 handleUserMessage 使用)
 */
function getOrderByOrderId(targetOrderId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.ORDERS);
  const data = sheet.getDataRange().getValues();
  
  // 跳過標題列
  for (let i = 1; i < data.length; i++) {
    // 欄位: [OrderId, Time, User, PID, ItemName, Spec, Qty, Total]
    if (data[i][0] === targetOrderId) {
      return {
        order_id: data[i][0],
        time: Utilities.formatDate(new Date(data[i][1]), "GMT+8", "yyyy/MM/dd HH:mm"),
        user_name: data[i][2],
        item_name: data[i][4],
        spec: data[i][5],
        qty: data[i][6],
        total: data[i][7]
      };
    }
  }
  return null;
}

/**
 * [API] 提交訂單 (供 LIFF 使用)
 */
function submitOrder(formData) {
  const lock = LockService.getScriptLock();
  // 最多等待 5 秒
  if (lock.tryLock(5000)) {
    try {
      const pid = formData.pid;
      const userId = formData.userId;
      const spec = formData.spec;
      const qty = parseInt(formData.qty);
      
      // 1. 安全查價 (不信任前端價格)
      const product = getProductInfo(pid);
      if (!product) return { status: 'error', message: '商品不存在' };
      if (product.status === 'SOLD_OUT') return { status: 'error', message: '商品已售完' };
      
      const price = parseInt(product.price);
      const totalAmount = price * qty;
      const orderId = "ORD_" + new Date().getTime();
      const orderTime = new Date();
      
      // 2. 寫入訂單 (Orders 表)
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.ORDERS);
      // ["order_id", "order_time", "user_name", "user_id", "pid", "item_name", "spec", "qty", "total_amount", "order_status"]
      sheet.appendRow([
        orderId, orderTime, formData.userName, userId, pid, 
        product.name, spec, qty, totalAmount, "未付款"
      ]);
      
      // 3. 通知 (買家 & 管理員) - 暫時關閉以節省成本 (改用 Reply API)
      // A. 通知買家
      /*
      if (userId && userId !== "BROWSER_TEST_USER") {
        pushMessage(userId, [{type: 'text', text: `✅ 訂單已成立！\n單號: ${orderId}\n品項: ${product.name} (${spec})\n數量: ${qty}\n總金額: $${totalAmount}`}]);
      }
      
      // B. 通知管理員
      pushToAdmin(`💰 新訂單入帳！\n單號: ${orderId}\n買家: ${formData.userName}\n品項: ${product.name} x ${qty}\n規格: ${spec}\n總額: $${totalAmount}`);
      */

      return { status: 'success', orderId: orderId };
      
    } catch(e) {
      return { status: 'error', message: e.toString() };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { status: 'error', message: '系統忙碌中，請稍後再試' };
  }
}

/**
 * 推播給管理員
 */
/**
 * 推播給管理員
 */
function pushToAdmin(message) {
  const adminId = CONFIG.get(KEY.ADMIN_ID);
  if (adminId) {
     pushMessage(adminId, [{type: 'text', text: message}]);
  }
}

/**
 * 處理管理員訊息 (上架流程 & 下架)
 */
function handleAdminMessage(event, replyToken) {
  // 1. 處理 Postback (按鈕點擊)
  if (event.type === 'postback') {
    const data = event.postback.data; // e.g., "action=sold_out&pid=..."
    const params = {};
    data.split('&').forEach(item => {
      const parts = item.split('=');
      params[parts[0]] = parts[1];
    });

    if (params.action === 'sold_out') {
      const pid = params.pid;
      const productName = updateProductStatus(pid, 'SOLD_OUT');
      if (productName) {
        replyText(replyToken, `✅ 商品已下架\n品名: ${productName}\n(PID: ${pid})`);
      } else {
        replyText(replyToken, `❌ 下架失敗，找不到商品 (PID: ${pid})`);
      }
    }
    return;
  }

  // 2. 處理文字 & 圖片 (上架流程)
  const cache = CacheService.getScriptCache();
  const userId = event.source.userId; // Admin ID
  const cacheKey = "ADMIN_STATE_" + userId;
  
  if (event.type === 'message') {
    const msg = event.message;

    // 情境 A: 管理員傳圖片 (第一步)
    if (msg.type === "image") {
      // 1. 取得圖片內容 (Blob)
      const imageBlob = getLineContent(msg.id);

      // 2. 上傳到 Cloudinary
      const imageUrl = uploadToCloudinary(imageBlob);

      if (imageUrl) {
        // 3. 暫存狀態 (等待輸入文字)
        cache.put(
          cacheKey,
          JSON.stringify({
            step: "WAIT_INFO",
            img: imageUrl,
          }),
          600
        ); // 存 10 分鐘

        replyText(replyToken, "✅ 圖片已接收！\n請換行輸入：\n品名\n價格");
      } else {
        replyText(replyToken, "❌ 圖片上傳失敗，請檢查 Cloudinary 設定。");
      }
    }
    // 情境 B: 管理員傳文字 (第二步)
    else if (msg.type === "text") {
      const cachedDataString = cache.get(cacheKey);

      if (cachedDataString) {
        const cachedData = JSON.parse(cachedDataString);

        if (cachedData.step === "WAIT_INFO") {
          const text = msg.text;
          // 解析: 第一行品名，第二行價格
          const lines = text.split("\n");

          if (lines.length >= 2) {
            const name = lines[0].trim();
            const price = lines[1].trim(); 
            const pid = "P_" + new Date().getTime(); // 生成唯一 ID
            const status = "ON_SALE";
            const createdAt = new Date();

            // 1. 寫入 Google Sheet
            addProductToSheet(
              pid,
              name,
              price,
              cachedData.img,
              status,
              createdAt
            );

            // 2. 回傳 Flex Message 卡片
            const flexMsg = createProductCard(pid, name, price, cachedData.img);
            replyFlexMessage(replyToken, flexMsg);

            // 3. 清除暫存
            cache.remove(cacheKey);
          } else {
            replyText(replyToken, "⚠️ 格式錯誤！請務必換行輸入：\n品名\n價格");
          }
        }
      } else {
        // 沒有暫存圖片，視為一般閒聊
        replyText(replyToken, "請先傳送一張圖片來開始上架流程。");
      }
    }
  }
}

// ==========================================
// 4. 工具函式 (Utilities - 需實作)
// ==========================================

/**
 * 從 LINE 取得圖片內容 (Binary)
 */
function getLineContent(messageId) {
  const token = CONFIG.get(KEY.LINE_TOKEN);
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const options = {
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = UrlFetchApp.fetch(url, options);
  return response.getBlob();
}

/**
 * 上傳圖片到 Cloudinary (Unsigned Upload)
 */
function uploadToCloudinary(imageBlob) {
  const cloudName = CONFIG.get(KEY.CLOUD_NAME);
  const preset = CONFIG.get(KEY.CLOUD_PRESET);
  
  if (!cloudName || !preset) {
    Logger.log("❌ Cloudinary Config Missing");
    return null;
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

  const payload = {
    upload_preset: preset,
    file: imageBlob,
  };

  const options = {
    method: "post",
    payload: payload,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    return data.secure_url; // 回傳 HTTPS 網址
  } catch (e) {
    Logger.log("Cloudinary Upload Error: " + e.toString());
    return null;
  }
}

/**
 * 寫入 Google Sheet (Products)
 */
function addProductToSheet(pid, name, price, imageUrl, status, createdAt) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(
    CONFIG.SHEET_TAB.PRODUCTS,
  );
  // 欄位順序: pid, name, price, image_url, status, created_at
  sheet.appendRow([pid, name, price, imageUrl, status, createdAt]);
}

/**
 * 更新商品狀態 (下架用) - 回傳商品名稱
 */
function updateProductStatus(pid, newStatus) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  
  // 尋找 PID (第一欄)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == pid) {
      // status 在第 5 欄 (Index 4) -> 對應 Row i+1, Col 5
      sheet.getRange(i + 1, 5).setValue(newStatus);
      return data[i][1]; // 回傳商品名稱 (Index 1)
    }
  }
  return null;
}

/**
 * 回覆文字訊息
 */
function replyText(replyToken, text) {
  const token = CONFIG.get(KEY.LINE_TOKEN);
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = {
    replyToken: replyToken,
    messages: [{ type: "text", text: text }],
  };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    payload: JSON.stringify(payload),
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch(e) {
    Logger.log(e);
  }
}

/**
 * 回傳 Flex Message
 */
function replyFlexMessage(replyToken, flexContent) {
  const token = CONFIG.get(KEY.LINE_TOKEN);
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = {
    replyToken: replyToken,
    messages: [flexContent]
  };
  
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch(e) {
    Logger.log("Reply Flex Error: " + e);
  }
}

/**
 * 主動推播訊息 (Push Message)
 */
function pushMessage(to, messages) {
  const token = CONFIG.get(KEY.LINE_TOKEN);
  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: to,
    messages: messages
  };
  
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch(e) {
    Logger.log("Push Error: " + e);
  }
}

/**
 * 主動推播訊息 (Push Message)
 */
function pushMessage(to, messages) {
  const token = CONFIG.get(KEY.LINE_TOKEN);
  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: to,
    messages: messages
  };
  
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch(e) {
    Logger.log("Push Error: " + e);
  }
}

/**
 * 產生商品卡片 (Flex Message JSON)
 */
function createProductCard(pid, name, price, imageUrl) {
  // 嘗試取得 LIFF ID，還沒設定就用預設值提醒
  const liffId = CONFIG.get(KEY.LIFF_ID) || "YOUR_LIFF_ID_HERE";
  const liffUrl = `https://liff.line.me/${liffId}?pid=${pid}`;

  return {
    "type": "flex",
    "altText": `上架成功：${name} $${price}`,
    "contents": {
      "type": "bubble",
      "hero": {
        "type": "image",
        "url": imageUrl,
        "size": "full",
        "type": "image",
        "url": imageUrl,
        "size": "full",
        "aspectRatio": "1:1",
        "aspectMode": "cover",
        "action": {
          "type": "uri",
          "uri": imageUrl
        }
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": name,
            "weight": "bold",
            "size": "xl",
            "wrap": true
          },
          {
            "type": "box",
            "layout": "baseline",
            "contents": [
              {
                "type": "text",
                "text": "$",
                "color": "#ff5555",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": " " + price,
                "weight": "bold",
                "size": "xl",
                "color": "#ff5555",
                "flex": 1
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "height": "sm",
            "color": "#06c755",
            "action": {
              "type": "uri",
              "label": "🛒 立即下單",
              "uri": liffUrl
            }
          },
          {
            "type": "button",
            "style": "primary",
            "height": "sm",
            "color": "#1E90FF",
            "action": {
              "type": "uri",
              "uri": `https://liff.line.me/${CONFIG.get(KEY.LIFF_ID)}?action=share&pid=${pid}`,
              "label": "📤 分享小卡",
            },
          },
          {
            "type": "button",
            "style": "secondary",
            "height": "sm",
            "color": "#aaaaaa",
            "action": {
              "type": "postback",
              "label": "❌ 下架",
              "data": `action=sold_out&pid=${pid}`
            }
          } 
        ],
        "flex": 0
      }
    }
  };
}

/**
 * 輔助：從 Config Sheet 讀取值
 */
function getValFromConfigSheet(key) {
  try {
    const sheetIs = CONFIG.SHEET_ID;
    if (!sheetIs) return null;
    
    // 這裡為了效能，其實不應該每次都 openById，但在 trigger 環境下通常還好
    // 如果真的很慢，建議把整個 config 讀進來存 cache
    const sheet = SpreadsheetApp.openById(sheetIs).getSheetByName(CONFIG.SHEET_TAB.CONFIG);
    const data = sheet.getDataRange().getValues();
    
    // 尋找 Key (假設在第一欄)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1]; // 回傳 Value
      }
    }
    return null;
  } catch (e) {
    Logger.log("Read Config Error: " + e.toString());
    return null;
  }
}

/**
 * 產生訂單收據卡片 (Receipt Card)
 */
function createOrderReceiptCard(order) {
  // 嘗試取得 LIFF ID，還沒設定就用預設值提醒
  const liffId = CONFIG.get(KEY.LIFF_ID) || "YOUR_LIFF_ID_HERE";
  
  
  return {
    "type": "flex",
    "altText": `訂單成立通知 #${order.order_id}`,
    "contents": {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "訂單成立通知",
            "weight": "bold",
            "color": "#1DB446",
            "size": "sm"
          },
          {
            "type": "text",
            "text": "$" + order.total,
            "weight": "bold",
            "size": "xxl",
            "margin": "md"
          },
          {
            "type": "text",
            "text": order.item_name + (order.spec ? ` (${order.spec})` : ""),
            "size": "xs",
            "color": "#aaaaaa",
            "wrap": true
          },
          {
            "type": "separator",
            "margin": "xxl"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "xxl",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  {
                    "type": "text",
                    "text": "單號",
                    "color": "#aaaaaa",
                    "size": "sm",
                    "flex": 1
                  },
                  {
                    "type": "text",
                    "text": "#" + order.order_id,
                    "wrap": true,
                    "color": "#666666",
                    "size": "sm",
                    "flex": 5
                  }
                ]
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  {
                    "type": "text",
                    "text": "時間",
                    "color": "#aaaaaa",
                    "size": "sm",
                    "flex": 1
                  },
                  {
                    "type": "text",
                    "text": order.time,
                    "wrap": true,
                    "color": "#666666",
                    "size": "sm",
                    "flex": 5
                  }
                ]
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
           {
            "type": "button",
            "style": "link",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "查看訂單",
              "uri": `https://liff.line.me/${liffId}?page=history`
            }
          }
        ]
      }
    }
  };
}
