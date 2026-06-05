WidgetMetadata = {
  id: "forward.bestjavporn",
  title: "BestJavPorn",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "BestJavPorn 列表、搜索与详情模块",
  author: "Forward",
  site: "https://www.bestjavporn.com/",
  detailCacheDuration: 3600,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://www.bestjavporn.com",
      placeholders: [
        { title: "BestJavPorn", value: "https://www.bestjavporn.com" },
      ],
    },
    {
      name: "cfCookie",
      title: "Cloudflare Cookie",
      type: "input",
      value: "",
      placeholders: [
        { title: "浏览器通过验证后的 Cookie", value: "cf_clearance=...; other=value" },
      ],
    },
  ],
  modules: [
    {
      id: "loadList",
      title: "影片列表",
      functionName: "loadList",
      cacheDuration: 1800,
      params: [
        {
          name: "category",
          title: "分类",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "首页", value: "" },
            { title: "Censored", value: "censored" },
            { title: "Uncensored", value: "uncensored" },
            { title: "Amateur", value: "amateur" },
            { title: "Decensored", value: "decensored" },
            { title: "English Sub", value: "english-sub" },
            { title: "Chinese Sub", value: "chinese-sub" },
            { title: "SUB Indo", value: "sub-indo" },
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
      { name: "page", title: "页码", type: "page" },
    ],
  },
};

const DEFAULT_BASE_URL = "https://www.bestjavporn.com";

async function loadList(params = {}) {
  try {
    const baseUrl = normalizeBaseUrl(params.baseUrl);
    rememberRuntimeParams(params);
    const page = Number(params.page || 1);
    const html = await fetchFirstAvailablePage(baseUrl, listPaths(params), page, params);
    return parseVideoList(html, baseUrl);
  } catch (error) {
    console.error("[bestjavporn][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const baseUrl = normalizeBaseUrl(params.baseUrl);
    rememberRuntimeParams(params);
    const page = Number(params.page || 1);
    const path = page <= 1 ? "/" : `/page/${page}/`;
    const html = await fetchPage(`${baseUrl}${path}?s=${encodeURIComponent(keyword)}`, params);
    return parseVideoList(html, baseUrl);
  } catch (error) {
    console.error("[bestjavporn][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const href = decodeDetailLink(link);
    if (!href) return null;
    const baseUrl = getBaseUrlFromLink(href);
    const html = await fetchPage(href, getRuntimeParams());
    const detail = parseVideoDetail(html, href, baseUrl);
    return detail || null;
  } catch (error) {
    console.error("[bestjavporn][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function fetchPage(url, params = {}) {
  let res;
  try {
    res = await Widget.http.get(url, {
      headers: buildHeaders(params),
    });
  } catch (error) {
    const message = String((error && error.message) || error || "");
    if (message.includes("403")) {
      throw new Error("目标站点返回 403/Cloudflare 验证。请先在浏览器打开站点并通过验证，然后把 Cookie 填入模块参数 Cloudflare Cookie（至少包含 cf_clearance）");
    }
    if (message.includes("404")) {
      throw new Error("HTTP_404:" + url);
    }
    throw error;
  }
  const html = String((res && res.data) || "");
  if (!html) throw new Error("空响应");
  if (html.includes("cf_chl_") || html.includes("Just a moment...")) {
    throw new Error("目标站点返回 Cloudflare 验证页。请把浏览器通过验证后的 Cookie 填入模块参数 Cloudflare Cookie（至少包含 cf_clearance）");
  }
  return html;
}

async function fetchFirstAvailablePage(baseUrl, paths, page, params = {}) {
  const candidates = unique(paths).map((path) => pageUrl(baseUrl, path, page));
  let last404 = "";
  for (const url of candidates) {
    try {
      return await fetchPage(url, params);
    } catch (error) {
      const message = String((error && error.message) || error || "");
      if (!message.startsWith("HTTP_404:")) throw error;
      last404 = message.slice("HTTP_404:".length);
    }
  }
  throw new Error("分类路径不存在: " + (last404 || candidates[0] || baseUrl));
}

function buildHeaders(params = {}) {
  const cookie = String(params.cfCookie || "").trim();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    Referer: normalizeBaseUrl(params.baseUrl) + "/",
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
    cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
  };
  Widget.storage.set("bestjavporn.runtimeParams", next);
}

function getRuntimeParams() {
  return Widget.storage.get("bestjavporn.runtimeParams") || { baseUrl: DEFAULT_BASE_URL, cfCookie: "" };
}

function parseVideoList(html, baseUrl) {
  const items = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']*\/video\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html))) {
    const anchorHtml = match[0];
    const href = absolutize(match[2], baseUrl);
    if (!href || seen[href]) continue;
    seen[href] = true;

    const title = cleanText(
      attr(anchorHtml, "title") ||
      imgAttr(anchorHtml, "alt") ||
      imgAttr(anchorHtml, "title") ||
      stripTags(anchorHtml)
    );
    if (!title || /^image:/i.test(title)) continue;

    const around = html.slice(Math.max(0, match.index - 600), Math.min(html.length, anchorRe.lastIndex + 900));
    items.push({
      id: stableId(href),
      type: "url",
      title,
      posterPath: absolutize(firstImage(anchorHtml) || firstImage(around), baseUrl),
      durationText: firstDuration(around),
      rating: firstRating(around),
      link: encodeDetailLink(href),
      playerType: "system",
    });
  }
  return items;
}

function parseVideoDetail(html, href, baseUrl) {
  const title = cleanText(
    firstByRe(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:title\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)
  );
  const poster = absolutize(
    firstByRe(html, /<meta\b[^>]*property=(["'])og:image\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstImage(html),
    baseUrl
  );
  const videoUrl = absolutize(firstPlayableUrl(html), baseUrl);
  const description = cleanText(
    firstByRe(html, /<meta\b[^>]*name=(["'])description\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<div\b[^>]*class=(["'])[^"']*(?:entry-content|post-content|description)[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2)
  );
  const genres = parseTaxonomy(html, baseUrl, ["/category/", "/categories/", "/tag/", "/censored/", "/uncensored/", "/amateur/", "/decensored/"]);
  const peoples = parseTaxonomy(html, baseUrl, ["/pornstar/", "/actor/", "/actress/"]).map((item) => ({
    id: item.id,
    title: item.title,
    role: "actor",
  }));
  const relatedItems = parseRelatedItems(html, baseUrl, href);

  return {
    id: stableId(href),
    type: "url",
    title: title || stableId(href),
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    description,
    videoUrl,
    previewUrl: poster,
    link: encodeDetailLink(href),
    playerType: "system",
    genreItems: genres,
    peoples,
    relatedItems,
  };
}

function parseRelatedItems(html, baseUrl, currentHref) {
  return parseVideoList(html, baseUrl).filter((item) => decodeDetailLink(item.link) !== currentHref).slice(0, 24);
}

function parseTaxonomy(html, baseUrl, prefixes) {
  const out = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html))) {
    const href = absolutize(match[2], baseUrl);
    if (!href || !prefixes.some((prefix) => href.includes(prefix))) continue;
    const title = cleanText(match[3]);
    if (!title) continue;
    const id = slugFromUrl(href);
    if (!id || seen[id]) continue;
    seen[id] = true;
    out.push({ id, title });
  }
  return out;
}

function firstPlayableUrl(html) {
  return firstByRe(html, /<source\b[^>]*src=(["'])(.*?)\1/i, 2) ||
    firstByRe(html, /<video\b[^>]*src=(["'])(.*?)\1/i, 2) ||
    firstByRe(html, /<iframe\b[^>]*src=(["'])(.*?)\1/i, 2) ||
    firstByRe(html, /(?:file|src|url)\s*:\s*(["'])(https?:\/\/[^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)\1/i, 2) ||
    firstByRe(html, /(https?:\/\/[^"']+\.(?:m3u8|mp4|webm)(?:\?[^"'<\s]*)?)/i);
}

function firstImage(html) {
  return imgAttr(html, "data-src") ||
    imgAttr(html, "data-lazy-src") ||
    imgAttr(html, "data-original") ||
    imgAttr(html, "src") ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:image\1[^>]*content=(["'])(.*?)\2/i, 3);
}

function firstDuration(html) {
  return firstByRe(html, /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
}

function firstRating(html) {
  const value = firstByRe(html, /\b(?:rating|rate|views?|HD)\D{0,20}(\d{1,3})(?:\b|%)/i);
  const num = Number(value);
  return Number.isFinite(num) && num > 0 && num <= 100 ? num : undefined;
}

function firstByRe(text, re, group) {
  const match = re.exec(text || "");
  return match ? match[group || 1] : "";
}

function imgAttr(html, name) {
  return firstByRe(html, new RegExp("<img\\b[^>]*" + name + "=(['\\\"])(.*?)\\1", "i"), 2);
}

function attr(html, name) {
  return firstByRe(html, new RegExp("\\b" + name + "=(['\\\"])(.*?)\\1", "i"), 2);
}

function cleanText(value) {
  return decodeHtml(stripTags(value || ""))
    .replace(/\s+/g, " ")
    .replace(/\s+\|?\s*BestJavPorn.*$/i, "")
    .trim();
}

function stripTags(value) {
  return String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function pageUrl(baseUrl, path, page) {
  const cleanPath = path === "/" ? "/" : `/${trimSlashes(path)}/`;
  if (Number(page || 1) <= 1) return baseUrl + cleanPath;
  return `${baseUrl}${cleanPath}page/${Number(page)}/`;
}

function listPaths(params) {
  if (params.peopleId) return [`/pornstar/${trimSlashes(params.peopleId)}/`, `/actor/${trimSlashes(params.peopleId)}/`, `/actress/${trimSlashes(params.peopleId)}/`];
  if (params.genreId) return categoryPaths(params.genreId);
  if (params.category) return categoryPaths(params.category);
  return ["/"];
}

function categoryPaths(value) {
  const id = trimSlashes(value);
  if (!id) return ["/"];
  return [`/category/${id}/`, `/${id}/`, `/tag/${id}/`];
}

function unique(values) {
  const seen = {};
  return values.filter((value) => {
    const key = String(value || "");
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function absolutize(url, baseUrl) {
  if (!url) return "";
  const value = decodeHtml(String(url).trim());
  if (!value || value.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return "https:" + value;
  return normalizeBaseUrl(baseUrl) + "/" + trimSlashes(value);
}

function stableId(url) {
  return slugFromUrl(url) || String(url || "");
}

function slugFromUrl(url) {
  const clean = String(url || "").split("?")[0].replace(/\/+$/, "");
  return decodeURIComponent(clean.substring(clean.lastIndexOf("/") + 1));
}

function encodeDetailLink(href) {
  return "detail:" + href;
}

function decodeDetailLink(link) {
  const value = String(link || "");
  return value.startsWith("detail:") ? value.slice(7) : value;
}

function getBaseUrlFromLink(href) {
  const match = /^(https?:\/\/[^/]+)/i.exec(String(href || ""));
  return match ? match[1] : DEFAULT_BASE_URL;
}
