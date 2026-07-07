WidgetMetadata = {
  id: "javmenu.full",
  title: "JAVMenu",
  description: "JAVMenu site browser and stream matcher",
  author: "Forward",
  site: "https://javmenu.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 300,
  globalParams: [
    {
      name: "baseUrl",
      title: "Base URL",
      type: "input",
      value: "https://javmenu.com",
      placeholders: [
        { title: "JAVMenu", value: "https://javmenu.com" }
      ]
    },
    {
      name: "cookie",
      title: "Cookie",
      type: "input",
      description: "After passing Cloudflare in your browser, paste the full Cookie header here."
    },
    {
      name: "userAgent",
      title: "User-Agent",
      type: "input",
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
    }
  ],
  modules: [
    {
      id: "loadList",
      title: "JAVMenu List",
      description: "Browse JAVMenu list/category pages",
      functionName: "loadList",
      cacheDuration: 600,
      params: [
        {
          name: "path",
          title: "Path",
          type: "input",
          value: "/zh",
          placeholders: [
            { title: "Chinese home", value: "/zh" },
            { title: "Latest", value: "/zh/latest" },
            { title: "Popular", value: "/zh/popular" }
          ]
        },
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "loadResource",
      title: "JAVMenu Streams",
      description: "Match the current title/code against JAVMenu and return directly exposed media URLs",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 120,
      params: []
    }
  ],
  search: {
    title: "Search",
    functionName: "search",
    params: [
      {
        name: "keyword",
        title: "Keyword",
        type: "input",
        placeholders: [
          { title: "Code", value: "ABP-123" }
        ]
      },
      { name: "page", title: "Page", type: "page" }
    ]
  }
};

const JAVMENU_DEFAULT_BASE = "https://javmenu.com";
const JAVMENU_DEFAULT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
const JAVMENU_TIMEOUT = 15000;
const JAVMENU_STORAGE_PARAMS = "javmenu.full.lastParams";

function getText(value) {
  return String(value || "").trim();
}

function normalizeSpace(value) {
  return getText(value).replace(/\s+/g, " ").trim();
}

function normalizeBaseUrl(baseUrl) {
  const value = getText(baseUrl) || JAVMENU_DEFAULT_BASE;
  return value.replace(/\/+$/, "");
}

function normalizeCookie(cookie) {
  return getText(cookie)
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("; ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, function (_, n) {
      return String.fromCharCode(Number(n));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, n) {
      return String.fromCharCode(parseInt(n, 16));
    });
}

function stripTags(value) {
  return decodeHtml(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "));
}

function toAbsoluteUrl(href, baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  let value = decodeHtml(getText(href));
  if (!value || value === "#" || /^javascript:/i.test(value) || /^mailto:/i.test(value)) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  if (value.charAt(0) === "/") return base + value;
  return base + "/" + value.replace(/^\/+/, "");
}

function urlPath(url) {
  const value = getText(url);
  const match = value.match(/^https?:\/\/[^/]+(\/[^?#]*)?/i);
  return match ? (match[1] || "/") : value.split("?")[0].split("#")[0];
}

function itemIdFromUrl(url, fallback) {
  const source = getText(urlPath(url)) || getText(fallback);
  return "javmenu:" + source
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function readStoredParams() {
  try {
    if (!Widget || !Widget.storage || !Widget.storage.get) return {};
    const value = Widget.storage.get(JAVMENU_STORAGE_PARAMS);
    if (!value) return {};
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
}

function rememberParams(params) {
  try {
    if (!Widget || !Widget.storage || !Widget.storage.set) return;
    const kept = {
      baseUrl: normalizeBaseUrl(params && params.baseUrl),
      cookie: getText(params && params.cookie),
      userAgent: getText(params && params.userAgent) || JAVMENU_DEFAULT_UA
    };
    Widget.storage.set(JAVMENU_STORAGE_PARAMS, JSON.stringify(kept));
  } catch (e) {
    console.warn("[javmenu] failed to persist params:", e.message || e);
  }
}

function mergeParams(params) {
  const stored = readStoredParams();
  const input = params || {};
  return {
    baseUrl: input.baseUrl || stored.baseUrl || JAVMENU_DEFAULT_BASE,
    cookie: input.cookie !== undefined ? input.cookie : stored.cookie,
    userAgent: input.userAgent || stored.userAgent || JAVMENU_DEFAULT_UA
  };
}

function buildHeaders(params, referer, extra) {
  const merged = mergeParams(params);
  const base = normalizeBaseUrl(merged.baseUrl);
  const headers = {
    "User-Agent": getText(merged.userAgent) || JAVMENU_DEFAULT_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": referer || base + "/"
  };
  const cookie = normalizeCookie(merged.cookie);
  if (cookie) headers["Cookie"] = cookie;
  return Object.assign(headers, extra || {});
}

function getHeader(headers, name) {
  if (!headers) return "";
  const target = String(name || "").toLowerCase();
  for (const key of Object.keys(headers)) {
    if (String(key).toLowerCase() === target) return String(headers[key] || "");
  }
  return "";
}

function isChallengeResponse(status, headers, html) {
  const body = String(html || "");
  return Number(status) === 403 ||
    /challenge/i.test(getHeader(headers, "cf-mitigated")) ||
    /Just a moment|cf-browser-verification|challenges\.cloudflare\.com|cf-chl|cf-mitigated/i.test(body);
}

async function requestPage(url, params, referer, queryParams) {
  const merged = mergeParams(params);
  const absoluteUrl = toAbsoluteUrl(url, merged.baseUrl);
  const options = {
    headers: buildHeaders(merged, referer),
    timeout: JAVMENU_TIMEOUT
  };
  if (queryParams && Object.keys(queryParams).length) {
    options.params = queryParams;
  }

  try {
    const resp = await Widget.http.get(absoluteUrl, options);
    if (!resp) {
      console.warn("[javmenu] empty response:", absoluteUrl);
      return "";
    }

    const status = resp.statusCode || resp.status || 200;
    const html = String(resp.data || "");
    if (isChallengeResponse(status, resp.headers, html)) {
      console.warn("[javmenu] Cloudflare challenge or HTTP 403:", absoluteUrl);
      return "";
    }
    if (Number(status) >= 400) {
      console.warn("[javmenu] HTTP " + status + ":", absoluteUrl);
      return "";
    }
    return html;
  } catch (error) {
    console.warn("[javmenu] request failed:", absoluteUrl, error.message || error);
    return "";
  }
}

function extractAttr(fragment, name) {
  const pattern = new RegExp("\\s" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = String(fragment || "").match(pattern);
  return match ? decodeHtml(match[2]) : "";
}

function firstAttr(fragment, names) {
  for (const name of names) {
    const value = extractAttr(fragment, name);
    if (value) return value;
  }
  return "";
}

function extractMeta(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp("<meta\\b(?=[^>]*(?:property|name)=[\"']" + escaped + "[\"'])[^>]*>", "i"),
    new RegExp("<meta\\b(?=[^>]*(?:property|name)=[^\"'\\s>]*" + escaped + "[^\"'\\s>]*)[^>]*>", "i")
  ];

  for (const pattern of patterns) {
    const tag = String(html || "").match(pattern);
    if (tag && tag[0]) {
      const content = extractAttr(tag[0], "content");
      if (content) return normalizeSpace(content);
    }
  }
  return "";
}

function extractTitleTag(html) {
  const h1 = String(html || "").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1 && h1[1]) return normalizeSpace(stripTags(h1[1]));

  const title = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (title && title[1]) {
    return normalizeSpace(stripTags(title[1]).replace(/\s*[-|]\s*JAVMenu\s*$/i, ""));
  }

  return "";
}

function isMediaUrl(url) {
  return /\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(getText(url));
}

function isImageUrl(url) {
  return /\.(?:jpg|jpeg|png|webp|gif|avif)(?:[?#].*)?$/i.test(getText(url));
}

function isLikelyPageHref(href) {
  const value = getText(href);
  if (!value) return false;
  if (/^(?:#|javascript:|mailto:)/i.test(value)) return false;
  if (isMediaUrl(value) || isImageUrl(value) || /\.(?:css|js|json|xml)(?:[?#].*)?$/i.test(value)) return false;
  return true;
}

function readFirstString(object, keys) {
  if (!object || typeof object !== "object") return "";
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" || typeof value === "number") return getText(value);
    if (value && typeof value === "object" && typeof value.url === "string") return getText(value.url);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" || typeof item === "number") return getText(item);
        if (item && typeof item === "object" && typeof item.url === "string") return getText(item.url);
      }
    }
  }
  return "";
}

function readAllStrings(value, out) {
  const results = out || [];
  if (value === null || value === undefined) return results;
  if (typeof value === "string" || typeof value === "number") {
    const text = getText(value);
    if (text) results.push(text);
    return results;
  }
  if (Array.isArray(value)) {
    for (const item of value) readAllStrings(item, results);
    return results;
  }
  if (typeof value === "object") {
    if (typeof value.url === "string") results.push(getText(value.url));
    if (typeof value.src === "string") results.push(getText(value.src));
  }
  return results;
}

function readImage(object) {
  if (!object || typeof object !== "object") return "";
  const keys = ["thumbnailUrl", "thumbnail", "poster", "posterUrl", "poster_path", "cover", "coverUrl", "image", "img", "src"];
  for (const key of keys) {
    const values = readAllStrings(object[key], []);
    for (const value of values) {
      if (value) return value;
    }
  }
  return "";
}

function readImages(object) {
  if (!object || typeof object !== "object") return [];
  const keys = ["thumbnailUrl", "thumbnail", "poster", "posterUrl", "poster_path", "cover", "coverUrl", "image", "images", "img", "src"];
  const out = [];
  for (const key of keys) {
    readAllStrings(object[key], out);
  }
  return unique(out);
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = getText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function sliceBalancedJson(text, start) {
  const source = String(text || "");
  const open = source.charAt(start);
  const close = open === "{" ? "}" : open === "[" ? "]" : "";
  if (!close) return "";

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source.charAt(i);
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === "\"" || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) return source.slice(start, i + 1);
  }
  return "";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(decodeHtml(text));
  } catch (e) {
    return null;
  }
}

function extractJsonPayloads(html) {
  const payloads = [];
  const source = String(html || "");
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRe.exec(source)) !== null) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const type = extractAttr(" " + attrs, "type").toLowerCase();
    const id = extractAttr(" " + attrs, "id").toLowerCase();

    if (type.indexOf("ld+json") >= 0 || id === "__next_data__") {
      const parsed = safeJsonParse(body);
      if (parsed) payloads.push(parsed);
      continue;
    }

    if (!/"(?:url|href|thumbnail|poster|cover|videos|items?)"/i.test(body)) continue;
    const firstObject = body.indexOf("{");
    const firstArray = body.indexOf("[");
    let start = -1;
    if (firstObject >= 0 && firstArray >= 0) start = Math.min(firstObject, firstArray);
    else start = Math.max(firstObject, firstArray);
    if (start < 0) continue;

    const jsonText = sliceBalancedJson(body, start);
    const parsed = jsonText ? safeJsonParse(jsonText) : null;
    if (parsed) payloads.push(parsed);
  }

  return payloads;
}

function mapJsonObjectToRawItem(object, baseUrl) {
  if (!object || typeof object !== "object") return null;

  const title = normalizeSpace(readFirstString(object, [
    "title", "name", "headline", "videoTitle", "displayTitle", "code", "number"
  ]));
  const href = readFirstString(object, [
    "url", "href", "link", "permalink", "detailUrl", "watchUrl", "path", "slug"
  ]);
  if (!title || !href || !isLikelyPageHref(href)) return null;

  const url = toAbsoluteUrl(href, baseUrl);
  if (!url || isMediaUrl(url) || isImageUrl(url)) return null;

  const image = readImage(object);
  return {
    title,
    url,
    posterPath: image ? toAbsoluteUrl(image, baseUrl) : "",
    backdropPath: image ? toAbsoluteUrl(image, baseUrl) : "",
    description: normalizeSpace(readFirstString(object, ["description", "summary", "overview"])),
    releaseDate: normalizeSpace(readFirstString(object, ["datePublished", "uploadDate", "releaseDate", "createdAt"])),
    durationText: normalizeDuration(readFirstString(object, ["duration", "durationText", "length"]))
  };
}

function collectJsonItems(value, baseUrl, out, depth) {
  if (depth > 9 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonItems(item, baseUrl, out, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;

  const direct = mapJsonObjectToRawItem(value, baseUrl);
  if (direct) out.push(direct);

  for (const key of Object.keys(value)) {
    collectJsonItems(value[key], baseUrl, out, depth + 1);
  }
  return out;
}

function extractJsonItems(html, baseUrl) {
  const items = [];
  const payloads = extractJsonPayloads(html);
  for (const payload of payloads) {
    collectJsonItems(payload, baseUrl, items, 0);
  }
  return items;
}

function extractImageFromFragment(fragment, baseUrl) {
  const img = String(fragment || "").match(/<img\b([^>]*)>/i);
  if (img && img[1]) {
    const src = firstAttr(" " + img[1], ["data-src", "data-original", "data-lazy-src", "src", "poster"]);
    if (src) return toAbsoluteUrl(src, baseUrl);
  }
  const source = String(fragment || "").match(/<source\b([^>]*)>/i);
  if (source && source[1]) {
    const src = firstAttr(" " + source[1], ["src", "data-src"]);
    if (src && isImageUrl(src)) return toAbsoluteUrl(src, baseUrl);
  }
  return "";
}

function extractTitleFromAnchor(attrs, inner) {
  const title = firstAttr(" " + attrs, ["title", "aria-label"]);
  if (title) return normalizeSpace(title);
  const img = String(inner || "").match(/<img\b([^>]*)>/i);
  if (img && img[1]) {
    const imgTitle = firstAttr(" " + img[1], ["alt", "title"]);
    if (imgTitle) return normalizeSpace(imgTitle);
  }
  return normalizeSpace(stripTags(inner));
}

function extractAnchorItems(html, baseUrl) {
  const items = [];
  const seen = new Set();
  const anchorRe = /<a\b([^>]*\shref\s*=\s*["'][^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRe.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const href = extractAttr(" " + attrs, "href");
    if (!isLikelyPageHref(href)) continue;

    const url = toAbsoluteUrl(href, baseUrl);
    if (!url || seen.has(url)) continue;

    const posterPath = extractImageFromFragment(inner, baseUrl);
    const title = extractTitleFromAnchor(attrs, inner);
    if (!title || (!posterPath && !extractSearchCode(title))) continue;

    seen.add(url);
    items.push({
      title,
      url,
      posterPath,
      backdropPath: posterPath,
      previewUrl: toAbsoluteUrl(firstAttr(" " + attrs + " " + inner, ["data-preview", "data-video", "data-src"]), baseUrl)
    });
  }

  return items;
}

function buildVideoItem(raw, baseUrl) {
  const url = toAbsoluteUrl(raw && raw.url, baseUrl);
  const title = normalizeSpace(raw && raw.title);
  if (!url || !title) return null;

  const item = {
    id: itemIdFromUrl(url, title),
    type: "url",
    title,
    link: "detail:" + encodeURIComponent(url)
  };

  if (raw.posterPath) item.posterPath = toAbsoluteUrl(raw.posterPath, baseUrl);
  if (raw.backdropPath) item.backdropPath = toAbsoluteUrl(raw.backdropPath, baseUrl);
  if (raw.previewUrl) item.previewUrl = toAbsoluteUrl(raw.previewUrl, baseUrl);
  if (raw.description) item.description = normalizeSpace(raw.description);
  if (raw.releaseDate) item.releaseDate = normalizeSpace(raw.releaseDate);
  if (raw.durationText) item.durationText = normalizeDuration(raw.durationText);
  return item;
}

function dedupeVideoItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item || !item.title) continue;
    const key = getText(item.link || item.id || item.title).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function parseListItems(html, baseUrl) {
  const rawItems = []
    .concat(extractJsonItems(html, baseUrl))
    .concat(extractAnchorItems(html, baseUrl));

  const items = rawItems
    .map((item) => buildVideoItem(item, baseUrl))
    .filter(Boolean);

  return dedupeVideoItems(items).slice(0, 60);
}

function findJsonDetailObject(value, depth) {
  if (depth > 8 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJsonDetailObject(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  const type = readFirstString(value, ["@type", "type"]);
  const hasTitle = !!readFirstString(value, ["name", "title", "headline"]);
  const hasDetail = !!readFirstString(value, ["description", "duration", "thumbnailUrl", "image", "contentUrl", "embedUrl"]);
  if (hasTitle && (hasDetail || /video|movie/i.test(type))) return value;

  for (const key of Object.keys(value)) {
    const found = findJsonDetailObject(value[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function getJsonDetail(html) {
  const payloads = extractJsonPayloads(html);
  for (const payload of payloads) {
    const found = findJsonDetailObject(payload, 0);
    if (found) return found;
  }
  return null;
}

function normalizeDuration(value) {
  const text = getText(value);
  if (!text) return "";

  const iso = text.match(/^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) {
    const h = Number(iso[1] || 0);
    const m = Number(iso[2] || 0);
    const s = Number(iso[3] || 0);
    if (h || m || s) {
      const parts = h ? [h, m, s] : [m, s];
      return parts.map((n, i) => i === 0 ? String(n) : String(n).padStart(2, "0")).join(":");
    }
  }

  const readable = text.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i);
  if (readable && (readable[1] || readable[2] || readable[3])) {
    const h = Number(readable[1] || 0);
    const m = Number(readable[2] || 0);
    const s = Number(readable[3] || 0);
    const parts = h ? [h, m, s] : [m, s];
    return parts.map((n, i) => i === 0 ? String(n) : String(n).padStart(2, "0")).join(":");
  }

  return text;
}

function extractAllImages(html, baseUrl) {
  const out = [];
  const imgRe = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imgRe.exec(String(html || ""))) !== null) {
    const src = firstAttr(" " + match[1], ["data-src", "data-original", "data-lazy-src", "src", "poster"]);
    if (src) out.push(toAbsoluteUrl(src, baseUrl));
  }

  const urlRe = /https?:\\?\/\\?\/[^"'\\\s<>]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'\\\s<>]*)?/gi;
  const normalized = String(html || "").replace(/\\\//g, "/");
  while ((match = urlRe.exec(normalized)) !== null) {
    out.push(toAbsoluteUrl(match[0], baseUrl));
  }
  return unique(out);
}

function idFromHref(href, baseUrl) {
  const url = toAbsoluteUrl(href, baseUrl);
  const path = urlPath(url);
  return path || url;
}

function extractLinksByPath(html, baseUrl, fragments) {
  const out = [];
  const seen = new Set();
  const anchorRe = /<a\b([^>]*\shref\s*=\s*["'][^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const href = extractAttr(" " + attrs, "href");
    const path = urlPath(toAbsoluteUrl(href, baseUrl)).toLowerCase();
    if (!fragments.some((fragment) => path.indexOf(fragment) >= 0)) continue;

    const title = extractTitleFromAnchor(attrs, inner);
    if (!title) continue;
    const id = idFromHref(href, baseUrl);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title });
  }
  return out;
}

function jsonGenres(detail) {
  const out = [];
  const values = detail && detail.genre;
  readAllStrings(values, out);
  return unique(out).map((title) => ({ id: "/zh/search", title }));
}

function jsonPeople(detail) {
  const keys = ["actor", "actors", "director", "creator", "performer"];
  const out = [];
  for (const key of keys) {
    const value = detail && detail[key];
    const list = Array.isArray(value) ? value : value ? [value] : [];
    for (const item of list) {
      if (typeof item === "string") {
        out.push({ id: item, title: item, role: key });
      } else if (item && typeof item === "object") {
        const title = readFirstString(item, ["name", "title"]);
        if (!title) continue;
        out.push({
          id: readFirstString(item, ["url", "href", "sameAs"]) || title,
          title,
          avatar: readImage(item),
          role: key
        });
      }
    }
  }
  return out;
}

function extractMediaUrls(html, baseUrl) {
  const source = String(html || "").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const out = [];
  const tagRe = /<(?:source|video)\b([^>]*)>/gi;
  let match;

  while ((match = tagRe.exec(source)) !== null) {
    const src = firstAttr(" " + match[1], ["src", "data-src"]);
    if (src && isMediaUrl(src)) out.push(toAbsoluteUrl(src, baseUrl));
  }

  const urlRe = /https?:\/\/[^"'\\\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\\\s<>]*)?/gi;
  while ((match = urlRe.exec(source)) !== null) {
    out.push(toAbsoluteUrl(match[0], baseUrl));
  }

  const kvRe = /(?:file|source|src|url|videoUrl|contentUrl)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)(?:\?[^"']*)?)["']/gi;
  while ((match = kvRe.exec(source)) !== null) {
    out.push(toAbsoluteUrl(match[1], baseUrl));
  }

  return unique(out);
}

function parseDetailItem(html, detailUrl, baseUrl) {
  const jsonDetail = getJsonDetail(html) || {};
  const jsonRaw = mapJsonObjectToRawItem(jsonDetail, baseUrl) || {};
  const metaImage = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
  const images = unique(readImages(jsonDetail).concat([metaImage]).concat(extractAllImages(html, baseUrl)))
    .filter(Boolean)
    .map((url) => toAbsoluteUrl(url, baseUrl));
  const mediaUrls = extractMediaUrls(html, baseUrl);
  const title = normalizeSpace(
    readFirstString(jsonDetail, ["name", "title", "headline"]) ||
    extractMeta(html, "og:title") ||
    extractTitleTag(html) ||
    jsonRaw.title
  );

  if (!title) return null;

  const posterPath = images[0] || "";
  const genres = dedupeById(
    jsonGenres(jsonDetail).concat(extractLinksByPath(html, baseUrl, ["/genre", "/genres", "/tag", "/tags", "/category"]))
  );
  const peoples = dedupeById(
    jsonPeople(jsonDetail)
      .map((person) => ({
        id: person.id && /^https?:\/\//i.test(person.id) ? urlPath(person.id) : String(person.id || person.title),
        title: person.title,
        avatar: person.avatar ? toAbsoluteUrl(person.avatar, baseUrl) : "",
        role: person.role || "actor"
      }))
      .concat(extractLinksByPath(html, baseUrl, ["/actor", "/actors", "/actress", "/actresses", "/star", "/stars"]).map((person) => ({
        id: person.id,
        title: person.title,
        role: "actor"
      })))
  );

  const relatedItems = parseListItems(html, baseUrl)
    .filter((item) => decodeURIComponent(String(item.link || "")).indexOf(detailUrl) < 0)
    .filter(isRelatedVideoItem)
    .slice(0, 18);

  const item = {
    id: itemIdFromUrl(detailUrl, title),
    type: "url",
    title,
    link: "detail:" + encodeURIComponent(detailUrl),
    backdropPaths: images.slice(0, 12),
    relatedItems
  };

  if (posterPath) {
    item.posterPath = posterPath;
    item.backdropPath = posterPath;
  }
  const description = normalizeSpace(
    readFirstString(jsonDetail, ["description", "summary", "overview"]) ||
    extractMeta(html, "description") ||
    extractMeta(html, "og:description")
  );
  if (description) item.description = description;

  const releaseDate = normalizeSpace(readFirstString(jsonDetail, ["datePublished", "uploadDate", "releaseDate", "createdAt"]));
  if (releaseDate) item.releaseDate = releaseDate;

  const durationText = normalizeDuration(readFirstString(jsonDetail, ["duration", "durationText", "length"]));
  if (durationText) item.durationText = durationText;

  if (genres.length) item.genreItems = genres;
  if (peoples.length) item.peoples = peoples;
  if (mediaUrls.length) {
    item.videoUrl = mediaUrls[0];
    item.playerType = "system";
    item.trailers = [{ coverUrl: posterPath, url: mediaUrls[0] }];
  }

  return item;
}

function isRelatedVideoItem(item) {
  const detailUrl = decodeDetailLink(item && item.link);
  const path = urlPath(detailUrl).toLowerCase();
  if (/\/(?:actor|actors|actress|actresses|star|stars|genre|genres|tag|tags|category|categories|search)(?:\/|$)/i.test(path)) {
    return false;
  }
  return path.indexOf("/video") >= 0 || !!extractSearchCode(item && item.title, { allowPureNumeric: false });
}

function dedupeById(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item || !item.id || !item.title) continue;
    const id = String(item.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function parseSearchForm(html, baseUrl) {
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let fallback = null;
  let match;

  while ((match = formRe.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const formText = (attrs + " " + inner).toLowerCase();
    if (formText.indexOf("search") < 0 && formText.indexOf("keyword") < 0 && formText.indexOf("query") < 0) continue;

    const action = extractAttr(" " + attrs, "action") || "/zh/search";
    const inputRe = /<input\b([^>]*)>/gi;
    let input;
    let queryName = "";
    while ((input = inputRe.exec(inner)) !== null) {
      const inputAttrs = input[1] || "";
      const type = (extractAttr(" " + inputAttrs, "type") || "text").toLowerCase();
      const name = extractAttr(" " + inputAttrs, "name");
      if (!name) continue;
      if (type === "search" || /(?:q|s|keyword|query|search)/i.test(name)) {
        queryName = name;
        break;
      }
      if (!fallback) fallback = { url: toAbsoluteUrl(action, baseUrl), queryName: name };
    }

    if (queryName) return { url: toAbsoluteUrl(action, baseUrl), queryName };
  }

  return fallback;
}

function searchCandidates(baseUrl, form, keyword, page) {
  const enc = encodeURIComponent(keyword);
  const pageParam = Number(page || 1);
  const candidates = [];
  if (form && form.url && form.queryName) {
    const query = {};
    query[form.queryName] = keyword;
    if (pageParam > 1) query.page = pageParam;
    candidates.push({ url: form.url, query });
  }

  candidates.push(
    { url: toAbsoluteUrl("/zh/search/" + enc, baseUrl), query: pageParam > 1 ? { page: pageParam } : {} },
    { url: toAbsoluteUrl("/zh/search", baseUrl), query: { q: keyword, page: pageParam } },
    { url: toAbsoluteUrl("/zh/search", baseUrl), query: { keyword: keyword, page: pageParam } },
    { url: toAbsoluteUrl("/search/" + enc, baseUrl), query: pageParam > 1 ? { page: pageParam } : {} },
    { url: toAbsoluteUrl("/search", baseUrl), query: { q: keyword, page: pageParam } },
    { url: toAbsoluteUrl("/zh", baseUrl), query: { s: keyword, page: pageParam } },
    { url: toAbsoluteUrl("/", baseUrl), query: { s: keyword, page: pageParam } }
  );

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.url + JSON.stringify(candidate.query || {});
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadList(params = {}) {
  rememberParams(params);
  const merged = mergeParams(params);
  const base = normalizeBaseUrl(merged.baseUrl);
  const page = Number(params.page || 1);
  const path = getText(params.genreId || params.peopleId || params.path || "/zh");
  const query = page > 1 ? { page } : {};
  const url = toAbsoluteUrl(path, base);

  const html = await requestPage(url, merged, base + "/", query);
  if (!html) return [];

  return parseListItems(html, base);
}

async function loadDetail(link) {
  const raw = getText(link);
  if (raw.indexOf("detail:") !== 0) return null;

  const detailUrl = decodeURIComponent(raw.slice("detail:".length));
  const params = mergeParams({});
  const base = normalizeBaseUrl(params.baseUrl);
  const html = await requestPage(detailUrl, params, base + "/");
  if (!html) return null;

  return parseDetailItem(html, detailUrl, base);
}

async function search(params = {}) {
  rememberParams(params);
  const keyword = getText(params.keyword);
  if (!keyword) return [];

  const merged = mergeParams(params);
  const base = normalizeBaseUrl(merged.baseUrl);
  const homeUrl = toAbsoluteUrl("/zh", base);
  const homeHtml = await requestPage(homeUrl, merged, base + "/");
  const form = homeHtml ? parseSearchForm(homeHtml, base) : null;
  const candidates = searchCandidates(base, form, keyword, params.page || 1);

  for (const candidate of candidates) {
    const html = await requestPage(candidate.url, merged, homeUrl, candidate.query);
    if (!html) continue;
    const items = parseListItems(html, base);
    if (items.length) return items;
  }

  return [];
}

function normalizeCode(value) {
  return getText(value)
    .toUpperCase()
    .replace(/[\s_\-]+/g, "");
}

function extractSearchCode(text, options = {}) {
  const allowPureNumeric = options.allowPureNumeric !== false;
  let source = getText(text).toUpperCase();
  if (!source) return "";

  source = source.replace(/^[A-Z0-9]+(?:\.[A-Z0-9]+)+@/, "");
  const normalized = source
    .replace(/\./g, " ")
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const specialPatterns = [
    /\bFC2(?:[- ]?PPV)?[- ]?(\d{5,8})\b/i,
    /\bCARIB[- ]?(\d{6,8})\b/i,
    /\b1PONDO[- ]?(\d{6,8})\b/i,
    /\bHEYZO[- ]?(\d{3,6})\b/i,
    /\bT28[- ]?(\d{6,8})\b/i
  ];
  const prefixes = ["FC2", "CARIB", "1PONDO", "HEYZO", "T28"];

  for (let i = 0; i < specialPatterns.length; i++) {
    const match = normalized.match(specialPatterns[i]);
    if (match) return prefixes[i] + "-" + match[1];
  }

  const makerMatch = normalized.match(/\b(?:SONE|S2M|MIAA|SSNI|SNIS|IPX|IPZZ|SSIS|JUQ|MIDE|MIDV|STARS|ABW|RKI|DVAJ|WANZ|LULU|DLDSS|VRTM|SDMU|SDDE|MKMP|HMN|MUDR|ADN|CAWD|PPPE|PRED|MGR|SHKD|MXGS|FSDSS|JUL|KTB|MIAB|GVH|MIMK|JUY|JUTA|IDBD|HND|DASD|CLO|BF|HONB|ROE|CEMD|MIUM|NITR|RCTD|RCT|IPVR|MIBD|JUR|JURD|SOE|ORE|PYO|START|NSFS|ESD|GVG|REAL|LAF|SMD|MD|BAD|MOND|ARSO|MOCKY|FONE|GANA|MUKO|PAPA|RASH|TAMA|ZUKO|HEY|PACO|ABP|IPZ|SDAB|FSET|MOMJ)\s*[-_ ]?\d{2,6}[A-Z]?(?:[-_ ]?[A-Z]{0,4})?\b/i);
  if (makerMatch && makerMatch[0]) {
    return makerMatch[0].replace(/\s+/g, "").replace(/_/g, "-").replace(/-+/g, "-").toUpperCase();
  }

  const genericMatch = normalized.match(/\b([A-Z]{2,15})\s*[-_ ]?\s*(\d{2,10})[A-Z]?\b/);
  if (genericMatch) return genericMatch[1] + "-" + genericMatch[2];

  if (allowPureNumeric) {
    const numMatch = normalized.match(/\b(\d{4,8})\b/);
    if (numMatch) return numMatch[1];
  }

  return "";
}

function collectStringValues(value, depth, out, visited) {
  const results = out || [];
  const seen = visited || new Set();
  if (value === null || value === undefined || depth > 5) return results;

  if (typeof value === "string" || typeof value === "number") {
    const text = getText(value);
    if (text) results.push(text);
    return results;
  }
  if (typeof value !== "object") return results;
  if (seen.has(value)) return results;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, depth + 1, results, seen);
    return results;
  }

  for (const key of Object.keys(value)) {
    collectStringValues(value[key], depth + 1, results, seen);
  }
  return results;
}

function extractCodeFromParams(params = {}) {
  const candidates = [
    params.code,
    params.videoId,
    params.number,
    params.id,
    params.title,
    params.name,
    params.fileName,
    params.filename,
    params.file_name,
    params.path,
    params.filePath,
    params.file_path,
    params.mediaPath,
    params.media_path,
    params.itemPath,
    params.item_path,
    params.localPath,
    params.local_path,
    params.originalFilename,
    params.originalFileName,
    params.originalTitle,
    params.originalName,
    params.episodeName,
    params.description,
    params.genreTitle,
    params.overview,
    params.seriesName,
    params.link,
    params.url,
    params.videoUrl,
    params.playUrl,
    params.streamUrl
  ];

  for (const container of [params.tmdbInfo, params.info, params.mediaSource]) {
    if (!container) continue;
    candidates.push(
      container.title,
      container.name,
      container.originalTitle,
      container.originalName,
      container.overview,
      container.fileName,
      container.filename,
      container.path,
      container.url,
      container.streamUrl
    );
  }

  if (Array.isArray(params.mediaSources)) {
    for (const source of params.mediaSources) {
      if (!source) continue;
      candidates.push(source.name, source.fileName, source.filename, source.path, source.url, source.streamUrl);
    }
  }

  for (const value of candidates) {
    const code = extractSearchCode(value, { allowPureNumeric: true });
    if (code) return code;
  }

  const allStrings = collectStringValues(params, 0, [], new Set());
  for (const value of allStrings) {
    const code = extractSearchCode(value, { allowPureNumeric: false });
    if (code) return code;
  }

  return "";
}

function decodeDetailLink(link) {
  const value = getText(link);
  if (value.indexOf("detail:") !== 0) return "";
  return decodeURIComponent(value.slice("detail:".length));
}

function streamHeaders(mediaUrl, detailUrl, params) {
  return {
    "Referer": detailUrl || normalizeBaseUrl(params && params.baseUrl) + "/",
    "User-Agent": getText(params && params.userAgent) || JAVMENU_DEFAULT_UA,
    "Accept": "*/*"
  };
}

function buildStreamItem(mediaUrl, detailUrl, code, params) {
  const isHls = /\.m3u8(?:[?#].*)?$/i.test(mediaUrl);
  return {
    name: "JAVMenu " + (isHls ? "HLS" : "MP4"),
    description: "Code: " + (code || "unknown") + "\nSource: JAVMenu\nDetail: " + detailUrl,
    url: mediaUrl,
    customHeaders: streamHeaders(mediaUrl, detailUrl, params)
  };
}

async function findDetailForCode(code, params) {
  const results = await search(Object.assign({}, params, { keyword: code, page: 1 }));
  if (!results.length) return "";

  const normalized = normalizeCode(code);
  const exact = results.find((item) => normalizeCode(item.title).indexOf(normalized) >= 0) || results[0];
  return decodeDetailLink(exact.link);
}

async function loadResource(params = {}) {
  rememberParams(params);
  const code = extractCodeFromParams(params);
  if (!code) {
    console.log("[javmenu] no code found in params");
    return [];
  }

  const merged = mergeParams(params);
  const base = normalizeBaseUrl(merged.baseUrl);
  const detailUrl = await findDetailForCode(code, merged);
  if (!detailUrl) {
    console.log("[javmenu] no matching detail page:", code);
    return [];
  }

  const html = await requestPage(detailUrl, merged, base + "/");
  if (!html) return [];

  const urls = extractMediaUrls(html, base);
  if (!urls.length) {
    console.log("[javmenu] no directly exposed media URLs:", detailUrl);
    return [];
  }

  return urls.map((url) => buildStreamItem(url, detailUrl, code, merged));
}
