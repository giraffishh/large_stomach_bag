# large_stomach_bag

我也想拥有大卫带。。

## Project Setup

```sh
npm install
```

### Environment Variables

Create a local `.env` file with these values:

```sh
VITE_AMAP_JS_KEY=your_amap_browser_js_key
VITE_AMAP_SECURITY_CODE=your_amap_security_code
AMAP_KEY=your_amap_web_service_key
NOTION_KEY=your_notion_integration_token
NOTION_DB_ID=your_notion_database_id
GITHUB_TOKEN=your_optional_image_hosting_token
```

`VITE_AMAP_JS_KEY` and `VITE_AMAP_SECURITY_CODE` are used by the browser map.
`AMAP_KEY` is used only by `scripts/sync.js` for AMap Web Service lookups.

Notion data source inspection helpers live in `scripts/debug/` and are intended for one-off troubleshooting.

## Source Structure

```text
src/
├─ main.ts                         # Vue app bootstrap: Pinia, router, motion plugin
├─ App.vue                         # Route outlet and page transition shell
├─ assets/
│  └─ main.css                     # Tailwind entry and global theme variants
├─ router/
│  └─ index.ts                     # Cover, home, and restaurant detail routes
├─ stores/
│  └─ restaurants.ts               # Restaurant data, filters, sorting, location, map state
├─ data/
│  └─ restaurants.json             # Generated restaurant dataset from Notion sync
├─ composables/
│  ├─ useAMap.ts                   # AMap loader, city lookup, and user geolocation
│  └─ useRestaurantFilters.ts      # Shared filter options and filter mutation helpers
├─ utils/
│  └─ restaurant.ts                # Restaurant address and Dianping URL parsing helpers
├─ views/
│  ├─ CoverView.vue                # Entry page interactions and cover navigation
│  ├─ HomeView.vue                 # Home page layout: search/filter toolbar plus list/map view
│  └─ DetailView.vue               # Restaurant detail page
└─ components/
   ├─ CoverPage.vue                # Animated cover page presentation
   ├─ RatingBadge.vue              # Rating label/icon display
   ├─ RestaurantCard.vue           # Reusable restaurant summary card
   ├─ RestaurantMap.vue            # AMap view, markers, clusters, and selected-card overlay
   └─ home/
      ├─ HomeSearchBar.vue         # Search input, dark mode, list/map toggle
      ├─ RestaurantFilterDropdown.vue
      ├─ SelectedFilterChips.vue
      └─ RestaurantSortDropdown.vue
```

The main runtime flow is `router/index.ts` -> `views/*` -> shared `components/*`.
`HomeView` is intentionally kept as a page-level coordinator, while filter behavior lives in `useRestaurantFilters` and restaurant list/map state lives in the Pinia store.

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
