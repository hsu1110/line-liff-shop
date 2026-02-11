/**
 * 🖼️ Cloudinary 圖片優化工具
 * 利用動態 URL 轉換減少流量並提升載入速度
 */

export const optimizeImage = (url, width = 600) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  // 在 /upload/ 後方插入轉換參數
  // f_auto: 自動選擇最佳格式 (webp, avif...)
  // q_auto: 自動智慧壓縮
  // w_xxx: 指定寬度
  const transform = `f_auto,q_auto,w_${width}`;
  
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transform}/`);
  }
  
  return url;
};
