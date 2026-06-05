WidgetMetadata = {
  id: "forward.bestjavporn",
  title: "BestJavPorn",
  version: "1.0.2",
  requiredVersion: "0.0.1",
  description: "BestJavPorn 列表、搜索与详情模块",
  author: "Forward",
  site: "https://www3.bestjavporn.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://www3.bestjavporn.com",
      placeholders: [
        { title: "BestJavPorn www3", value: "https://www3.bestjavporn.com" },
        { title: "BestJavPorn www", value: "https://www.bestjavporn.com" },
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
    {
      id: "loadResource",
      title: "BestJavPorn 播放源",
      description: "提取正片播放源并优先返回最高画质",
      functionName: "loadResource",
      type: "stream",
      params: [],
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
            { title: "有码", value: "category/censored" },
            { title: "无码", value: "v4/category/uncensored" },
            { title: "素人", value: "category/amateur" },
            { title: "破解", value: "v1/category/decensored" },
            { title: "英文字幕", value: "category/censored/english-subtitle" },
            { title: "中文字幕", value: "category/chinese-subtitle" },
            { title: "泰语字幕", value: "category/subthai" },
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

const DEFAULT_BASE_URL = "https://www3.bestjavporn.com";

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
    const params = getRuntimeParams();
    const html = await fetchPage(href, params);
    const detail = await parseVideoDetail(html, href, baseUrl, params);
    return detail || null;
  } catch (error) {
    console.error("[bestjavporn][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const saved = getRuntimeParams();
    const runtimeParams = {
      baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
      cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
    };
    const href = inferDetailHref(params, runtimeParams.baseUrl);
    if (!href) return [];

    const baseUrl = getBaseUrlFromLink(href);
    const html = await fetchPage(href, runtimeParams);
    const candidates = await collectPlayableCandidates(html, href, baseUrl, runtimeParams);
    return candidates.map((candidate, index) => ({
      name: playbackName(candidate.url, index),
      description: candidate.source || "BestJavPorn",
      url: candidate.url,
      customHeaders: mediaHeaders(runtimeParams, href),
    }));
  } catch (error) {
    console.error("[bestjavporn][loadResource] 失败:", error.message || error);
    return [];
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

function buildHeaders(params = {}, referer) {
  const cookie = String(params.cfCookie || "").trim();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    Referer: referer || normalizeBaseUrl(params.baseUrl) + "/",
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function mediaHeaders(params = {}, referer) {
  const headers = buildHeaders(params, referer);
  headers.Origin = getBaseUrlFromLink(referer || params.baseUrl || DEFAULT_BASE_URL);
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

async function parseVideoDetail(html, href, baseUrl, params = {}) {
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
  const videoUrl = await selectBestPlayableUrl(html, href, baseUrl, params);
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
    customHeaders: mediaHeaders(params, href),
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

async function selectBestPlayableUrl(html, referer, baseUrl, params = {}) {
  const candidates = await collectPlayableCandidates(html, referer, baseUrl, params);
  return candidates[0] ? candidates[0].url : "";
}

async function collectPlayableCandidates(html, referer, baseUrl, params = {}) {
  const candidates = extractMediaCandidates(html, baseUrl);

  const iframeUrls = extractIframeUrls(html, baseUrl).filter((url) => !isPreviewUrl(url));
  for (const iframeUrl of iframeUrls) {
    try {
      const iframeHtml = await fetchPageWithReferer(iframeUrl, params, referer);
      extractMediaCandidates(iframeHtml, iframeUrl).forEach((candidate) => {
        candidates.push({ url: candidate.url, source: "iframe:" + iframeUrl });
      });
    } catch (error) {
      console.log("[bestjavporn][video] iframe 解析失败:", iframeUrl, (error && error.message) || error);
    }
  }

  const expanded = [];
  for (const candidate of uniqueCandidates(candidates).sort((a, b) => mediaScore(b.url) - mediaScore(a.url))) {
    const variants = await resolvePlayableVariants(candidate.url, referer, params);
    variants.forEach((variant) => expanded.push({ url: variant, source: candidate.source }));
  }
  return uniqueCandidates(expanded).sort((a, b) => mediaScore(b.url) - mediaScore(a.url));
}

async function fetchPageWithReferer(url, params = {}, referer) {
  const res = await Widget.http.get(url, {
    headers: buildHeaders(params, referer),
  });
  return String((res && res.data) || "");
}

function extractMediaCandidates(html, baseUrl) {
  const normalized = normalizeEscapedText(html);
  const searchable = normalized + "\n" + unpackPacker(normalized) + "\n" + decodeEmbeddedBase64Text(normalized);
  const candidates = [];
  collectMediaMatches(candidates, searchable, /<(?:source|video)\b[^>]*src=(["'])(.*?)\1/gi, baseUrl, "source", 2);
  collectMediaMatches(candidates, searchable, /<meta\b[^>]*(?:property|name)=(["'])(?:og:video|og:video:url|twitter:player:stream|video)\1[^>]*content=(["'])(.*?)\2/gi, baseUrl, "meta", 3);
  collectMediaMatches(candidates, searchable, /\b(?:data-src|data-video|data-file|data-url|data-hls|data-mp4|file|src|url|source|hls|video)\s*[:=]\s*(["'])([^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)\1/gi, baseUrl, "script", 2);
  collectMediaMatches(candidates, searchable, /(https?:\/\/[^"'<>\s\\]+\.(?:m3u8|mp4|webm)(?:\?[^"'<>\s\\]*)?)/gi, baseUrl, "url", 1);
  collectMediaMatches(candidates, searchable, /(["'])((?:\/\/|\/)[^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)\1/gi, baseUrl, "relative", 2);
  return uniqueCandidates(candidates).filter((candidate) => candidate.url && !isPreviewUrl(candidate.url));
}

function collectMediaMatches(out, text, re, baseUrl, source, group) {
  let match;
  while ((match = re.exec(text || ""))) {
    collectMediaUrl(out, match[group], baseUrl, source);
  }
}

function collectMediaUrl(out, rawUrl, baseUrl, source) {
  const url = absolutize(rawUrl, baseUrl);
  if (!url || !/\.(?:m3u8|mp4|webm)(?:[?#]|$)/i.test(url)) return;
  out.push({ url, source: source || "unknown" });
}

function extractIframeUrls(html, baseUrl) {
  const normalized = normalizeEscapedText(html);
  const out = [];
  const re = /<iframe\b[^>]*src=(["'])(.*?)\1/gi;
  let match;
  while ((match = re.exec(normalized))) {
    const url = absolutize(match[2], baseUrl);
    if (url) out.push(url);
  }
  return unique(out);
}

async function resolveBestPlayableVariant(url, referer, params = {}) {
  const variants = await resolvePlayableVariants(url, referer, params);
  return variants[0] || url;
}

async function resolvePlayableVariants(url, referer, params = {}) {
  if (!/\.m3u8(?:[?#]|$)/i.test(url)) return [url];
  try {
    const res = await Widget.http.get(url, {
      headers: buildHeaders(params, referer),
    });
    const variants = bestM3u8Variants(String((res && res.data) || ""), url);
    return variants.length ? variants : [url];
  } catch (error) {
    console.log("[bestjavporn][video] m3u8 清晰度解析失败:", (error && error.message) || error);
    return [url];
  }
}

function bestM3u8Variant(playlist, playlistUrl) {
  const variants = bestM3u8Variants(playlist, playlistUrl);
  return variants[0] || "";
}

function bestM3u8Variants(playlist, playlistUrl) {
  if (!/#EXT-X-STREAM-INF/i.test(playlist || "")) return [];
  const lines = String(playlist || "").split(/\r?\n/);
  let pending = null;
  const variants = [];
  for (const line of lines) {
    const value = String(line || "").trim();
    if (!value) continue;
    if (value.startsWith("#EXT-X-STREAM-INF")) {
      pending = {
        bandwidth: numberFromRe(value, /BANDWIDTH=(\d+)/i),
        resolution: resolutionScore(value),
      };
      continue;
    }
    if (pending && !value.startsWith("#")) {
      variants.push({
        url: absolutizeM3u8Variant(value, playlistUrl),
        score: pending.resolution * 100000000 + pending.bandwidth,
      });
      pending = null;
    }
  }
  variants.sort((a, b) => b.score - a.score);
  return variants.map((item) => item.url);
}

function bestMediaCandidate(candidates) {
  return (candidates || []).slice().sort((a, b) => mediaScore(b.url) - mediaScore(a.url))[0] || null;
}

function mediaScore(url) {
  const value = String(url || "");
  let score = 0;
  if (/\.m3u8(?:[?#]|$)/i.test(value)) score += 1000000;
  if (/\.mp4(?:[?#]|$)/i.test(value)) score += 500000;
  score += resolutionScore(value) * 1000;
  if (/bestjavporn|video|stream|hls|playlist|master|full|embed/i.test(value)) score += 5000;
  if (/preview|trailer|sample|freepv|javtrailers|thumbnail|thumb|teaser|promo|litevideo|avpreview|mgstage|dmm\.co\.jp/i.test(value)) score -= 10000000;
  return score;
}

function playbackName(url, index) {
  const res = resolutionScore(url);
  if (res) return `${res}P 正片`;
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return index === 0 ? "自适应正片" : "备用正片";
  return index === 0 ? "正片" : `备用正片 ${index + 1}`;
}

function resolutionScore(value) {
  const text = String(value || "");
  const fromResolution = numberFromRe(text, /RESOLUTION=\d+x(\d+)/i);
  if (fromResolution) return fromResolution;
  const fromName = numberFromRe(text, /(?:^|[^\d])([1-9]\d{2,3})p(?:[^\d]|$)/i);
  if (fromName) return fromName;
  const fromSize = numberFromRe(text, /(?:^|[^\d])(?:3840x2160|2160)(?:[^\d]|$)/i);
  if (fromSize) return 2160;
  return 0;
}

function numberFromRe(value, re) {
  const num = Number(firstByRe(value, re));
  return Number.isFinite(num) ? num : 0;
}

function absolutizeM3u8Variant(value, playlistUrl) {
  const base = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
  const url = absolutize(value, base);
  const query = String(playlistUrl || "").includes("?") ? String(playlistUrl).slice(String(playlistUrl).indexOf("?")) : "";
  return query && url && !url.includes("?") ? url + query : url;
}

function isPreviewUrl(url) {
  return /(?:preview|trailer|sample|freepv|javtrailers|thumbnail|thumb|teaser|promo|litevideo|avpreview|sample\.mgstage|cc3001\.dmm\.co\.jp)/i.test(String(url || ""));
}

function uniqueCandidates(candidates) {
  const seen = {};
  return (candidates || []).filter((candidate) => {
    const key = String((candidate && candidate.url) || "").split("#")[0];
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function normalizeEscapedText(value) {
  return decodeHtml(String(value || ""))
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/%3A/gi, ":")
    .replace(/%2F/gi, "/")
    .replace(/%3F/gi, "?")
    .replace(/%26/gi, "&")
    .replace(/%3D/gi, "=");
}

function unpackPacker(html) {
  if (!html) return "";
  const out = [];
  const re = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'[\s\S]+?\)/g;
  let match;
  while ((match = re.exec(html))) {
    try {
      let packed = match[1].replace(/\\'/g, "'");
      const count = Number(match[3]);
      const keys = match[4].split("|");
      for (let index = count - 1; index >= 0; index--) {
        if (!keys[index]) continue;
        packed = packed.replace(new RegExp("\\b" + index.toString(36) + "\\b", "g"), keys[index]);
      }
      out.push(packed);
    } catch (error) {}
  }
  return out.join("\n");
}

function decodeEmbeddedBase64Text(text) {
  if (typeof Buffer === "undefined") return "";
  const out = [];
  const re = /(?:atob|base64_decode)\s*\(\s*(["'])([A-Za-z0-9+/=]{24,})\1\s*\)|(["'])([A-Za-z0-9+/=]{40,})\3/g;
  let match;
  while ((match = re.exec(text || ""))) {
    const encoded = match[2] || match[4] || "";
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      if (/\.(?:m3u8|mp4|webm)/i.test(decoded)) out.push(decoded);
    } catch (error) {}
  }
  return out.join("\n");
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
  const mapped = CATEGORY_PATHS[id] || [];
  const direct = id.includes("/") ? [`/${id}/`] : [];
  return direct.concat(mapped, [`/category/${id}/`, `/${id}/`, `/tag/${id}/`]);
}

const CATEGORY_PATHS = {
  censored: ["/category/censored/"],
  uncensored: ["/v4/category/uncensored/", "/v6/category/uncensored/", "/category/uncensored/"],
  amateur: ["/category/amateur/"],
  decensored: ["/v1/category/decensored/", "/category/decensored/"],
  "english-sub": ["/category/censored/english-subtitle/"],
  "english-subtitle": ["/category/censored/english-subtitle/"],
  "chinese-sub": ["/category/chinese-subtitle/"],
  "chinese-subtitle": ["/category/chinese-subtitle/"],
  subthai: ["/category/subthai/"],
  "sub-indo": ["/category/subthai/"],
  v13: ["/category/censored/"],
  v6: ["/v4/category/uncensored/", "/v6/category/uncensored/"],
  v10: ["/v1/category/decensored/"],
};

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
  const value = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return value === "https://www.bestjavporn.com" ? "https://www3.bestjavporn.com" : value;
}

function inferDetailHref(params = {}, baseUrl) {
  const values = [params.link, params.detailLink, params.href, params.url, params.webUrl];
  for (const value of values) {
    const decoded = decodeDetailLink(value);
    if (decoded && /\/video\//i.test(decoded)) return absolutize(decoded, baseUrl);
  }
  const id = stableId(params.id || "");
  if (id && !/^https?:/i.test(id) && !id.includes("undefined")) return `${normalizeBaseUrl(baseUrl)}/video/${trimSlashes(id)}/`;
  return "";
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
