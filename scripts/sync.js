import pkg from '@notionhq/client'
const { Client } = pkg
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Octokit } from '@octokit/rest'
import sharp from 'sharp'
import { setGlobalDispatcher, ProxyAgent } from 'undici'

// Load environment variables
dotenv.config()

// Proxy support
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy
if (proxyUrl) {
  console.log(`Using proxy: ${proxyUrl}`)
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}

const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_DB_ID

const octokit = process.env.GITHUB_TOKEN ? new Octokit({ auth: process.env.GITHUB_TOKEN }) : null
const GITHUB_OWNER = 'giraffishh'
const GITHUB_REPO = 'image-hosting'
const GITHUB_PATH_PREFIX = 'food'
// User explicitly requested 'giraffish' (one h) in the mirror URL
const CDN_PREFIX = `https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/${GITHUB_PATH_PREFIX}`;

// AMap Web Service Key
const AMAP_KEY = process.env.AMAP_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(__dirname, "../src/data/restaurants.json");

/**
 * Search for a place using AMap Web Service API
 */
async function searchAMapPlace(keyword, city) {
  if (!keyword || keyword === "Unknown") return null;
  if (!AMAP_KEY) {
      console.warn("Skipping AMap search: AMAP_KEY not found in env.");
      return null;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Using v3/place/text
      let url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}`;
      if (city) {
          url += `&city=${encodeURIComponent(city)}&city_limit=true`;
      } else {
          url += `&city_limit=false`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === '1' && data.pois && data.pois.length > 0) {
          return data.pois[0]; // Return the first/best match
        } else {
          console.log(`No AMap results found for: ${keyword} (City: ${city || 'Any'})`);
          return null; // Don't retry if we got a valid "empty" response
        }
      } catch (innerError) {
         clearTimeout(timeoutId);
         throw innerError;
      }

    } catch (error) {
      attempt++;
      console.error(`AMap search error for ${keyword} (Attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt >= maxRetries) return null;
      // Wait 1s before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
}

/**
 * In Notion API v2025-09-03, databases are containers and data is queried via 'data_source'.
 * This function finds the data_source_id associated with the given database_id.
 */
async function findDataSourceId(dbId) {
  // Normalize ID (remove hyphens for comparison if needed, but Notion usually returns hyphenated)
  const normalizedDbId = dbId.includes('-')
    ? dbId
    : dbId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')

  console.log(`Searching for data source associated with database: ${normalizedDbId}`)

  const response = await notion.search({
    filter: { property: 'object', value: 'data_source' },
  })

  const dataSource = response.results.find(
    (res) => res.parent?.type === 'database_id' && res.parent.database_id === normalizedDbId,
  )

  if (!dataSource) {
    throw new Error(
      `Could not find a data source for database ID ${normalizedDbId}. Make sure the database is shared with the integration.`,
    )
  }

  return dataSource.id
}

async function fetchAllPages() {
  const dataSourceId = await findDataSourceId(databaseId)
  console.log(`Using Data Source ID: ${dataSourceId}`)

  let allPages = []
  let hasMore = true
  let startCursor = undefined

  while (hasMore) {
    try {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: startCursor,
      })

      allPages.push(...response.results)
      hasMore = response.has_more
      startCursor = response.next_cursor
    } catch (error) {
      console.error('Error fetching pages from Notion:', error)
      process.exit(1)
    }
  }

  return allPages
}

function getPlainText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) return ''
  return richTextArray.map((t) => t.plain_text).join('')
}

async function processAndUploadImage(imageUrl) {
  if (!octokit) {
    console.warn('Skipping image upload: GITHUB_TOKEN not found.')
    return null
  }

  try {
    // Generate timestamp-based filename: YYYYMMDD_HHmmss_XXXX.webp
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14) // YYYYMMDDHHmmss
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    const filename = `${timestamp}_${randomSuffix}.webp`
    const filePath = `${GITHUB_PATH_PREFIX}/${filename}`

    console.log(`Downloading image...`)
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`Processing image (rotate & resize)...`)
    const processedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF data
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true }) // Max 1080p, preserve aspect ratio
      .webp({ quality: 80 })
      .toBuffer()

    const contentEncoded = processedBuffer.toString('base64')

    console.log(`Uploading ${filename} to GitHub...`)
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `Upload ${filename} via sync script`,
      content: contentEncoded,
      branch: 'main',
    })

    return `${CDN_PREFIX}/${filename}`
  } catch (error) {
    console.error(`Error processing image:`, error)
    return null
  }
}

async function simplifyPage(page) {
  const props = page.properties

  // Name (Title)
  const name = props.Name?.title ? getPlainText(props.Name.title) : 'Unknown'

  // Cover (Files & media)
  let cover = ''
  if (props.Cover?.files?.length > 0) {
    const fileObj = props.Cover.files[0]
    if (fileObj.type === 'file') {
      cover = fileObj.file.url
    } else if (fileObj.type === 'external') {
      cover = fileObj.external.url
    }
  }

  // CoverURL (Link)
  let coverUrl = props.CoverURL?.url || ''

  // Logic:
  // 1. Must have a Cover image source.
  // 2. CoverURL field must be EMPTY. If it has any content, we skip.
  if (cover && !coverUrl) {
    console.log(`Processing page ${page.id}: Found Cover but no CoverURL. Uploading...`)

    const newUrl = await processAndUploadImage(cover)

    if (newUrl) {
      coverUrl = newUrl

      // Write back to Notion
      try {
        console.log(`Updating Notion page ${page.id} with new CoverURL...`)
        await notion.pages.update({
          page_id: page.id,
          properties: {
            CoverURL: {
              url: newUrl,
            },
          },
        })
      } catch (err) {
        console.error(`Failed to update Notion page ${page.id}:`, err)
      }
    }
  }

  // Tags (Multi-select)
  const tags = props.Tags?.multi_select ? props.Tags.multi_select.map((t) => t.name) : []

  // Rating (Select)
  const rating = props.Rating?.select?.name || ''

  // ShareLink (Link)
  const shareLink = props.ShareLink?.url || ''

  // Review (Text)
  const review = props.Review?.rich_text ? getPlainText(props.Review.rich_text) : ''

  // Price (Num)
  const price = props.Price?.number || 0;

  // City (Select or Text)
  let city = "";
  if (props.City?.select) {
      city = props.City.select.name;
  } else if (props.City?.rich_text) {
      city = getPlainText(props.City.rich_text);
  }
  // No default fallback logic here anymore.

  // Location & Coordinates (Auto-fill via AMap)
  let longitude = props.Longitude?.number || null;
  let latitude = props.Latitude?.number || null;
  let location = props.Location?.rich_text ? getPlainText(props.Location.rich_text) : "";

  // Date (Date or Text)
  let date = props.Date?.date?.start || "";
  if (!date && props.Date?.rich_text) {
      date = getPlainText(props.Date.rich_text);
  }

  // If critical location info is missing, try to fetch from AMap and update Notion
  // If city is missing, we search globally and try to fill it.
  // If city is present, we use it to limit search.
  if ((!longitude || !latitude || !location) && name !== "Unknown") {
      const searchCity = city || ""; // Use empty string if city is missing to imply global search
      console.log(`Missing location info for "${name}" (City: ${searchCity || "Global"}). Searching AMap...`);

      const place = await searchAMapPlace(name, searchCity);

      if (place) {
          const [lngStr, latStr] = place.location.split(',');
          const lng = parseFloat(lngStr);
          const lat = parseFloat(latStr);
          // Combine adname (district) + address for better readability
          const fullAddress = (place.cityname || "") + (place.adname || "") + (place.address || "");
          const foundCity = place.cityname || ""; // Extract city from result

          const updates = {};
          let needsUpdate = false;

          // Backfill City if it was empty and we found one
          if (!city && foundCity) {
              city = foundCity;
              // Check property type to format update correctly
              if (props.City?.type === 'select') {
                  updates.City = { select: { name: foundCity } };
              } else {
                  // Default to rich_text
                  updates.City = { rich_text: [{ text: { content: foundCity } }] };
              }
              needsUpdate = true;
          }

          // Only update if the field was empty
          if (!longitude) {
              longitude = lng;
              updates.Longitude = { number: lng };
              needsUpdate = true;
          }
          if (!latitude) {
              latitude = lat;
              updates.Latitude = { number: lat };
              needsUpdate = true;
          }
          if (!location) {
              location = fullAddress;
              updates.Location = { rich_text: [{ text: { content: fullAddress } }] };
              needsUpdate = true;
          }

      if (needsUpdate) {
        try {
          console.log(`Updating Notion page ${page.id} with location data...`)
          await notion.pages.update({
            page_id: page.id,
            properties: updates,
          })
        } catch (err) {
          console.error(`Failed to update Notion page ${page.id} location:`, err)
        }
      }
    }
  }

  // Security & Cleanup:
  // If we have a permanent coverUrl, remove the temporary notion cover link
  // to avoid GitHub secret scanning warnings.
  const finalCover = coverUrl ? '' : cover

  return {
    id: page.id,
    name,
    cover: finalCover,
    coverUrl,
    tags,
    rating,
    shareLink,
    review,
    price,
    city,
    longitude,
    latitude,
    location,
    date,
    lastEdited: page.last_edited_time
  };
}

async function main() {
  if (!process.env.NOTION_KEY || !process.env.NOTION_DB_ID) {
    console.error('Missing NOTION_KEY or NOTION_DB_ID in .env file')
    process.exit(1)
  }

  console.log('Starting Notion sync...')
  const pages = await fetchAllPages()
  console.log(`Found ${pages.length} pages.`)

  // Process sequentially to avoid rate limits or overwhelming logs
  const simplifiedData = []
  for (const page of pages) {
    const simplified = await simplifyPage(page)
    simplifiedData.push(simplified)
  }

  const outputDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(simplifiedData, null, 2))
  console.log(`Data synced to ${OUTPUT_PATH}`)
}

main()
