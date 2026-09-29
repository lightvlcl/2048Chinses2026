# 2048新中版 — 可上架 App Store / Google Play 的完整游戏工程

一款为移动端精心打磨的 2048：触屏滑动 + 键盘操作、流畅合并动画、计分与最高分、撤销、断点续玩、胜利/结束判定、**水墨中国名景背景一键切换（桂林/长城/西湖/黄山）**，已内置 **iOS 与 Android 双原生工程**（Capacitor）与 Codemagic 云构建配置 —— **一台 Windows 电脑即可同时上架 App Store 和 Google Play**。

---

## 一、立即试玩

直接双击打开 www`/index.html`，或起一个本地服务：

```bash
cd game2048
npm install
npx serve www
```

- 手机模拟：浏览器按 F12 → 切换设备工具栏（iPhone 尺寸），用鼠标拖动模拟滑动
- 逻辑测试：`node tools/test-logic.js`（随机对局 + 不变量校验）

## 二、项目结构

```
game2048/
├── www/                     # 游戏本体（纯 HTML/CSS/JS，无任何构建步骤）
│   ├── index.html
│   ├── css/style.css
│   └── js/game.js           # 纯逻辑层 + UI 层，逻辑层可独立测试
├── ios/                     # iOS 原生工程（已生成，含图标与显示名）
├── android/                 # Android 原生工程（已生成，含全套自适应图标与签名配置）
├── resources/
│   ├── icon-1024.png        # iOS App 图标（满幅 1024×1024，无水印）
│   └── play-icon-512.png    # Google Play 商店图标（512×512）
├── capacitor.config.json    # Capacitor 配置（appId / appName）
├── codemagic.yaml           # Codemagic 云构建：签名 → 打包 IPA → 上传
├── privacy-policy.html      # 隐私政策页（提审必需，需公开托管）
└── tools/test-logic.js      # 自动化测试
```

## 三、上架前必改的 5 处

| # | 位置                                     | 改成什么                                  |
| - | -------------------------------------- | ------------------------------------- |
| 1 | `capacitor.config.json` 的 `appId`      | 反域名格式唯一 ID，如 `com.zhangsan.merge2048` |
| 2 | `codemagic.yaml` 的 `bundle_identifier` | 与上面**完全一致**                           |
| 3 | `android/app/build.gradle` 的 `namespace` 和 `applicationId` | 与上面**完全一致**（两处） |
| 4 | `privacy-policy.html` 中的联系邮箱           | 你的真实邮箱                                |
| 5 | （接广告时）`www/js/ads.js` 的 `CONFIG`、`Info.plist` 与 `AndroidManifest.xml` 的 AdMob App ID | 你的真实 AdMob ID，并把 `TEST_MODE` 改为 `false` |

改完执行 `npx cap sync ios` 同步。若想连 App 显示名也改掉（推荐起个独特名字，如「数字合并传奇」），改 `capacitor.config.json` 的 `appName` 后删除 `ios/` 目录重新 `npx cap add ios`，或直接改 `ios/App/App/Info.plist` 里的 `CFBundleDisplayName`。

> ⚠️ App Store 上 2048 同类产品极多，**独特的 App 名称 + 图标风格**能显著降低被审核员以 4.3（抄袭/重复应用）拒绝的风险。

## 四、上架全流程（约 6 步）

### 步骤 1 · 注册 Apple 开发者账号（唯一绕不开的花费）

- 网址：<https://developer.apple.com/programs/zh-CN/> ，费用 **$99/年（约 ¥688）**
- 个人账号即可，用 iPhone 上的 Apple ID App 或网页注册，通常 1–2 天开通

### 步骤 2 · 把代码推到 GitHub

```bash
cd game2048
git init && git add . && git commit -m "2048 game ready for App Store"
# 在 github.com 新建一个空仓库后：
git remote add origin https://github.com/你的用户名/game2048.git
git push -u origin main
```

### 步骤 3 · 配置 Codemagic 云构建（免费额度足够）

1. 注册 <https://codemagic.io> （用 GitHub 账号登录）
2. **连接 App Store Connect**：Codemagic 后台 → Team settings → Integrations → App Store Connect，用 API 密钥连接：
   - 到 <https://appstoreconnect.apple.com> → 用户和访问 → 集成 → 生成 API 密钥（角色选 App Manager），记下 **Issuer ID** 和 **Key ID**，下载 `.p8` 私钥文件
   - 把这三样填入 Codemagic 集成表单
3. Add application → 选择你的 GitHub 仓库 → Project type 选 **iOS App** → Codemagic 会自动识别根目录的 `codemagic.yaml` → 选择 workflow `ios-release`
4. 直接 Start build

构建流程全自动：安装依赖 → 生成/同步 iOS 工程 → 写入图标 → 自动申请证书与描述文件（`xcode-project use-profiles`）→ 打包签名 IPA → **自动上传到 TestFlight**。

### 步骤 4 · 在 App Store Connect 创建 App

1. <https://appstoreconnect.apple.com> → 我的 App → ➕ 新建 App
2. 名称：全网唯一（如「数字合并传奇」）、主要语言：简体中文、Bundle ID 选择 `com.zhangsan.merge2048`（首次构建后自动出现）、SKU 随意（如 `2048-001`）

### 步骤 5 · 填写上架资料

- **截图**：必须提供 iPhone 截图。最省事的方法：TestFlight 装到真机后截图；或用浏览器 F12 的 iPhone 视口截图。当前要求 6.9 英寸（1320×2868 或 1290×2796）一组即可
- **描述 / 关键词 / 副标题**：关键词如 `2048,益智,合并,数字,休闲,单机`
- **隐私政策 URL**（必填！）：把 `privacy-policy.html` 免费托管到 GitHub Pages：
  ```bash
  # 在 GitHub 新建仓库 yourname/privacy（或用本仓库）
  # Settings → Pages → 启用，得到形如：
  # https://你的用户名.github.io/game2048/privacy-policy.html
  ```
- **App 隐私**：选择「不收集任何数据」——本应用确实不收集，如实填写即可
- **年龄分级**：全选「无」，结果是 **4+**
- **分类**：游戏 → 益智解谜；价格：免费（或定价）

### 步骤 6 · 提交审核

- TestFlight 验证没问题后，在 App Store Connect「分发」页面提交以供审核
- 通常 **24–48 小时**出结果；被拒会写明理由（见下节对策），修改后重新提交即可

## 五、上架 Google Play（更简单，建议两个一起上）

Android 打包用 Linux 云机器即可，`codemagic.yaml` 已包含 `android-release` workflow，产出**签名 AAB** 并自动上传 Google Play 内部测试轨道。

1. **注册 Google Play 开发者账号**：https://play.google.com/console ，**$25 一次性**（不是年费）
   ⚠️ 2023 年 11 月后注册的**个人**账号，首次正式发布前需先做封闭测试（≥12 名测试者连续测试 14 天）；组织/公司账号无此要求
2. **生成上传密钥**（任何装了 JDK 的电脑执行；都没有就先做下一步再让 Codemagic 帮忙）：
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
   **务必备份此文件**——丢失后将永远无法更新该应用！
3. **Codemagic 配置变量组** `android_credentials`（Team settings → Environment variables → 新建同名组）：
   - `CM_KEYSTORE`：密钥文件转 base64（Git Bash 执行 `base64 -w0 upload-keystore.jks`）
   - `CM_KEYSTORE_PASSWORD` / `CM_KEY_ALIAS`（如 `upload`）/ `CM_KEY_ALIAS_PASSWORD`
   - `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`：Play Console → 设置 → API 访问权限 → 关联 Google Cloud 项目 → 创建服务账号，把 JSON 全文存入该变量
4. **跑 workflow `android-release`** → 构建签名 AAB 并自动上传到内部测试轨道
5. **Play Console 填写资料**：应用名称、简短/完整描述、商店图标（**`resources/play-icon-512.png` 已备好**）、至少 2 张手机截图、隐私政策 URL（与 iOS 共用同一份）、内容分级问卷（休闲益智 → 全民级）、数据安全声明（选**不收集任何数据**，如实）
6. 内部测试验证通过后 → 申请正式发布

每次更新版本：修改 `android/app/build.gradle` 中的 `versionCode`（+1）与 `versionName`，重新构建即可。

## 六、费用总览

| 项目                 | 费用                                          |
| ------------------ | ------------------------------------------- |
| Apple 开发者账号（上 iOS） | $99/年（约 ¥688）                               |
| Google Play 账号（上安卓） | $25 **一次性**                                  |
| Codemagic          | 免费额度足够（iOS 用 mac 机器、Android 用 linux 机器更快） |
| GitHub 托管代码 + 隐私政策 | 免费                                          |

## 七、常见拒审原因与对策

| 条款          | 情形        | 对策                                            |
| ----------- | --------- | --------------------------------------------- |
| 4.3 重复/抄袭应用 | 2048 克隆太多 | 独特名称 + 自定义图标配色 + 玩法微调（如加入撤销、挑战模式），本工程已具备差异化基础（含中国名景水墨皮肤） |
| 2.1 完整性     | 崩溃/白屏     | 先装 TestFlight 真机验证；本游戏无登录、无网络请求，风险低           |
| 5.1.1 隐私    | 缺隐私政策     | 已附 `privacy-policy.html`，务必公开托管并填写 URL        |
| 2.3 元数据     | 截图与实际不符   | 截图请用真实游戏画面                                    |

## 八、FAQ

**Q：真的完全不用 Mac 吗？**  
A：是。iOS 的签名、打包、上传全部由 Codemagic 的 macOS 云机器完成，你只需要网页浏览器。

**Q：上安卓也需要云构建吗？**  
A：不必须。本机装 Android Studio 后，直接 `cd android && ./gradlew bundleRelease` 也能打包；云构建只是省去配环境的麻烦。

**Q：能不上架也给人玩吗？**  
A：可以。`www/` 是纯静态网页，任意静态托管（GitHub Pages 等）即可在线玩。

**Q：以后想改游戏内容？**  
A：只改 `www/` 下的文件，改完执行 `npx cap sync ios && npx cap sync android`，推送后到 Codemagic 重跑两个 workflow 即可。

## 九、上架后的维护指南（重要，别指望一劳永逸）

先说结论：**要维护，但这是所有 App 里最省心的一档**。没有服务器、没有登录、不收集数据，不存在后端运维和隐私合规负担，剩下的大头只有"跟着系统版本走"。

### 每年必做一次（约半天工作量）

| 时间点 | 为什么要动 | 做什么 |
| ------ | ---------- | ------ |
| 每年秋天（iOS/Android 新系统发布后） | Google Play 政策：新系统发布 **1 年内**，`targetSdkVersion` 必须达标，否则**新用户将搜不到、装不了你的应用**，且无法提交更新；Apple 同样要求新提审应用使用较新的 SDK | 升级 Capacitor 依赖（`npm install @capacitor/core@latest @capacitor/ios@latest @capacitor/android@latest`）→ `npx cap sync` → `versionCode`+1 → 推送 → 重跑两个 workflow |

### 什么时候必须发新版

- 系统/机型兼容性问题（用户反馈白屏、崩溃——看 Play Console 的 Android Vitals 和 TestFlight 反馈）
- 商店政策变化（会发邮件通知开发者账号绑定的邮箱，照着改即可）
- 你自己想改内容、修 bug、做活动版本

### 长期完全不更新的后果（真实风险）

1. Google Play：targetSdk 过期 → **新用户不可见**（老用户已安装的还能用，但等于停止增长）
2. App Store：无法提交任何更新；新 Xcode 发布后旧构建的 app 不会被下架，但系统大版本更新后可能出现兼容性 bug
3. 差评积累：系统更新后若出现白屏/闪退没人修，评分会慢慢掉

### 账号年费别忘了

- Apple：**$99/年**必须续，断缴后 App 会被下架
- Google Play：$25 一次性，**不用续**

### 建议节奏（佛系版）

- 每年秋天看到 Apple/Google 发新系统 → 找个周末花半天：升级依赖 → 重打包 → 提审，完事
- 平时偶尔瞄一眼两边的评价和崩溃报告，没有报障就稳
- 不需要内容更新、不需要运营活动——2048 属于"上架后躺着也能用"的类型，但要记得上面那笔年费和年度 SDK 更新

## 十、广告变现（AdMob，已内置，装上即用）

已内置 **Google AdMob** 双端广告，当前包含两种形式：

- **激励视频**：游戏结束后出现「▶️ 看广告复活」按钮——随机移除一个方块继续游戏。这是休闲游戏收入最高、体验最好的形式（玩家自愿观看）
- **插屏广告**：点「再来一局」时按频率规则弹出（内置节流：每 2 次结束最多 1 次、间隔 ≥90 秒、仅在死亡结算时，符合商店政策）

默认使用 Google 官方**测试广告 ID**——现在构建安装就能看到测试广告，零成本验证整条链路。

### 开通正式广告的流程

1. 注册 AdMob：https://apps.admob.com （Google 账号即可），「应用 → 添加应用」手动添加 iOS / Android 各一次，记下 **App ID**
2. 每个平台创建两个广告位：**插屏**、**激励视频**，记下广告位 ID
3. 替换 ID（共 3 处）：
   - `ios/App/App/Info.plist` → `GADApplicationIdentifier`
   - `android/app/src/main/AndroidManifest.xml` → `APPLICATION_ID` meta-data
   - `www/js/ads.js` → `CONFIG` 里的广告位 ID，并把 `TEST_MODE` 改为 `false`
4. `npx cap sync ios && npx cap sync android` → 推送 → Codemagic 重新构建

### 政策红线（违规会封 AdMob 账号）

- 禁止诱导/伪装点击（广告紧挨"领奖"按钮、按钮与关闭键重叠 = 违规）
- 插屏不能打断操作中、不能过于频繁（已内置节流，别改太激进）
- 接了广告后，商店后台的隐私问卷要如实改为「收集设备标识符用于广告」；本仓库 `privacy-policy.html` 已同步加入 AdMob 条款
- 若在商店后台申报"主要面向儿童"，需在 AdMob 单独配置儿童向广告设置

### 收款

收款门槛 **$100**，依次完成：PIN 地址验证 → 提交税务表（中国内地开发者选 W-8BEN）→ 绑定收款方式（支持电汇到国内银行卡），每月按账期结算。

### 收入预期（说实话）

| 广告形式 | eCPM 量级（人民币/千次展示） | 状态 |
| ------- | ---------------------- | ---- |
| 激励视频 | ¥50–150 | ✅ 已接（复活场景转化率高） |
| 插屏 | ¥20–80 | ✅ 已接 |
| 横幅 Banner | ¥1–8 | 未接：收入最低且挤占棋盘视野，不建议 |

休闲益智流量 eCPM 偏低，**收入 = eCPM × 展示次数，核心还是 DAU 规模**。粗略预期：日活 1,000 时月收入大约几十到几百元；这个品类想月入过万通常需要日活 5 万+，或主打海外（美国流量 eCPM 可高出数倍，AdMob 天然支持）。建议策略：先上架攒量 + 短视频/社交平台引流，广告架构已经就位，量起来收入自然跟上。
