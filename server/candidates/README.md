# Candidate API

独立的候选名单后端，给 `/candidates` 页面使用。它直接在服务器本地 SQLite 中存储候选数据，不依赖 Notion、云函数或第三方数据库。

## API

```text
GET    /health
GET    /candidates
POST   /candidates
PATCH  /candidates/:id
DELETE /candidates/:id
POST   /candidates/:id/upvote
GET    /candidates/:id/comments
POST   /candidates/:id/comments
DELETE /candidates/:id/comments/:commentId
```

响应格式：

```json
{ "ok": true, "data": {} }
```

错误格式：

```json
{ "ok": false, "message": "错误说明" }
```

创建和更新候选时，`name` 和 `reason` 必填；地址/城市、人均、标签、推荐人都可以为空。
创建评论时，`content` 必填且至少 2 个字，`author` 可以为空。评论以纯文本存储和展示。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 监听地址 |
| `PORT` | `8080` | 监听端口 |
| `CANDIDATE_DB_PATH` | `server/candidates/data/candidates.sqlite` | SQLite 数据库路径 |
| `ALLOWED_ORIGINS` | `*` | 允许跨域来源，逗号分隔 |
| `MAX_BODY_BYTES` | `32768` | 单次请求体最大字节数 |
| `MAX_LIST_ITEMS` | `500` | 候选列表最大返回数量 |
| `MAX_COMMENT_ITEMS` | `200` | 单个候选评论最大返回数量 |
| `CANDIDATE_BACKUP_DIR` | `server/candidates/backups` | 备份目录 |
| `BACKUP_RETENTION_DAYS` | `30` | 备份保留天数 |
| `HIDDEN_RETENTION_DAYS` | `30` | `hidden` 候选保留天数 |
| `AUDIT_LOG_RETENTION_DAYS` | `7` | 修改日志保留天数 |

## 服务器部署

建议部署路径：

```text
/opt/large-stomach-bag/server/candidates
/var/lib/large-stomach-bag/candidates.sqlite
/var/backups/large-stomach-bag
```

启动服务：

```bash
python3 /opt/large-stomach-bag/server/candidates/app.py
```

前端默认会请求：

```text
https://foodtotry.giraffish.top
```

如果以后要换 API 域名，可以在 Netlify 覆盖环境变量：

```text
VITE_CANDIDATE_API_BASE=https://你的候选 API 域名
```

## 备份和清理

```bash
CANDIDATE_DB_PATH=/var/lib/large-stomach-bag/candidates.sqlite \
CANDIDATE_BACKUP_DIR=/var/backups/large-stomach-bag \
python3 /opt/large-stomach-bag/server/candidates/backup_cleanup.py
```

脚本会先备份 SQLite，再删除超过 `HIDDEN_RETENTION_DAYS` 的 `hidden` 候选及其评论，清理超过 `AUDIT_LOG_RETENTION_DAYS` 的修改日志，并清理过期备份。
