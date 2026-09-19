# 海的星球・SEA PLANET

一個以「控制 → 發現影響 → 主動恢復平衡」為核心的互動海洋作品。

## 功能
- Canvas 透明動態海洋星球
- 水母、魚群、鯨魚、海豚、海龜與海洋垃圾
- nanoKONTROL2 Web MIDI 即時控制
- 畫面控制台與鍵盤備援
- 污染、洋流、深海、淨化等事件
- 響應式介面

## 啟動
直接用靜態伺服器開啟：
```bash
python3 -m http.server 8080
```
前往 http://localhost:8080。

## nanoKONTROL2
1. 以 USB 連接裝置並切至 CC Mode。
2. 使用 Chrome 或 Edge 開啟網站。
3. 按「連接 nanoKONTROL2」，允許 MIDI 權限。
4. 推桿預設對應 CC 0–7；旋鈕預設對應 CC 16–23。網站也會自動學習前 8 組未知的推桿／旋鈕 CC。

> Web MIDI 需要 localhost 或 HTTPS 安全來源。
