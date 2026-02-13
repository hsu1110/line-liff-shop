import liff from '@line/liff'

// 請填入你的 LIFF ID
const LIFF_ID = "2009098831-W7Oem3QR"

const liffService = {
  isMock: false,
  profile: null,

  async init() {
    try {
      if (document.cookie.includes('mock=true') || window.location.hostname === "localhost") {
        console.log("LIFF: Local Dev Mode (Mock)")
        this.isMock = true
        this.profile = {
          userId: "BROWSER_TEST_USER", 
          displayName: "開發者 (Local)",
          pictureUrl: "https://via.placeholder.com/150"
        }
        return
      }

      await liff.init({ liffId: LIFF_ID })
      if (!liff.isLoggedIn()) {
        liff.login()
      } else {
        this.profile = await liff.getProfile()
      }
    } catch (e) {
      console.error("LIFF Init Error:", e)
      // Fallback to mock for robust dev
      this.isMock = true
      this.profile = { userId: "ERROR_USER", displayName: "Error User" }
    }
  },

  getUser() {
    if (this.isMock) return this.profile
    return this.profile
  },
  
  getIDToken() {
    if (this.isMock) return "MOCK_TOKEN"
    
    // 同步檢查過期 (liff.getDecodedIDToken 是同步的)
    const decoded = liff.getDecodedIDToken()
    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp - now < 300) {
        console.log("Token expired or expiring soon.")
        // 注意：這裡不能直接做 async login，因為這會變成非同步
        // 我們只能建議使用者重整，或者依賴 LIFF SDK 自動處理
        // 但為了避免送出過期 Token，我們可以回傳 null 讓前端有機會處理
        // 或者直接回傳，讓後端擋
      }
    }
    return liff.getIDToken()
  },
  
  isInClient() {
    if (this.isMock) return false
    return liff.isInClient()
  }
}

export default liffService
