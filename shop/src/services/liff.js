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
  
  isInClient() {
    if (this.isMock) return false
    return liff.isInClient()
  }
}

export default liffService
