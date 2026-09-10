# 共享章节点赞配置

1. 在 https://supabase.com 创建自己的项目。
2. 打开项目的 SQL Editor，新建查询，粘贴本目录 `likes.sql` 全部内容并运行。
3. 从项目的 Connect 对话框或 Settings / API Keys 获取 Project URL 和 Publishable key。
4. 将这两项填入根目录 `likes.js` 顶部的 `url` 和 `publishableKey`。不要填写 Secret key 或 service_role key。
5. 提交并推送网站修改，等 GitHub Pages 部署完成后打开第一章。
6. 验证：初次显示 0；点击后变为 1；刷新仍为 1 且已点赞。在另一浏览器打开同章，应看到 1，点赞后变为 2。返回原浏览器刷新，应显示 2。第二章计数应保持独立。

配置前显示“点赞即将开放”和破折号，不伪造计数。配置后读取失败可点击重试；点赞请求可安全重试，相同浏览器标识与章节的组合在数据库中只能出现一次。网页只加载公开 API key；数据库原始记录禁止匿名直接读取和修改，仅开放两个限定用途的函数。

这里的去重是每个浏览器一次，不是实名用户一次。更换浏览器、清除站点数据或人为构造新标识可以再次点赞；该轻量方案不提供严格防刷。总数在打开页面和点赞后获取，其他读者点赞后需要刷新查看。浏览器只保存随机标识，总数由数据库保存。

官方说明：https://supabase.com/docs/guides/getting-started/api-keys 和 https://supabase.com/docs/guides/database/functions
