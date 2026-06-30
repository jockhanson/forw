WidgetMetadata = {
  id: "forward.javguru",
  title: "JavGuru",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "JavGuru list, search, detail and playable stream module",
  author: "Forward",
  site: "https://jav.guru/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://jav.guru",
      placeholders: [{ title: "JavGuru", value: "https://jav.guru" }],
    },
    {
      name: "cfCookie",
      title: "Cloudflare Cookie",
      type: "input",
      value: "",
      placeholders: [{ title: "浏览器通过验证后的 Cookie", value: "cf_clearance=..." }],
    },
    {
      name: "userAgent",
      title: "User-Agent",
      type: "input",
      value: "",
      placeholders: [{ title: "留空使用默认浏览器 UA", value: "" }],
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
            { title: "首页", value: "" },
            { title: "JAV", value: "category/jav" },
            { title: "Subs", value: "category/english-subbed" },
            { title: "Decensored", value: "category/decensored" },
            { title: "Amateur", value: "category/amateur" },
            { title: "Idol", value: "category/idol" },
            { title: "FC2", value: "category/FC2" },
            { title: "4K", value: "category/4k" },
            { title: "Trending", value: "category/jav/?orderby=likes-today&order=DESC" },
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadResource",
      title: "JavGuru 播放源",
      functionName: "loadResource",
      type: "stream",
      requiresWebView: false,
      params: [],
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

const DEFAULT_BASE_URL = "https://jav.guru";
const RUNTIME_KEY = "javguru.runtimeParams";

async function loadList(params = {}) {
  try {
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const route = params.peopleId || params.genreId || params.category || "";
    const html = await fetchPage(pageUrl(runtimeParams.baseUrl, route, page), runtimeParams);
    return parseVideoList(html, runtimeParams.baseUrl);
  } catch (error) {
    console.error("[javguru][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const path = page <= 1 ? "/" : `/page/${page}/`;
    const html = await fetchPage(`${runtimeParams.baseUrl}${path}?s=${encodeURIComponent(keyword)}`, runtimeParams);
    return parseVideoList(html, runtimeParams.baseUrl);
  } catch (error) {
    console.error("[javguru][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const params = getRuntimeParams();
    const href = normalizeJavGuruUrl(decodeDetailLink(link), params.baseUrl);
    if (!href) return null;
    const baseUrl = getOrigin(href) || params.baseUrl;
    const html = await fetchPage(href, params);
    return await parseVideoDetail(html, href, baseUrl, params);
  } catch (error) {
    console.error("[javguru][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const saved = getRuntimeParams();
    const runtimeParams = rememberRuntimeParams({
      baseUrl: params.baseUrl || saved.baseUrl,
      cfCookie: params.cfCookie || saved.cfCookie,
      userAgent: params.userAgent || saved.userAgent,
    });
    const href = inferDetailHref(params, runtimeParams.baseUrl);
    if (!href) return [];
    const html = await fetchPage(href, runtimeParams);
    const candidates = await collectPlayableSources(html, href, getOrigin(href) || runtimeParams.baseUrl, runtimeParams);
    return candidates.map((candidate, index) => ({
      name: playbackName(candidate.url, index),
      description: candidate.source || "JavGuru",
      url: candidate.url,
      customHeaders: mediaHeaders(runtimeParams, href),
    }));
  } catch (error) {
    console.error("[javguru][loadResource] 失败:", error.message || error);
    return [];
  }
}

async function fetchPage(url, params = {}, referer) {
  let res;
  try {
    res = await Widget.http.get(url, { headers: buildHeaders(params, referer) });
  } catch (error) {
    const message = String((error && error.message) || error || "");
    if (message.includes("403")) {
      throw new Error("目标站点返回 403/Cloudflare 验证。请在浏览器通过验证后把 Cookie 填入 Cloudflare Cookie 参数");
    }
    if (message.includes("404")) throw new Error("HTTP_404:" + url);
    throw error;
  }
  const html = String((res && res.data) || "");
  if (!html) throw new Error("空响应: " + url);
  if (html.includes("cf_chl_") || html.includes("Just a moment...")) {
    throw new Error("目标站点返回 Cloudflare 验证页。请填写浏览器通过验证后的 Cloudflare Cookie");
  }
  return html;
}

function parseVideoList(html, baseUrl) {
  const rows = splitListRows(html);
  const items = [];
  const seen = {};
  for (const row of rows) {
    const anchor = firstByRe(row, /<h2\b[^>]*>[\s\S]*?(<a\b[\s\S]*?<\/a>)/i) ||
      firstByRe(row, /<a\b[^>]*href=(["'])[^"']+\/\d+\/[^"']+\1[\s\S]*?<\/a>/i, 0);
    const href = normalizeJavGuruUrl(attr(anchor, "href"), baseUrl);
    if (!href || seen[href]) continue;
    seen[href] = true;

    const title = cleanText(attr(anchor, "title") || stripTags(anchor) || imgAttr(row, "alt"));
    if (!title) continue;
    const poster = absolutize(firstImage(firstByRe(row, /<div\b[^>]*class=(["'])[^"']*\bimgg\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2) || row), baseUrl);
    const tags = parseTaxonomy(row, baseUrl, ["tag"]).map((item) => item.title);
    const releaseDate = cleanText(firstByRe(row, /<div\b[^>]*class=(["'])[^"']*\bdate\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));

    items.push({
      id: stableId(href),
      type: "url",
      mediaType: "movie",
      title,
      posterPath: poster,
      backdropPath: poster,
      releaseDate,
      description: tags.length ? tags.join(", ") : "",
      link: encodeDetailLink(href),
      playerType: "system",
    });
  }
  return items;
}

async function parseVideoDetail(html, href, baseUrl, params = {}) {
  const article = firstByRe(html, /(<article\b[\s\S]*?<\/article>)/i) || html;
  const title = cleanText(
    firstByRe(article, /<h1\b[^>]*class=(["'])[^"']*\btitl\b[^"']*\1[^>]*>([\s\S]*?)<\/h1>/i, 2) ||
    firstByRe(article, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:title\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)
  );
  const poster = absolutize(
    firstImage(firstByRe(article, /<div\b[^>]*class=(["'])[^"']*\blarge-screenimg\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2)) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:image\1[^>]*content=(["'])(.*?)\2/i, 3),
    baseUrl
  );
  const code = cleanText(firstByRe(article, /<li\b[^>]*>[\s\S]*?<strong\b[^>]*>[\s\S]*?Code:\s*[\s\S]*?<\/strong>\s*([^<]+)<\/li>/i));
  const releaseDate = cleanText(firstByRe(article, /<li\b[^>]*>[\s\S]*?<strong\b[^>]*>[\s\S]*?Release Date:\s*[\s\S]*?<\/strong>\s*([^<]+)<\/li>/i));
  const genres = parseTaxonomy(article, baseUrl, ["category", "tag", "maker", "studio", "series"]);
  const peoples = parsePeople(article, baseUrl);
  const relatedItems = parseVideoList(html, baseUrl)
    .filter((item) => decodeDetailLink(item.link).split("#")[0] !== href.split("#")[0])
    .slice(0, 24);
  const sources = await collectPlayableSources(html, href, baseUrl, params);
  const descriptionParts = [];
  if (code) descriptionParts.push("Code: " + code);
  if (releaseDate) descriptionParts.push("Release Date: " + releaseDate);
  if (genres.length) descriptionParts.push("Tags: " + genres.map((g) => g.title).join(", "));

  return {
    id: stableId(href),
    type: "url",
    mediaType: "movie",
    title: title || code || stableId(href),
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    releaseDate,
    description: descriptionParts.join("\n"),
    videoUrl: sources[0] ? sources[0].url : "",
    previewUrl: poster,
    link: encodeDetailLink(href),
    playerType: "system",
    customHeaders: mediaHeaders(params, href),
    genreItems: genres,
    peoples,
    relatedItems,
    trailers: sources[0] ? [{ coverUrl: poster, url: sources[0].url }] : [],
  };
}

async function collectPlayableSources(html, referer, baseUrl, params = {}) {
  const candidates = [];
  const direct = extractMediaCandidates(html, baseUrl);
  for (const item of direct) candidates.push(item);

  const buttons = extractStreamButtons(html, baseUrl);
  for (const button of buttons) {
    try {
      const resolved = await resolveStreamButton(button, referer, params);
      for (const item of resolved) candidates.push(item);
    } catch (error) {
      console.log("[javguru][stream] 播放源解析失败:", button.name, error.message || error);
    }
  }
  return uniqueCandidates(candidates)
    .filter((candidate) => isPlayableCandidate(candidate.url) && !isPreviewUrl(candidate.url))
    .sort((a, b) => mediaScore(b.url) - mediaScore(a.url));
}

function extractStreamButtons(html, baseUrl) {
  const variables = extractIframeVariables(html, baseUrl);
  const buttons = [];
  const buttonRe = /<a\b[^>]*class=(["'])[^"']*\bwp-btn-iframe__shortcode\b[^"']*\1[\s\S]*?<\/a>/gi;
  let match;
  while ((match = buttonRe.exec(html || ""))) {
    const anchor = match[0];
    const key = attr(anchor, "data-localize");
    const url = variables[key] || "";
    if (!url) continue;
    buttons.push({
      name: cleanText(stripTags(anchor)) || key || "JavGuru",
      url,
    });
  }
  if (!buttons.length) {
    for (const key in variables) buttons.push({ name: key, url: variables[key] });
  }
  return buttons;
}

function extractIframeVariables(html, baseUrl) {
  const variables = {};
  const re = /var\s+([A-Za-z_$][\w$]*)\s*=\s*(\{[\s\S]*?"iframe_url"[\s\S]*?\});/g;
  let match;
  while ((match = re.exec(html || ""))) {
    const encoded = firstByRe(match[2], /["']iframe_url["']\s*:\s*["']([^"']+)["']/i);
    const decoded = decodeBase64(encoded);
    if (decoded) variables[match[1]] = absolutize(decoded, baseUrl);
  }
  return variables;
}

async function resolveStreamButton(button, referer, params = {}) {
  const candidates = [];
  const firstHtml = await fetchPage(button.url, params, referer);
  const firstDirect = extractMediaCandidates(firstHtml, button.url);
  for (const item of firstDirect) candidates.push({ url: item.url, source: button.name + ":" + item.source });

  const secondUrl = buildSearchoRealUrl(firstHtml, button.url);
  if (secondUrl) {
    const secondHtml = await fetchPage(secondUrl, params, button.url);
    const media = extractMediaCandidates(secondHtml, secondUrl);
    for (const item of media) candidates.push({ url: item.url, source: button.name + ":" + item.source });
  }
  return uniqueCandidates(candidates);
}

function buildSearchoRealUrl(html, currentUrl) {
  const cid = firstByRe(html, /\bcid\s*:\s*(["'])(.*?)\1/i, 2);
  const base = firstByRe(html, /\bbase\s*:\s*(["'])(.*?)\1/i, 2) || currentUrl.split("?")[0];
  const rtype = firstByRe(html, /\brtype\s*:\s*(["'])(.*?)\1/i, 2) || firstByRe(currentUrl, /[?&]([a-z])d=/i) || "x";
  const keysText = firstByRe(html, /\bkeys\s*:\s*\[([\s\S]*?)\]/i);
  const keys = [];
  let keyMatch;
  const keyRe = /["']([^"']+)["']/g;
  while ((keyMatch = keyRe.exec(keysText || ""))) keys.push(keyMatch[1]);

  const tag = tagById(html, cid) || firstByRe(html, /(<div\b[^>]*class=(["'])[^"']*\bstream-box\b[^"']*\2[^>]*>)/i);
  const parts = [];
  if (keys.length) {
    for (const key of keys) parts.push(attr(tag, key));
  } else {
    const dataRe = /\bdata-[\w-]+\s*=\s*(["'])(.*?)\1/g;
    let dataMatch;
    while ((dataMatch = dataRe.exec(tag || ""))) parts.push(dataMatch[2]);
  }
  const token = parts.join("");
  if (!token) return "";
  return absolutize(base, currentUrl) + "?" + rtype + "r=" + reverseString(token);
}

function extractMediaCandidates(html, baseUrl) {
  const normalized = normalizeEscapedText(html);
  const searchable = normalized + "\n" + unpackPacker(normalized);
  const candidates = [];
  collectMediaMatches(candidates, searchable, /<(?:source|video)\b[^>]*src=(["'])(.*?)\1/gi, baseUrl, "source", 2);
  collectMediaMatches(candidates, searchable, /\b(?:file|src|url|source|hls\d*|video|video_url|videoUrl)\s*[:=]\s*(["'])([^"']+)\1/gi, baseUrl, "script", 2);
  collectMediaMatches(candidates, searchable, /(https?:\/\/[^"'<>\s\\]+\.(?:m3u8|mp4|webm)(?:\?[^"'<>\s\\]*)?)/gi, baseUrl, "url", 1);
  collectMediaMatches(candidates, searchable, /(["'])((?:\/\/|\/)[^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)\1/gi, baseUrl, "relative", 2);
  collectMediaMatches(candidates, searchable, /(https?:\/\/[^"'<>\s\\]+\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|player|embed|source|file)[^"'<>\s\\]*)/gi, baseUrl, "url", 1);
  collectMediaMatches(candidates, searchable, /(["'])((?:\/\/|\/)[^"']+\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|player|embed|source|file)[^"']*)\1/gi, baseUrl, "relative", 2);
  const playerUrls = parsePlayerSourceObjects(searchable, baseUrl);
  for (const url of playerUrls) candidates.push({ url, source: "player-obj" });
  return uniqueCandidates(candidates).filter((candidate) => isPlayableCandidate(candidate.url) && !isPreviewUrl(candidate.url));
}

function parsePlayerSourceObjects(text, baseUrl) {
  const out = [];
  const patterns = [
    /\b(?:sources|videoSources|playSources)\s*[:=]\s*(\[[\s\S]*?\])/gi,
    /(?:jwplayer|videojs)\s*\([^)]*\)\s*\.\s*(?:setup|load|source)\s*\(\s*(\{[\s\S]*?\})\s*\)/gi,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(text || ""))) {
      const block = match[1];
      const urlRe = /["']((?:https?:\/\/|\/\/|\/)[^"']*(?:m3u8|mp4|webm|get_file|stream|playlist|master)[^"']*)["']/gi;
      let urlMatch;
      while ((urlMatch = urlRe.exec(block))) {
        const url = absolutize(urlMatch[1], baseUrl);
        if (isPlayableCandidate(url) && !isPreviewUrl(url)) out.push(url);
      }
    }
  }
  return unique(out);
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

function collectMediaMatches(out, text, re, baseUrl, source, group) {
  let match;
  while ((match = re.exec(text || ""))) collectMediaUrl(out, match[group], baseUrl, source);
}

function collectMediaUrl(out, rawUrl, baseUrl, source) {
  const url = absolutize(rawUrl, baseUrl);
  if (isPlayableCandidate(url) && !isPreviewUrl(url)) out.push({ url, source });
}

function splitListRows(html) {
  const rows = [];
  const re = /<div\b[^>]*class=(["'])[^"']*\brow\b[^"']*\1[^>]*>[\s\S]*?(?=<div\b[^>]*class=(["'])[^"']*\brow\b[^"']*\2|<nav\b|<\/main>|$)/gi;
  let match;
  while ((match = re.exec(html || ""))) {
    if (match[0].includes("inside-article")) rows.push(match[0]);
  }
  return rows.length ? rows : [html || ""];
}

function parseTaxonomy(html, baseUrl, prefixes) {
  const out = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html || ""))) {
    const href = normalizeJavGuruUrl(match[2], baseUrl);
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
  while ((match = anchorRe.exec(html || ""))) {
    const href = normalizeJavGuruUrl(match[2], baseUrl);
    const path = routePathFromUrl(href, baseUrl);
    const role = path.indexOf("actress/") === 0 ? "actress" : (path.indexOf("actor/") === 0 ? "actor" : "");
    if (!role) continue;
    const title = cleanText(match[3]);
    if (!title || seen[path]) continue;
    seen[path] = true;
    out.push({ id: path, title, role });
  }
  return out;
}

function pathMatchesPrefix(path, prefixes) {
  const cleanPath = String(path || "").replace(/^\/+|\/+$/g, "");
  for (const prefix of prefixes || []) {
    const cleanPrefix = String(prefix || "").replace(/^\/+|\/+$/g, "");
    if (cleanPath === cleanPrefix || cleanPath.indexOf(cleanPrefix + "/") === 0) return true;
  }
  return false;
}

function inferDetailHref(params = {}, baseUrl) {
  return normalizeJavGuruUrl(decodeDetailLink(params.link || params.url || params.href || params.id || params.videoUrl), baseUrl);
}

function encodeDetailLink(href) {
  return href ? "detail:" + href : "";
}

function decodeDetailLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";
  return value.startsWith("detail:") ? value.slice("detail:".length) : value;
}

function pageUrl(baseUrl, route, page) {
  const base = normalizeBaseUrl(baseUrl);
  let path = String(route || "").trim();
  if (/^https?:\/\//i.test(path)) path = path.replace(/^https?:\/\/[^/]+\/?/i, "");
  path = path.replace(/^\/+/, "").replace(/#.*$/, "");
  const queryIndex = path.indexOf("?");
  const query = queryIndex >= 0 ? path.slice(queryIndex) : "";
  path = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  path = path.replace(/^\/+|\/+$/g, "");
  if (!path) return page <= 1 ? base + "/" + query : base + `/page/${page}/` + query;
  return page <= 1 ? `${base}/${path}/` + query : `${base}/${path}/page/${page}/` + query;
}

function normalizeJavGuruUrl(url, baseUrl) {
  return absolutize(url, normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL));
}

function absolutize(url, baseUrl) {
  let value = decodeHtml(String(url || "").trim()).replace(/&amp;/g, "&");
  if (!value || value === "about:blank" || value.startsWith("javascript:")) return "";
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

function routePathFromUrl(url, baseUrl) {
  const absolute = normalizeJavGuruUrl(url, baseUrl);
  return absolute.replace(/^https?:\/\/[^/]+\/?/i, "").split("#")[0].split("?")[0].replace(/^\/+|\/+$/g, "");
}

function buildHeaders(params = {}, referer) {
  const userAgent = String(params.userAgent || "").trim() ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  const headers = {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    Referer: referer || normalizeBaseUrl(params.baseUrl) + "/",
  };
  const cookie = normalizeCookieHeader(params.cfCookie);
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function mediaHeaders(params = {}, referer) {
  const headers = buildHeaders(params, referer);
  headers.Origin = getOrigin(referer || params.baseUrl || DEFAULT_BASE_URL);
  return headers;
}

function normalizeCookieHeader(value) {
  const cookie = String(value || "").trim();
  if (!cookie) return "";
  return cookie.includes("=") ? cookie : "cf_clearance=" + cookie;
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl || DEFAULT_BASE_URL),
    cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
    userAgent: String(params.userAgent || saved.userAgent || "").trim(),
  };
  Widget.storage.set(RUNTIME_KEY, next);
  return next;
}

function getRuntimeParams() {
  return Widget.storage.get(RUNTIME_KEY) || { baseUrl: DEFAULT_BASE_URL, cfCookie: "", userAgent: "" };
}

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function safePage(page) {
  const value = Number(page || 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function attr(html, name) {
  const re = new RegExp("\\b" + escapeRegExp(name) + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function imgAttr(html, name) {
  const re = new RegExp("<img\\b[^>]*\\b" + escapeRegExp(name) + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function firstImage(html) {
  return imgAttr(html, "data-src") ||
    imgAttr(html, "data-lazy-src") ||
    imgAttr(html, "data-original") ||
    imgAttr(html, "src");
}

function firstByRe(value, re, group = 1) {
  const match = String(value || "").match(re);
  return match ? decodeHtml(match[group] || "") : "";
}

function tagById(html, id) {
  if (!id) return "";
  const re = new RegExp("<[^>]+\\bid\\s*=\\s*([\"'])" + escapeRegExp(id) + "\\1[^>]*>", "i");
  const match = String(html || "").match(re);
  return match ? match[0] : "";
}

function cleanText(value) {
  return decodeHtml(stripTags(value)).replace(/\s+/g, " ").trim();
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    hellip: "...",
    rarr: "->",
    laquo: "<<",
    raquo: ">>",
  };
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name] !== undefined ? named[name] : all);
}

function normalizeEscapedText(value) {
  return decodeHtml(String(value || ""))
    .replace(/\\\//g, "/")
    .replace(/\\u002f/gi, "/")
    .replace(/\\u003a/gi, ":")
    .replace(/\\u003f/gi, "?")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=")
    .replace(/&amp;/g, "&")
    .replace(/%3A/gi, ":")
    .replace(/%2F/gi, "/")
    .replace(/%3F/gi, "?")
    .replace(/%26/gi, "&")
    .replace(/%3D/gi, "=");
}

function decodeBase64(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let buffer = 0;
  let bits = 0;
  let bytes = "";
  const value = String(input || "").replace(/\s+/g, "");
  for (let i = 0; i < value.length; i++) {
    const ch = value.charAt(i);
    if (ch === "=") break;
    const index = chars.indexOf(ch);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes += String.fromCharCode((buffer >> bits) & 255);
    }
  }
  try {
    let escaped = "";
    for (let i = 0; i < bytes.length; i++) {
      const hex = bytes.charCodeAt(i).toString(16);
      escaped += "%" + (hex.length === 1 ? "0" + hex : hex);
    }
    return decodeURIComponent(escaped);
  } catch (error) {
    return bytes;
  }
}

function reverseString(value) {
  return String(value || "").split("").reverse().join("");
}

function stableId(text) {
  return String(text || "").toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "javguru-item";
}

function isPreviewUrl(url) {
  const value = String(url || "").toLowerCase();
  return /(?:preview|sample|trailer|teaser|promo|\/pv\/|freepv|\.jpg|\.jpeg|\.png|\.webp|\.gif)(?:[?#]|$|\/)/i.test(value);
}

function isPlayableCandidate(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:")) return false;
  if (/\.(?:jpg|jpeg|png|webp|gif|svg|css|js|ico)(?:[?#]|$)/i.test(value)) return false;
  if (/\/(?:ads?|banner|analytics|captcha|cdn-cgi)\b/i.test(value)) return false;
  return /\.(?:m3u8|mp4|webm)(?:[?#]|$)/i.test(value) ||
    /\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|player|embed|source|file)(?:[\/?#]|$)/i.test(value);
}

function uniqueCandidates(candidates) {
  const seen = {};
  const out = [];
  for (const candidate of candidates || []) {
    const url = String((candidate && candidate.url) || "").split("#")[0];
    if (!url || seen[url]) continue;
    seen[url] = true;
    out.push({ url, source: candidate.source || "JavGuru" });
  }
  return out;
}

function unique(list) {
  const seen = {};
  const out = [];
  for (const item of list || []) {
    const key = String(item || "");
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }
  return out;
}

function mediaScore(url) {
  const value = String(url || "");
  let score = 0;
  if (/\.m3u8(?:[?#]|$)/i.test(value)) score += 5000000;
  if (/\.mp4(?:[?#]|$)/i.test(value)) score += 500000;
  if (/\/(?:hls|playlist|master)\b/i.test(value)) score += 300000;
  score += resolutionScore(value) * 1000;
  if (/preview|sample|trailer|teaser|promo/i.test(value)) score -= 10000000;
  return score;
}

function resolutionScore(value) {
  const text = String(value || "");
  const fromName = Number(firstByRe(text, /(?:^|[^\d])([1-9]\d{2,3})p(?:[^\d]|$)/i));
  if (Number.isFinite(fromName) && fromName > 0) return fromName;
  const fromResolution = Number(firstByRe(text, /RESOLUTION=\d+x(\d+)/i));
  return Number.isFinite(fromResolution) ? fromResolution : 0;
}

function playbackName(url, index) {
  const res = resolutionScore(url);
  if (res) return `${res}P 正片`;
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return index === 0 ? "HLS 正片" : `HLS 备用 ${index + 1}`;
  if (/\.mp4(?:[?#]|$)/i.test(url)) return index === 0 ? "MP4 正片" : `MP4 备用 ${index + 1}`;
  return index === 0 ? "在线播放" : `播放源 ${index + 1}`;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
