# large_stomach_bag

我也想拥有大卫带。这个项目是一个 Vue 3 餐厅记录站点，用来展示“已经吃过”的餐厅、地图点位、统计信息，以及给朋友提交新餐厅建议的候选名单。

线上前端部署在 Netlify：

```text
https://food.giraffish.top
```

候选名单 API 独立部署在服务器：

```text
https://foodtotry.giraffish.top
```

## 功能

- 封面页：首次进入时展示入口动画，并记录本会话已经访问过封面。
- 主页列表：搜索、筛选、排序、深色模式、列表/地图模式切换。
- 地图模式：使用高德地图展示餐厅点位、聚合点、当前定位和选中餐厅浮层。
- 餐厅详情页：展示已吃过餐厅的完整信息、图片、评分、评论入口等。
- 统计页：按已有餐厅数据展示统计信息。
- 候选名单：游客可以新增候选、顶帖、查看详情、编辑和删除。候选数据和已吃过餐厅数据分开存储。

## 技术栈

- Vue 3 + Vite
- TypeScript
- Pinia
- Vue Router
- Tailwind CSS
- lucide-vue-next
- 高德地图 JSAPI
- PWA via vite-plugin-pwa
- 候选名单后端：Python 标准库 + SQLite + nginx + systemd

## 数据来源

已吃过餐厅数据来自 Notion，经 `scripts/sync.js` 同步生成：

```text
src/data/restaurants.json
```

候选名单不写入 Notion，独立存储在服务器 SQLite 中。前端通过 `src/services/candidates.ts` 请求候选 API。

## 本地开发

安装依赖：

```sh
npm install
```

启动开发服务器：

```sh
npm run dev
```

常用检查：

```sh
npm run type-check
npm run lint
npm run build-only
```

完整构建会先同步 Notion 数据：

```sh
npm run build
```

## 环境变量

本地创建 `.env`。不要提交 `.env`，仓库中只保留变量名和说明。

```sh
VITE_AMAP_JS_KEY=your_amap_browser_js_key
VITE_AMAP_SECURITY_CODE=your_amap_security_code
AMAP_KEY=your_amap_web_service_key
NOTION_KEY=your_notion_integration_token
NOTION_DB_ID=your_notion_database_id
GITHUB_TOKEN=your_optional_image_hosting_token
VITE_TWIKOO_ENV_ID=your_optional_twikoo_env_id
VITE_TWIKOO_SCRIPT_SRC=your_optional_twikoo_script_src
VITE_CANDIDATE_API_BASE=https://foodtotry.giraffish.top
```

说明：

- `VITE_AMAP_JS_KEY` 和 `VITE_AMAP_SECURITY_CODE` 用于浏览器地图。
- `AMAP_KEY` 只给 `scripts/sync.js` 做高德 Web Service 查询。
- `NOTION_KEY` 和 `NOTION_DB_ID` 用于同步已吃过餐厅数据。
- `GITHUB_TOKEN` 可选，用于图片托管相关同步流程。
- `VITE_TWIKOO_ENV_ID` 和 `VITE_TWIKOO_SCRIPT_SRC` 可选，用于详情页评论。
- `VITE_CANDIDATE_API_BASE` 可选；代码默认请求 `https://foodtotry.giraffish.top`。

## 路由

```text
/                  封面页
/home              主页列表/地图
/restaurant/:id    已吃过餐厅详情
/stats             统计页
/candidates        候选名单列表
/candidates/:id    候选详情、编辑、删除
```

## 目录结构

```text
src/
├─ main.ts                         # Vue app bootstrap: Pinia, router, motion plugin
├─ App.vue                         # Route outlet and page transition shell
├─ assets/
│  └─ main.css                     # Tailwind entry and global theme variants
├─ router/
│  └─ index.ts                     # Cover, home, detail, stats, candidates routes
├─ stores/
│  └─ restaurants.ts               # Restaurant data, filters, sorting, location, map state
├─ data/
│  └─ restaurants.json             # Generated restaurant dataset from Notion sync
├─ services/
│  └─ candidates.ts                # Candidate API client
├─ types/
│  └─ candidate.ts                 # Candidate data types
├─ composables/
│  ├─ useAMap.ts                   # AMap loader, city lookup, and user geolocation
│  ├─ useFilterQuerySync.ts        # Sync filter state with URL query
│  ├─ useImageFallback.ts          # Runtime image fallback chain
│  └─ useRestaurantFilters.ts      # Shared filter options and mutation helpers
├─ utils/
│  ├─ city.ts                      # City normalization, matching, and display helpers
│  ├─ restaurant.ts                # Restaurant address, image source, and Dianping helpers
│  └─ themeChrome.ts               # Browser chrome theme color sync
├─ views/
│  ├─ CoverView.vue
│  ├─ HomeView.vue
│  ├─ DetailView.vue
│  ├─ StatsView.vue
│  ├─ CandidateView.vue
│  └─ CandidateDetailView.vue
└─ components/
   ├─ CoverPage.vue
   ├─ RatingBadge.vue
   ├─ RestaurantCard.vue
   ├─ RestaurantMap.vue
   ├─ TwikooComments.vue
   └─ home/
      ├─ HomeSearchBar.vue
      ├─ RestaurantFilterDropdown.vue
      ├─ RestaurantSortDropdown.vue
      └─ SelectedFilterChips.vue

server/
└─ candidates/
   ├─ app.py                       # Candidate API, Python stdlib only
   ├─ backup_cleanup.py            # SQLite backup and TTL cleanup
   ├─ README.md
   └─ deploy/                      # systemd, nginx, rate limit, cron examples
```

后端详细部署和维护说明见 [server/candidates/README.md](server/candidates/README.md)。
