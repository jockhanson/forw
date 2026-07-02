WidgetMetadata = {
  id: "forward.javdb",
  title: "JavDB",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "JavDB 列表、搜索与详情元数据模块",
  author: "Forward",
  site: "https://javdb.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://javdb.com",
      placeholders: [
        { title: "JavDB", value: "https://javdb.com" },
      ],
    },
    {
      name: "cfCookie",
      title: "Cloudflare Cookie",
      type: "input",
      value: "",
      placeholders: [
        { title: "浏览器通过验证后的 Cookie", value: "cf_clearance=..." },
      ],
    },
    {
      name: "userAgent",
      title: "User-Agent",
      type: "input",
      value: "",
      placeholders: [
        { title: "留空使用默认；如 Cookie 无效请填获取 Cookie 时浏览器的 UA", value: "" },
      ],
    },
  ],
  modules: [
    {
      id: "loadList",
      title: "影片列表",
      functionName: "loadList",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        {
          name: "category",
          title: "分类",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "最新", value: "" },
            { title: "有码", value: "censored" },
            { title: "无码", value: "uncensored" },
            { title: "FC2", value: "fc2" },
            { title: "欧美", value: "western" },
            { title: "热门", value: "rankings/movies" },
            { title: "本周热门", value: "rankings/movies?period=weekly" },
            { title: "本月热门", value: "rankings/movies?period=monthly" },
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
  ],
  search: {
    title: "搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      {
        name: "searchType",
        title: "搜索范围",
        type: "enumeration",
        value: "all",
        enumOptions: [
          { title: "全部", value: "all" },
          { title: "演员", value: "actor" },
        ],
      },
      { name: "page", title: "页码", type: "page" },
    ],
  },
};

const DEFAULT_BASE_URL = "https://javdb.com";
const RUNTIME_KEY = "javdb.runtimeParams";

async function loadList(params = {}) {
  try {
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const route = params.peopleId || params.genreId || params.category || "";
    const html = await fetchPage(pageUrl(runtimeParams.baseUrl, route, page), runtimeParams);
    return parseVideoList(html, runtimeParams.baseUrl);
  } catch (error) {
    console.error("[javdb][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const runtimeParams = rememberRuntimeParams(params);
    const url = appendQuery(normalizeBaseUrl(runtimeParams.baseUrl) + "/search", {
      q: keyword,
      f: params.searchType || "all",
      page: safePage(params.page),
    });
    const html = await fetchPage(url, runtimeParams);
    return parseVideoList(html, runtimeParams.baseUrl);
  } catch (error) {
    console.error("[javdb][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const params = getRuntimeParams();
    const href = normalizeJavDbUrl(decodeDetailLink(link), params.baseUrl);
    if (!href || !isJavDbDetailUrl(href)) return null;
    const baseUrl = getOrigin(href) || params.baseUrl;
    const html = await fetchPage(href, params);
    return parseVideoDetail(html, href, baseUrl);
  } catch (error) {
    console.error("[javdb][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function fetchPage(url, params = {}, referer) {
  let res;
  try {
    res = await Widget.http.get(url, {
      headers: buildHeaders(params, referer),
    });
  } catch (error) {
    const message = String((error && error.message) || error || "");
    if (message.includes("403")) {
      throw new Error("目标站点返回 403/Cloudflare 验证。请先在浏览器打开站点并通过验证，然后把 Cookie 填入模块参数 Cloudflare Cookie（至少包含 cf_clearance）");
    }
    if (message.includes("404")) throw new Error("HTTP_404:" + url);
    throw error;
  }
  const html = String((res && res.data) || "");
  if (!html) throw new Error("空响应: " + url);
  if (isCloudflareChallenge(html)) {
    throw new Error("目标站点返回 Cloudflare 验证页。请把浏览器通过验证后的 Cookie 填入模块参数 Cloudflare Cookie（至少包含 cf_clearance）");
  }
  return html;
}

function parseVideoList(html, baseUrl) {
  const items = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']*\/v\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) {
    const href = normalizeJavDbUrl(match[2], baseUrl);
    if (!href || seen[href]) continue;
    seen[href] = true;

    const anchorHtml = match[0];
    const around = rowAround(html, match.index, anchorRe.lastIndex);
    const title = listTitle(anchorHtml, around);
    if (!title || isNoiseTitle(title)) continue;

    const poster = absolutize(firstImage(anchorHtml) || firstImage(around), baseUrl);
    const metas = unique(extractClassTexts(around, "meta").concat(extractClassTexts(anchorHtml, "meta")));
    const releaseDate = dateOnly(firstMeta(metas, /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/));
    const code = firstMeta(metas, /[A-Z]{2,10}[-_ ]?\d{2,}/i);
    const rating = firstRating(around) || firstRating(anchorHtml);
    const description = listDescription(code, metas);

    items.push({
      id: detailIdFromUrl(href) || stableId(href),
      type: "url",
      mediaType: "movie",
      title,
      posterPath: poster,
      backdropPath: poster,
      releaseDate,
      rating,
      description,
      link: encodeDetailLink(href),
      playerType: "system",
    });
  }
  return items;
}

function parseVideoDetail(html, href, baseUrl) {
  const title = cleanTitle(
    firstByRe(html, /<h[12]\b[^>]*class=(["'])[^"']*\btitle\b[^"']*\1[^>]*>([\s\S]*?)<\/h[12]>/i, 2) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:title\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)
  );
  const poster = absolutize(
    firstByRe(html, /<meta\b[^>]*property=(["'])og:image\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstImage(firstBlockByClass(html, "column-video-cover")) ||
    firstImage(firstBlockByClass(html, "movie-panel-info")) ||
    firstImage(html),
    baseUrl
  );
  const code = infoValue(html, ["番號", "番号", "識別碼", "识别码", "ID", "Code"]);
  const releaseDate = dateOnly(infoValue(html, ["日期", "発売日", "發行日期", "发行日期", "Release Date", "Date"]));
  const durationText = infoValue(html, ["時長", "时长", "片長", "片长", "Duration", "Runtime"]);
  const maker = infoValue(html, ["片商", "製作商", "制作商", "Maker", "Studio"]);
  const publisher = infoValue(html, ["發行", "发行", "Publisher", "Label"]);
  const series = infoValue(html, ["系列", "Series"]);
  const director = infoValue(html, ["導演", "导演", "Director"]);
  const genres = parseTaxonomy(html, baseUrl, ["tags", "genres", "makers", "publishers", "directors", "series", "studios", "companies"]);
  const peoples = parsePeople(html, baseUrl);
  const relatedItems = parseVideoList(html, baseUrl)
    .filter((item) => normalizeJavDbUrl(decodeDetailLink(item.link), baseUrl).split("#")[0] !== href.split("#")[0])
    .slice(0, 24);
  const backdropPaths = unique([poster].concat(extractPreviewImages(html, baseUrl))).filter(Boolean);
  const rating = firstRating(firstBlockByClass(html, "movie-panel-info"));
  const description = detailDescription({
    code,
    releaseDate,
    durationText,
    maker,
    publisher,
    series,
    director,
    genres,
    peoples,
    html,
  });

  return {
    id: detailIdFromUrl(href) || stableId(href),
    type: "url",
    mediaType: "movie",
    title: title || code || detailIdFromUrl(href) || "JavDB",
    posterPath: poster,
    backdropPath: poster,
    backdropPaths,
    releaseDate,
    rating,
    description,
    durationText,
    previewUrl: poster,
    link: encodeDetailLink(href),
    playerType: "system",
    genreItems: genres,
    peoples,
    relatedItems,
  };
}

function listTitle(anchorHtml, around) {
  return cleanTitle(
    attr(anchorHtml, "title") ||
    firstClassText(anchorHtml, "video-title") ||
    firstClassText(around, "video-title") ||
    imgAttr(anchorHtml, "alt") ||
    imgAttr(around, "alt") ||
    stripTags(anchorHtml)
  );
}

function listDescription(code, metas) {
  const parts = [];
  if (code) parts.push("ID: " + code);
  for (const meta of metas || []) {
    const text = cleanText(meta);
    if (!text || text === code || /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(text)) continue;
    if (parts.indexOf(text) === -1 && parts.length < 4) parts.push(text);
  }
  return parts.join("\n");
}

function detailDescription(info) {
  const parts = [];
  if (info.code) parts.push("ID: " + info.code);
  if (info.releaseDate) parts.push("Release Date: " + info.releaseDate);
  if (info.durationText) parts.push("Duration: " + info.durationText);
  if (info.maker) parts.push("Maker: " + info.maker);
  if (info.publisher) parts.push("Publisher: " + info.publisher);
  if (info.series) parts.push("Series: " + info.series);
  if (info.director) parts.push("Director: " + info.director);
  if (info.genres && info.genres.length) parts.push("Tags: " + info.genres.map((item) => item.title).join(", "));
  if (info.peoples && info.peoples.length) parts.push("Actors: " + info.peoples.map((item) => item.title).join(", "));
  const metaDescription = cleanText(firstByRe(info.html, /<meta\b[^>]*name=(["'])description\1[^>]*content=(["'])(.*?)\2/i, 3));
  if (metaDescription && parts.indexOf(metaDescription) === -1) parts.push(metaDescription);
  return parts.join("\n");
}

function parseTaxonomy(html, baseUrl, prefixes) {
  const out = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) {
    const href = normalizeJavDbUrl(match[2], baseUrl);
    const path = routePathFromUrl(href, baseUrl);
    if (!pathMatchesPrefix(path, prefixes)) continue;
    const title = cleanText(match[3]);
    if (!title || seen[path]) continue;
    seen[path] = true;
    out.push({ id: path, title });
  }
  return out;
}

function parsePeople(html, baseUrl) {
  const out = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) {
    const href = normalizeJavDbUrl(match[2], baseUrl);
    const path = routePathFromUrl(href, baseUrl);
    if (!pathMatchesPrefix(path, ["actors", "actor"])) continue;
    const title = cleanText(match[3]);
    if (!title || seen[path]) continue;
    seen[path] = true;
    out.push({ id: path, title, role: "actor" });
  }
  return out;
}

function extractPreviewImages(html, baseUrl) {
  const block = classWindow(html, "preview-images", 8000) ||
    classWindow(html, "tile-images", 8000) ||
    classWindow(html, "sample-waterfall", 8000) ||
    "";
  const source = block || html;
  const urls = [];
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = anchorRe.exec(source))) {
    const url = absolutize(match[2], baseUrl);
    if (isImageUrl(url)) urls.push(url);
  }
  const imgRe = /<img\b[^>]*>/gi;
  while ((match = imgRe.exec(source))) {
    const url = absolutize(imgAttr(match[0], "data-src") || imgAttr(match[0], "data-original") || imgAttr(match[0], "src"), baseUrl);
    if (isImageUrl(url)) urls.push(url);
  }
  return unique(urls).filter((url) => !/avatar|logo|icon|placeholder/i.test(url));
}

function infoValue(html, labels) {
  const blocks = [];
  const re = /<(?:div|p|span|li)\b[^>]*class=(["'])[^"']*\b(?:panel-block|movie-info|meta|info|field)\b[^"']*\1[^>]*>[\s\S]*?<\/(?:div|p|span|li)>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) blocks.push(match[0]);
  if (!blocks.length) blocks.push(String(html || ""));

  for (const block of blocks) {
    const text = cleanText(block);
    for (const label of labels) {
      const labelText = String(label || "");
      const index = text.toLowerCase().indexOf(labelText.toLowerCase());
      if (index === -1) continue;
      let value = text.slice(index + labelText.length).replace(/^[:：\s]+/, "");
      if (!value) value = cleanText(firstByRe(block, /<span\b[^>]*class=(["'])[^"']*\bvalue\b[^"']*\1[^>]*>([\s\S]*?)<\/span>/i, 2));
      if (!value) value = cleanText(firstByRe(block, /<\/strong>\s*([\s\S]*?)$/i));
      value = value.replace(/\s{2,}/g, " ").trim();
      if (value) return value;
    }
  }
  return "";
}

function rowAround(html, start, end) {
  const source = String(html || "");
  const before = source.lastIndexOf("<div", start);
  const from = before >= 0 ? Math.max(0, before) : Math.max(0, start - 600);
  const to = Math.min(source.length, end + 1200);
  return source.slice(from, to);
}

function pageUrl(baseUrl, route, page) {
  const base = normalizeBaseUrl(baseUrl);
  let path = String(route || "").trim();
  if (/^https?:\/\//i.test(path)) return appendQuery(path, page > 1 ? { page } : {});
  path = path.replace(/^\/+/, "").replace(/#.*$/, "");
  const url = path ? base + "/" + path : base + "/";
  return appendQuery(url, page > 1 ? { page } : {});
}

function appendQuery(url, params = {}) {
  let out = String(url || "");
  const hashIndex = out.indexOf("#");
  const hash = hashIndex >= 0 ? out.slice(hashIndex) : "";
  if (hashIndex >= 0) out = out.slice(0, hashIndex);
  const pairs = [];
  for (const key in params) {
    const value = params[key];
    if (value === undefined || value === null || value === "") continue;
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  }
  if (!pairs.length) return out + hash;
  return out + (out.indexOf("?") >= 0 ? "&" : "?") + pairs.join("&") + hash;
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
    cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
    userAgent: String(params.userAgent || saved.userAgent || "").trim(),
  };
  Widget.storage.set(RUNTIME_KEY, next);
  return next;
}

function getRuntimeParams() {
  return Widget.storage.get(RUNTIME_KEY) || { baseUrl: DEFAULT_BASE_URL, cfCookie: "", userAgent: "" };
}

function buildHeaders(params = {}, referer) {
  const userAgent = String(params.userAgent || "").trim() ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  const headers = {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: referer || normalizeBaseUrl(params.baseUrl) + "/",
  };
  const cookie = normalizeCookieHeader(params.cfCookie);
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function normalizeCookieHeader(value) {
  const cookie = String(value || "").trim();
  if (!cookie) return "";
  return cookie.includes("=") ? cookie : "cf_clearance=" + cookie;
}

function encodeDetailLink(href) {
  return href ? "detail:" + href : "";
}

function decodeDetailLink(link) {
  const value = String(link || "").trim();
  return value.startsWith("detail:") ? value.slice("detail:".length) : value;
}

function isJavDbDetailUrl(value) {
  return /^https?:\/\/[^/]+\/v\/[^/?#]+/i.test(String(value || ""));
}

function detailIdFromUrl(url) {
  return decodeURIComponent(firstByRe(String(url || ""), /\/v\/([^/?#]+)/i) || "");
}

function routePathFromUrl(url, baseUrl) {
  const absolute = normalizeJavDbUrl(url, baseUrl);
  return absolute.replace(/^https?:\/\/[^/]+\/?/i, "").split("#")[0].split("?")[0].replace(/^\/+|\/+$/g, "");
}

function pathMatchesPrefix(path, prefixes) {
  const cleanPath = String(path || "").replace(/^\/+|\/+$/g, "");
  for (const prefix of prefixes || []) {
    const cleanPrefix = String(prefix || "").replace(/^\/+|\/+$/g, "");
    if (cleanPath === cleanPrefix || cleanPath.indexOf(cleanPrefix + "/") === 0) return true;
  }
  return false;
}

function normalizeJavDbUrl(url, baseUrl) {
  return absolutize(url, normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL));
}

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function absolutize(url, baseUrl) {
  let value = decodeHtml(String(url || "").trim()).replace(/&amp;/g, "&");
  if (!value || value === "about:blank" || /^javascript:/i.test(value) || /^data:/i.test(value)) return "";
  if (value.startsWith("//")) return "https:" + value;
  if (/^https?:\/\//i.test(value)) return value;
  const base = String(baseUrl || DEFAULT_BASE_URL);
  const origin = getOrigin(base) || normalizeBaseUrl(base);
  if (value.charAt(0) === "/") return origin + value;
  const cleanBase = base.split("#")[0].split("?")[0].replace(/\/[^/]*$/, "/");
  return cleanBase + value;
}

function getOrigin(url) {
  const match = String(url || "").match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : "";
}

function safePage(value) {
  const page = Number(value || 1);
  return page > 0 ? Math.floor(page) : 1;
}

function firstImage(html) {
  const imgRe = /<img\b[^>]*>/gi;
  let match;
  while ((match = imgRe.exec(String(html || "")))) {
    const tag = match[0];
    const srcset = imgAttr(tag, "srcset") || imgAttr(tag, "data-srcset");
    const src = imgAttr(tag, "data-src") ||
      imgAttr(tag, "data-original") ||
      imgAttr(tag, "data-lazy-src") ||
      imgAttr(tag, "src") ||
      firstSrcsetUrl(srcset);
    if (src && !/^data:/i.test(src)) return src;
  }
  return "";
}

function firstSrcsetUrl(srcset) {
  const first = String(srcset || "").split(",")[0] || "";
  return first.trim().split(/\s+/)[0] || "";
}

function isImageUrl(url) {
  return /\.(?:jpg|jpeg|png|webp|gif)(?:[?#]|$)/i.test(String(url || ""));
}

function firstRating(html) {
  const block = firstClassText(html, "score") || firstClassText(html, "rating");
  const value = block ?
    firstByRe(block, /([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*[0-9]+)?/i) :
    firstByRe(html, /(?:score|rating|評分|评分)\D{0,20}([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*[0-9]+)?/i);
  const rating = Number(value || 0);
  return rating > 0 ? rating : undefined;
}

function firstMeta(metas, pattern) {
  for (const meta of metas || []) {
    const match = String(meta || "").match(pattern);
    if (match) return cleanText(match[0]);
  }
  return "";
}

function firstClassText(html, className) {
  return cleanText(firstBlockByClass(html, className));
}

function firstBlockByClass(html, className) {
  const re = new RegExp("<[^>]*class=(['\"])[^'\"]*\\b" + escapeRegExp(className) + "\\b[^'\"]*\\1[^>]*>[\\s\\S]*?<\\/[^>]+>", "i");
  const match = String(html || "").match(re);
  return match ? match[0] : "";
}

function classWindow(html, className, size) {
  const source = String(html || "");
  const re = new RegExp("class=(['\"])[^'\"]*\\b" + escapeRegExp(className) + "\\b[^'\"]*\\1", "i");
  const match = source.match(re);
  if (!match) return "";
  const index = match.index || 0;
  return source.slice(Math.max(0, index - 200), Math.min(source.length, index + (size || 4000)));
}

function extractClassTexts(html, className) {
  const out = [];
  const re = new RegExp("<[^>]*class=(['\"])[^'\"]*\\b" + escapeRegExp(className) + "\\b[^'\"]*\\1[^>]*>([\\s\\S]*?)<\\/[^>]+>", "gi");
  let match;
  while ((match = re.exec(String(html || "")))) {
    const text = cleanText(match[2]);
    if (text) out.push(text);
  }
  return out;
}

function attr(html, name) {
  const re = new RegExp("\\b" + escapeRegExp(name) + "\\s*=\\s*(['\"])(.*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function imgAttr(html, name) {
  const img = firstByRe(html, /(<img\b[\s\S]*?>)/i) || String(html || "");
  return attr(img, name);
}

function firstByRe(text, re, group) {
  const match = String(text || "").match(re);
  return match ? (match[group || 1] || "") : "";
}

function cleanTitle(value) {
  return cleanText(value).replace(/\s*-\s*JavDB.*$/i, "").trim();
}

function cleanText(value) {
  return decodeHtml(stripTags(String(value || "")))
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, function (_, code) {
      return String.fromCharCode(Number(code));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) {
      return String.fromCharCode(parseInt(code, 16));
    });
}

function dateOnly(value) {
  const match = String(value || "").match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
  if (!match) return "";
  const parts = match[0].replace(/\./g, "-").replace(/\//g, "-").split("-");
  return parts[0] + "-" + pad2(parts[1]) + "-" + pad2(parts[2]);
}

function pad2(value) {
  return String(value || "").padStart(2, "0");
}

function stableId(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return "javdb-" + Math.abs(hash);
}

function unique(list) {
  const out = [];
  const seen = {};
  for (const item of list || []) {
    const key = String(item || "");
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }
  return out;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNoiseTitle(title) {
  return /^(image|poster|cover|sample|preview)$/i.test(String(title || "").trim());
}

function isCloudflareChallenge(html) {
  const text = String(html || "");
  return /cf_chl_|cf-mitigated|Just a moment|Attention Required|challenges\.cloudflare\.com/i.test(text);
}
