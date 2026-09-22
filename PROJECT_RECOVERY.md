# 鄂职秋招项目恢复与交接

## 项目边界

本仓库是湖北省独立分站，不共享其他地区站点的数据、部署凭据或个人资料。公开页面无登录、无白名单；候选人画像与投递记录仅保存在浏览器本机。

## 常用命令

```powershell
npm install
npm test
npm run validate:data
npm run build
npm run build:pages
npm run dev
```

日常更新使用 `npm run update:daily`。来源访问失败时保留上一版状态，不把访问异常解释为招聘关闭。

## 数据规则

- 只收录“湖北省内”或具有明确全国统一校招入口的“全国可投”记录。
- 主目录、外企目录和每日有效新增中的湖北占比均不得低于 70%。
- Offer先生保持排除；聚合平台仅用于发现。
- 第三方单一来源只能标记待确认；开放中必须有官方、政府或双来源证据。
- 分公司、工厂和项目部作为用人单位，不作为法律控制树节点。

## 部署

GitHub Pages 构建路径为 `/campus-jobs-2027-hubei/`。Cloudflare Worker 仅提供静态资产与安全响应头，不需要 KV、白名单或会话密钥。
