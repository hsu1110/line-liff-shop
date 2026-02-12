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
    CONFIG: "SystemConfig", // 新增設定分頁
    LOGS: "Logs" // 新增日誌分頁
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
  LIFF_ID: "LIFF_ID",
  CHANNEL_ID: "CHANNEL_ID" // 新增 Channel ID
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
      ["LIFF_ID", "請填入 LIFF ID"],
      ["CHANNEL_ID", "請填入 Channel ID (用於驗證管理員)"]
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
  
  // 5. 處理 "Logs" 分頁
  let logSheet = ss.getSheetByName(CONFIG.SHEET_TAB.LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.SHEET_TAB.LOGS);
  } else {
    logSheet.clear();
  }
  logSheet.getRange(1, 1, 1, 3).setValues([
    ["Time", "Type", "Payload"]
  ]);
  logSheet.setColumnWidth(1, 180);
  logSheet.setColumnWidth(2, 100);
  logSheet.setColumnWidth(3, 800);

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
    const rawContent = e.postData.contents;
    saveLog("POST", rawContent); // 紀錄原始 Payload
    
    const contents = JSON.parse(rawContent);
    
    // 如果是 LINE Webhook (會有 events 屬性)
    if (contents.events) {
      handleLineWebhook(contents);
      return createJSONOutput({ status: "success" });
    }

    // --- 前端 API 路由 ---
    // --- 前端 API 路由 ---
    const action = contents.action;
    
    // 檢查是否為管理員操作 (以 "admin" 開頭)
    if (action.startsWith('admin') || action === 'checkAdmin') {
      // 強制驗證 ID Token
      const idToken = contents.idToken;
      const realUserId = verifyIdToken(idToken);
      
      if (!realUserId || realUserId !== CONFIG.get(KEY.ADMIN_ID)) {
          // 如果是 localhost 開發或測試，允許 MOCK_TOKEN (僅當後端也開啟 DEBUG 模式時? 還是直接擋掉?)
          // 安全起見，直接阻擋。開發者需使用真實 Token 或自行處理。
          return createJSONOutput({ status: 'error', message: 'Unauthorized: Invalid or Missing Identity' });
      }
      
      // 驗證通過，執行管理員邏輯
      switch (action) {
        case 'checkAdmin':
             return createJSONOutput({ isAdmin: true, status: 'success' }); // 能過 verifyIdToken 且 ID 吻合就是 Admin

        case 'adminUpdateProduct':
            return createJSONOutput(updateProduct(contents.data));
            
        case 'adminDeleteProduct':
            return createJSONOutput(deleteProduct(contents.pid));
            
        case 'adminGetAllOrders':
            return createJSONOutput({ status: 'success', data: getAdminOrders() });
            
        case 'adminUpdateOrder':
            return createJSONOutput(updateOrderStatus(contents.orderId, contents.status));
      }
    }

    // 一般使用者路由
    switch (action) {
      case 'submitOrder':
        return createJSONOutput(submitOrder(contents.data));

      case 'getProducts': 
        return createJSONOutput({ status: "success", data: getAllProducts() });
        
      case 'getOrders': 
        // 修正: 這裡應該用 contents.userId (POST Body)
        const userId = contents.userId; 
        return createJSONOutput({ status: "success", data: getOrders(userId) });

      default:
        return createJSONOutput({ status: "error", message: "Unknown Action: " + action });
    }

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
      const qty = data[i][7];
      const total = data[i][8];
      
      userOrders.push({
        order_id: data[i][0],
        time: Utilities.formatDate(new Date(data[i][1]), "GMT+8", "yyyy/MM/dd HH:mm"),
        user_name: data[i][2],
        item_name: data[i][5],
        spec: data[i][6],
        qty: qty,
        total: total,
        price: qty > 0 ? (total / qty) : 0, 
        order_status: data[i][9]
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
    // 欄位: [Orderid, Time, UserName, UserID, PID, ItemName, Spec, Qty, Total, Status]
    if (data[i][0] === targetOrderId) {
      return {
        order_id: data[i][0],
        time: Utilities.formatDate(new Date(data[i][1]), "GMT+8", "yyyy/MM/dd HH:mm"),
        user_name: data[i][2],
        item_name: data[i][5],
        spec: data[i][6],
        qty: data[i][7],
        total: data[i][8],
        order_status: data[i][9]
      };
    }
  }
  return null;
}

/**
 * [API] 提交訂單 (供 LIFF 使用) - 支援批次結帳
 */
function submitOrder(formData) {
  const lock = LockService.getScriptLock();
  // 最多等待 5 秒
  if (lock.tryLock(5000)) {
    try {
      const items = formData.items; // 預期是一個陣列
      const userId = formData.userId;
      const userName = formData.userName;
      const orderTime = new Date();
      const batchId = "ORD_" + orderTime.getTime(); // 這次結帳的主編號
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return { status: 'error', message: '購物車是空的' };
      }

      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_TAB.ORDERS);
      const rowsToAdd = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const pid = item.pid;
        const spec = item.spec;
        const qty = parseInt(item.qty);

        // 1. 安全查價 (不信任前端價格)
        const product = getProductInfo(pid);
        if (!product) continue; // 略過不存在的商品
        if (product.status === 'SOLD_OUT') continue; // 略過售完商品

        const price = parseInt(product.price);
        const totalAmount = price * qty;
        
        // 生成子訂單編號 (如果是批次，可以加後綴)
        const subOrderId = items.length > 1 ? `${batchId}-${i+1}` : batchId;

        // 欄位順序: ["order_id", "order_time", "user_name", "user_id", "pid", "item_name", "spec", "qty", "total_amount", "order_status"]
        rowsToAdd.push([
          subOrderId, orderTime, userName, userId, pid, 
          product.name, spec, qty, totalAmount, "未付款"
        ]);
      }

      if (rowsToAdd.length > 0) {
        // 批次寫入提升效能
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, rowsToAdd.length, 10).setValues(rowsToAdd);
        return { status: 'success', orderId: batchId };
      } else {
        return { status: 'error', message: '所有商品已失效或售完' };
      }
      
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
 * 驗證 LINE ID Token
 * @return {string|null} userId 成功回傳 User ID，失敗回傳 null
 */
function verifyIdToken(idToken) {
  if (!idToken) return null;
  if (idToken === "MOCK_TOKEN") return null; // 拒絕 Mock Token
  
  const channelId = CONFIG.get(KEY.CHANNEL_ID);
  
  // 安全檢查：如果沒設定 Channel ID，但在 Localhost 測試，不要讓整個 Script Crash
  if (!channelId) {
    Logger.log("❌ Missing CHANNEL_ID in Config");
    // 如果是 Admin 操作但沒設定 Channel ID，為了安全必須擋下
    return null; 
  }

  const url = "https://api.line.me/oauth2/v2.1/verify";
  const payload = {
    id_token: idToken,
    client_id: channelId
  };

  try {
    const options = {
      method: 'post',
      payload: payload, // Form UrlEncoded
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      Logger.log("Token Verify Error: " + data.error_description);
      return null;
    }
    
    // 檢查是否過期 (雖然 API 會檢查，但雙重確認)
    // data.exp is in seconds
    // API 已經幫忙檢查 nonce, aud, exp, iss
    
    return data.sub; // User ID
  } catch (e) {
    Logger.log("Verify Exception: " + e.toString());
    return null;
  }
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
 * 📝 儲存日誌到 Google Sheet
 */
function saveLog(type, content) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_TAB.LOGS);
    if (sheet) {
      sheet.appendRow([new Date(), type, content]);
    }
  } catch (e) {
    Logger.log("SaveLog Error: " + e.toString());
  }
}

/**
 * 📦 更新商品資訊 (管理員)
 */
function updateProduct(data) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEET_TAB.PRODUCTS);
      const rows = sheet.getDataRange().getValues();
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.pid) {
          // 依序更新：名稱、描述、價格、圖片、狀態、規格
          // 確保欄位對應正確:
          // Col 2: Name
          // Col 3: Price
          // Col 4: ImageUrl
          // Col 5: Status
          // Col 6: CreatedAt (不改)
          // 這裡原代碼似乎有錯，原代碼：
          // sheet.getRange(i + 1, 2).setValue(data.name);
          // sheet.getRange(i + 1, 3).setValue(data.description); // Products 表原本沒有 description 欄位? setup() 只有 6 欄
          // setup(): ["pid", "name", "price", "image_url", "status", "created_at"]
          // 需要小心，這裡只更新存在的欄位
          
          sheet.getRange(i + 1, 2).setValue(data.name);
          sheet.getRange(i + 1, 3).setValue(data.price);
          sheet.getRange(i + 1, 4).setValue(data.image_url);
          sheet.getRange(i + 1, 5).setValue(data.status);
          
          return { status: 'success' };
        }
      }
      return { status: 'error', message: '找不到商品' };
    } catch(e) {
      return { status: 'error', message: e.toString() };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { status: 'error', message: '系統忙碌中' };
  }
}

/**
 * 🗑️ 刪除商品 (管理員)
 */
function deleteProduct(pid) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEET_TAB.PRODUCTS);
      const rows = sheet.getDataRange().getValues();
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === pid) {
          sheet.deleteRow(i + 1);
          return { status: 'success' };
        }
      }
      return { status: 'error', message: '找不到商品' };
    } finally {
      lock.releaseLock();
    }
  }
  return { status: 'error', message: '系統忙碌中' };
}

/**
 * 📜 獲取全量訂單 (管理員)
 */
function getAdminOrders() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_TAB.ORDERS);
  const rows = sheet.getDataRange().getValues();
  const orders = [];
  
  for (let i = rows.length - 1; i >= 1; i--) {
    orders.push({
      orderId: rows[i][0],
      time: rows[i][1],
      userName: rows[i][2],
      userId: rows[i][3],
      pid: rows[i][4],
      productName: rows[i][5],
      spec: rows[i][6],
      qty: rows[i][7],
      amount: rows[i][8],
      status: rows[i][9]
    });
  }
  return orders;
}

/**
 * ✅ 更新訂單狀態 (管理員)
 */
function updateOrderStatus(orderId, status) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEET_TAB.ORDERS);
      const rows = sheet.getDataRange().getValues();
      
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === orderId) {
          sheet.getRange(i + 1, 10).setValue(status);
          count++;
        }
      }
      return count > 0 ? { status: 'success' } : { status: 'error', message: '找不到訂單' };
    } finally {
      lock.releaseLock();
    }
  }
  return { status: 'error', message: '系統忙碌中' };
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
  const liffUrl = `https://liff.line.me/${liffId}/#/product/${pid}`; // 改成 Hash 路由

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
              "uri": `https://liff.line.me/${CONFIG.get(KEY.LIFF_ID)}/#/product/${pid}?action=share`, // 分享也改用 Hash
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
              "uri": `https://liff.line.me/${liffId}/#/history` // 改成 Hash 路由
            }
          }
        ]
      }
    }
  };
}
