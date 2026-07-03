WidgetMetadata = {
  id: "forward.fdzys",
  title: "饭搭子影视",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "饭搭子影视分类、搜索、详情与播放源模块",
  author: "Forward",
  site: "https://fdzys.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://fdzys.com",
      placeholders: [{ title: "饭搭子影视", value: "https://fdzys.com" }],
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
          value: "movie/all",
          enumOptions: [
            { title: "电影", value: "movie/all" },
            { title: "电视剧", value: "tv/all" },
            { title: "动漫", value: "dongman/all" },
            { title: "综艺", value: "zongyi/all" },
            { title: "体育", value: "tiyu/all" },
            { title: "短剧", value: "duanju/all" },
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadResource",
      title: "饭搭子播放源",
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

const DEFAULT_BASE_URL = "https://fdzys.com";
const RUNTIME_KEY = "fdzys.runtimeParams";
const PLAYER_TYPE = "ijk";
const CATEGORY_PREFIX_RE = /^\/?(movie|tv|dongman|zongyi|tiyu|duanju)\//i;

async function loadList(params = {}) {
  try {
    const runtime = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const peopleKeyword = decodePeopleId(params.peopleId);
    if (peopleKeyword) return await search({ baseUrl: runtime.baseUrl, keyword: peopleKeyword, page });

    const route = routedCategory(params.genreId) || routedCategory(params.category) || "movie/all";
    const html = await fetchPage(pageUrl(runtime.baseUrl, route), runtime, runtime.baseUrl + "/", pageQuery(page));
    return parseVideoList(html, runtime.baseUrl);
  } catch (error) {
    console.error("[fdzys][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const runtime = rememberRuntimeParams(params);
    const route = "yu-" + encodeURIComponent(keyword) + "-xianguan-de-yingpian-shippin-zhibo";
    const html = await fetchPage(pageUrl(runtime.baseUrl, route), runtime, runtime.baseUrl + "/search", pageQuery(safePage(params.page)));
    return parseVideoList(html, runtime.baseUrl);
  } catch (error) {
    console.error("[fdzys][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const runtime = getRuntimeParams();
    const playPath = decodePlayLink(link, runtime.baseUrl);
    if (playPath) return await loadPlayableDetail(playPath, runtime);

    const path = decodeDetailLink(link, runtime.baseUrl);
    if (!path || !isDetailPath(path)) return null;
    const html = await fetchPage(runtime.baseUrl + path, runtime, runtime.baseUrl + "/");
    const item = parseVideoDetail(html, path, runtime.baseUrl);
    await enrichWithFirstPlayable(item, runtime);
    return item;
  } catch (error) {
    console.error("[fdzys][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const saved = getRuntimeParams();
    const runtime = rememberRuntimeParams({ baseUrl: params.baseUrl || saved.baseUrl || DEFAULT_BASE_URL });
    const direct = directPlayableParam(params);
    if (direct) return [directResourceItem(direct, params)];

    const playPath = inferPlayPath(params, runtime);
    if (!playPath) return [];
    const resource = await resolvePlayResource(playPath, runtime);
    return resource ? [resource] : [];
  } catch (error) {
    console.error("[fdzys][loadResource] 失败:", error.message || error);
    return [];
  }
}

async function loadPlayableDetail(playPath, runtime) {
  const resource = await resolvePlayResource(playPath, runtime);
  if (!resource) return null;
  return {
    id: encodePlayLink(playPath),
    type: "url",
    mediaType: mediaTypeFromPath(playPath),
    title: resource.name || "播放",
    link: encodePlayLink(playPath),
    videoUrl: resource.url,
    playerType: PLAYER_TYPE,
    customHeaders: resource.customHeaders,
  };
}

async function enrichWithFirstPlayable(item, runtime) {
  if (!item || !item.episodeItems || !item.episodeItems.length) return item;
  try {
    const first = item.episodeItems[0];
    const playPath = decodePlayLink(first.link || first.id || "", runtime.baseUrl);
    if (!playPath) return item;
    const resource = await resolvePlayResource(playPath, runtime);
    if (!resource || !resource.url) return item;
    item.videoUrl = resource.url;
    item.customHeaders = resource.customHeaders;
    item.trailers = [{ coverUrl: item.posterPath, url: resource.url }];
  } catch (error) {
    console.error("[fdzys][enrichWithFirstPlayable] 首集解析失败:", error.message || error);
  }
  return item;
}

async function resolvePlayResource(playPath, runtime) {
  const path = normalizeRoute(playPath, runtime.baseUrl);
  if (!path) return null;
  const playUrl = runtime.baseUrl + path;
  const detailReferer = runtime.baseUrl + detailPathFromPlayPath(path);
  const html = await fetchPage(playUrl, runtime, detailReferer);
  const player = parsePlayerAaaa(html);
  const url = playableUrl(playerUrl(player)) || firstPlayableUrl(html);
  if (!url) return null;
  return {
    name: playbackName(player, path),
    description: "饭搭子影视",
    url,
    playerType: PLAYER_TYPE,
    customHeaders: { Referer: playUrl },
  };
}

async function fetchPage(url, params = {}, referer = "", query = {}) {
  const options = { headers: buildHeaders(params, referer) };
  const cleanQuery = compactParams(query);
  if (Object.keys(cleanQuery).length) options.params = cleanQuery;
  const res = await Widget.http.get(url, options);
  const html = String((res && res.data) || "");
  if (!html) throw new Error("空响应: " + url);
  return html;
}

function parseVideoList(html, baseUrl) {
  const items = [];
  const seen = {};
  const source = String(html || "");
  const cardRe = /<div\b[^>]*class=(["'])[^"']*\bmyui-vodbox-content\b[^"']*\1[^>]*>\s*<a\b[^>]*href=(["'])([^"']+)\2[^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
  let match;
  while ((match = cardRe.exec(source))) {
    const path = normalizeRoute(match[3], baseUrl);
    if (!isDetailPath(path) || seen[path]) continue;
    const item = parseListCard(path, match[4], baseUrl);
    if (!item || !item.title) continue;
    seen[path] = true;
    items.push(item);
  }
  if (items.length) return items;
  return parseFallbackAnchors(source, baseUrl, seen);
}

function parseFallbackAnchors(html, baseUrl, seen = {}) {
  const items = [];
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) {
    const path = normalizeRoute(match[2], baseUrl);
    if (!isDetailPath(path) || seen[path]) continue;
    const item = parseListCard(path, match[3], baseUrl);
    if (!item || !item.title || !item.posterPath) continue;
    seen[path] = true;
    items.push(item);
  }
  return items;
}

function parseListCard(path, cardHtml, baseUrl) {
  const poster = cleanImage(firstImage(cardHtml), baseUrl);
  const title = cleanText(
    firstByRe(cardHtml, /<img\b[^>]*\balt=(["'])(.*?)\1/i, 2) ||
    firstByRe(cardHtml, /<div\b[^>]*class=(["'])[^"']*\btitle\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2)
  );
  const status = cleanText(firstByRe(cardHtml, /<div\b[^>]*class=(["'])[^"']*\btag\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));
  const intro = cleanText(firstByRe(cardHtml, /<div\b[^>]*class=(["'])[^"']*\binfo-intro\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));
  const actors = cleanPrefix(cleanText(firstByRe(cardHtml, /<div\b[^>]*class=(["'])[^"']*\binfo-roles\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2)), "主演");
  const year = cleanText(firstByRe(cardHtml, /<div\b[^>]*class=(["'])[^"']*\bright\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));
  const rating = numberOrUndefined(firstByRe(cardHtml, /<div\b[^>]*class=(["'])[^"']*\bscore\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));
  const descParts = [status, actors ? "主演: " + actors : "", intro].filter(Boolean);
  return {
    id: detailIdFromPath(path),
    type: "url",
    mediaType: mediaTypeFromPath(path),
    title,
    posterPath: poster,
    backdropPath: poster,
    rating,
    releaseDate: year.match(/^(?:19|20)\d{2}$/) ? year : undefined,
    description: descParts.join("\n"),
    link: encodeDetailLink(path),
    playerType: PLAYER_TYPE,
  };
}

function parseVideoDetail(html, path, baseUrl) {
  const poster = cleanImage(
    firstImage(firstBlockByClass(html, "vod-detailll")) ||
    metaContent(html, "og:image"),
    baseUrl
  );
  const title = cleanText(
    firstByRe(html, /<h1\b[^>]*class=(["'])[^"']*\btitle\b[^"']*\1[^>]*>([\s\S]*?)<\/h1>/i, 2) ||
    stripSiteTitle(metaContent(html, "og:title")) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i, 1)
  );
  const description = cleanText(
    firstByRe(html, /<div\b[^>]*class=(["'])[^"']*\bvod-content\b[^"']*\1[^>]*>[\s\S]*?<div\b[^>]*class=(["'])[^"']*\bwrapper_more_text\b[^"']*\2[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i, 3) ||
    firstByRe(html, /<div\b[^>]*class=(["'])[^"']*\bvod-content\b[^"']*\1[^>]*>[\s\S]*?<div\b[^>]*class=(["'])[^"']*\bintro\b[^"']*\2[^>]*>([\s\S]*?)<\/div>/i, 3) ||
    metaContent(html, "description")
  );
  const rating = numberOrUndefined(firstByRe(html, /<div\b[^>]*class=(["'])[^"']*\bscore\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));
  const detailBlock = html;
  const genreItems = parseGenreItems(detailBlock, baseUrl);
  const peoples = parsePeoples(detailBlock);
  const episodeItems = parseEpisodeItems(html, baseUrl, title, poster, mediaTypeFromPath(path));
  const relatedItems = parseVideoList(html, baseUrl).filter((item) => normalizeRoute(decodeDetailLink(item.link, baseUrl), baseUrl) !== path);
  const firstEpisode = episodeItems[0] || null;

  return {
    id: detailIdFromPath(path),
    type: "url",
    mediaType: mediaTypeFromPath(path),
    title,
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    rating,
    description,
    link: encodeDetailLink(path),
    playerType: PLAYER_TYPE,
    genreItems,
    peoples,
    episodeItems,
    relatedItems,
    childItems: episodeItems,
    previewUrl: firstEpisode ? firstEpisode.link : undefined,
  };
}

function parseGenreItems(html, baseUrl) {
  const items = [];
  const seen = {};
  const re = /<a\b[^>]*class=(["'])[^"']*\btag\b[^"']*\1[^>]*href=(["'])([^"']+)\2[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const title = cleanText(match[4]);
    const route = normalizeRoute(match[3], baseUrl);
    const id = route || title;
    if (!title || seen[id + "\n" + title]) continue;
    seen[id + "\n" + title] = true;
    items.push({ id, title });
  }
  return items;
}

function parsePeoples(html) {
  const people = [];
  const seen = {};
  const director = cleanText(fieldAfterName(html, "导演"));
  for (const name of splitNames(director)) addPeople(people, seen, name, "director");
  const actors = cleanText(fieldAfterName(html, "主演"));
  for (const name of splitNames(actors)) addPeople(people, seen, name, "actor");
  return people;
}

function parseEpisodeItems(html, baseUrl, detailTitle, poster, mediaType) {
  const sourceNames = parseSourceNames(html);
  const items = [];
  const seen = {};
  const re = /<div\b[^>]*class=(["'])[^"']*\blistitem\b[^"']*\1[^>]*>\s*<a\b[^>]*href=(["'])([^"']+)\2[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const playPath = normalizeRoute(match[3], baseUrl);
    if (!isPlayPath(playPath)) continue;
    const episodeTitle = cleanText(match[4]) || "播放";
    const sid = sidFromPath(playPath) || "1";
    const sourceName = sourceNames[sid] || "";
    const displayTitle = sourceName && sid !== "1" ? sourceName + " " + episodeTitle : episodeTitle;
    const key = playPath + "\n" + displayTitle;
    if (seen[key]) continue;
    seen[key] = true;
    items.push({
      id: encodePlayLink(playPath),
      type: "url",
      mediaType,
      title: displayTitle,
      posterPath: poster,
      backdropPath: poster,
      description: [detailTitle, sourceName].filter(Boolean).join(" / "),
      link: encodePlayLink(playPath),
      playerType: PLAYER_TYPE,
    });
  }
  return items;
}

function parseSourceNames(html) {
  const names = {};
  const liRe = /<li\b([^>]*)>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
  let match;
  while ((match = liRe.exec(String(html || "")))) {
    const attrs = match[1] || "";
    if (!/\bplayer_name\b/.test(attrs)) continue;
    const sid = attrValue(attrs, "data-sid");
    const title = cleanText(match[2]);
    if (sid && title) names[sid] = title;
  }
  return names;
}

function parsePlayerAaaa(html) {
  const source = String(html || "");
  const marker = source.search(/var\s+player_aaaa\s*=/);
  if (marker < 0) return {};
  const start = source.indexOf("{", marker);
  if (start < 0) return {};
  const json = balancedObjectString(source, start);
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error("[fdzys][parsePlayerAaaa] JSON解析失败:", error.message || error);
    return {};
  }
}

function balancedObjectString(source, start) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source.charAt(i);
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return "";
}

function playerUrl(player = {}) {
  let url = String((player && player.url) || "");
  if (!url) return "";
  try {
    if (String(player.encrypt) === "1") url = safeUnescape(url);
    if (String(player.encrypt) === "2") url = safeUnescape(decodeBase64(url));
  } catch (error) {
    console.error("[fdzys][playerUrl] 解密失败:", error.message || error);
  }
  return url;
}

function firstPlayableUrl(html) {
  const value = firstByRe(html, /(https?:\\?\/\\?\/[^"'<>\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\s]*)?)/i, 1);
  return playableUrl(value ? value.replace(/\\\//g, "/") : "");
}

function inferPlayPath(params = {}, runtime = {}) {
  const keys = ["link", "playLink", "href", "id", "detailLink", "url", "videoUrl"];
  for (const key of keys) {
    const value = params[key];
    const playPath = decodePlayLink(value, runtime.baseUrl);
    if (playPath) return playPath;
  }
  for (const key of keys) {
    const detailPath = decodeDetailLink(params[key], runtime.baseUrl);
    if (detailPath && isDetailPath(detailPath)) return detailPath + "/1";
  }
  return "";
}

function directPlayableParam(params = {}) {
  const values = [params.videoUrl, params.url, params.src, params.file];
  for (const value of values) {
    const url = playableUrl(value);
    if (url) return url;
  }
  return "";
}

function directResourceItem(url, params = {}) {
  return {
    name: cleanText(params.name || params.title || "直接播放"),
    description: "饭搭子影视",
    url,
    playerType: PLAYER_TYPE,
    customHeaders: params.referer ? { Referer: params.referer } : {},
  };
}

function playbackName(player = {}, playPath = "") {
  const sid = String(player.sid || sidFromPath(playPath) || "1");
  const nid = String(player.nid || episodeNumberFromPath(playPath) || "");
  if (nid) return "线路" + sid + " 第" + nid + "集";
  return "线路" + sid;
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const runtime = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl || DEFAULT_BASE_URL),
  };
  try {
    Widget.storage.set(RUNTIME_KEY, runtime);
  } catch (error) {}
  return runtime;
}

function getRuntimeParams() {
  try {
    const saved = Widget.storage.get(RUNTIME_KEY);
    if (saved && saved.baseUrl) return { baseUrl: normalizeBaseUrl(saved.baseUrl) };
  } catch (error) {}
  return { baseUrl: DEFAULT_BASE_URL };
}

function buildHeaders(params = {}, referer = "") {
  const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (referer) headers.Referer = referer;
  return headers;
}

function pageQuery(page) {
  return page > 1 ? { page } : {};
}

function compactParams(params = {}) {
  const out = {};
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") out[key] = params[key];
  }
  return out;
}

function safePage(value) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function normalizeBaseUrl(url) {
  const value = String(url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  return value || DEFAULT_BASE_URL;
}

function pageUrl(baseUrl, route) {
  const clean = String(route || "").replace(/^\/+/, "");
  return normalizeBaseUrl(baseUrl) + "/" + clean;
}

function routedCategory(value) {
  const route = normalizeRoute(value, DEFAULT_BASE_URL);
  if (!route || !CATEGORY_PREFIX_RE.test(route)) return "";
  return route.replace(/^\/+/, "").replace(/[?#].*$/, "");
}

function normalizeRoute(value, baseUrl) {
  let route = String(value || "").trim();
  if (!route) return "";
  route = route.replace(/^(detail|play):/i, "");
  if (/^https?:\/\//i.test(route)) route = route.replace(/^https?:\/\/[^/]+/i, "");
  if (route.indexOf("//") === 0) route = route.replace(/^\/\/[^/]+/i, "");
  if (route.charAt(0) !== "/") route = "/" + route;
  return route;
}

function decodeDetailLink(value, baseUrl) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^play:/i.test(text)) return "";
  const route = normalizeRoute(text.replace(/^detail:/i, ""), baseUrl);
  return isDetailPath(route) ? route.replace(/[?#].*$/, "") : "";
}

function encodeDetailLink(path) {
  return "detail:" + normalizeRoute(path, DEFAULT_BASE_URL).replace(/[?#].*$/, "");
}

function decodePlayLink(value, baseUrl) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^play:/i.test(text) && !isPlayPath(normalizeRoute(text, baseUrl))) return "";
  const route = normalizeRoute(text.replace(/^play:/i, ""), baseUrl);
  return isPlayPath(route) ? route : "";
}

function encodePlayLink(path) {
  return "play:" + normalizeRoute(path, DEFAULT_BASE_URL);
}

function isDetailPath(path) {
  const clean = String(path || "").replace(/[?#].*$/, "");
  if (!CATEGORY_PREFIX_RE.test(clean)) return false;
  const parts = clean.replace(/^\/+/, "").split("/");
  return parts.length === 2 && Boolean(parts[1]) && parts[1] !== "all";
}

function isPlayPath(path) {
  const clean = String(path || "").replace(/[?#].*$/, "");
  if (!CATEGORY_PREFIX_RE.test(clean)) return false;
  const parts = clean.replace(/^\/+/, "").split("/");
  return parts.length >= 3 && /^\d+$/.test(parts[2] || "");
}

function detailPathFromPlayPath(path) {
  const clean = String(path || "").replace(/[?#].*$/, "");
  const parts = clean.replace(/^\/+/, "").split("/");
  if (parts.length < 2) return "/";
  return "/" + parts[0] + "/" + parts[1];
}

function detailIdFromPath(path) {
  return String(path || "").replace(/[?#].*$/, "").replace(/^\/+/, "");
}

function mediaTypeFromPath(path) {
  return /^\/?movie\//i.test(String(path || "")) ? "movie" : "tv";
}

function sidFromPath(path) {
  return firstByRe(String(path || ""), /[?&]sid=(\d+)/i, 1) || "1";
}

function episodeNumberFromPath(path) {
  const clean = String(path || "").replace(/[?#].*$/, "");
  const parts = clean.replace(/^\/+/, "").split("/");
  return parts[2] || "";
}

function decodePeopleId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.indexOf("people:") === 0) return text.slice("people:".length);
  return text;
}

function addPeople(people, seen, name, role) {
  const title = cleanText(name);
  if (!title) return;
  const key = role + ":" + title;
  if (seen[key]) return;
  seen[key] = true;
  people.push({ id: "people:" + title, title, role });
}

function splitNames(value) {
  return String(value || "")
    .split(/[,，、/]/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function fieldAfterName(html, name) {
  const re = new RegExp("<div\\b[^>]*class=([\"'])[^\"']*\\bname\\b[^\"']*\\1[^>]*>\\s*" + escapeRegExp(name) + "\\s*:?\\s*<\\/div>([\\s\\S]*?)(?:<\\/div>|<div\\b)", "i");
  return firstByRe(html, re, 2);
}

function firstBlockByClass(html, className) {
  const re = new RegExp("<div\\b[^>]*class=([\"'])[^\"']*\\b" + escapeRegExp(className) + "\\b[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/div>", "i");
  const match = re.exec(String(html || ""));
  return match ? match[0] : "";
}

function firstImage(html) {
  const img = firstByRe(html, /<img\b[^>]*>/i, 0);
  if (!img) return "";
  return attrValue(img, "data-src") || attrValue(img, "data-original") || attrValue(img, "src");
}

function attrValue(attrs, name) {
  const re = new RegExp("\\b" + escapeRegExp(name) + "\\s*=\\s*([\"'])(.*?)\\1", "i");
  return firstByRe(attrs, re, 2);
}

function metaContent(html, name) {
  const source = String(html || "");
  return firstByRe(source, new RegExp("<meta\\b[^>]*(?:property|name)=([\"'])" + escapeRegExp(name) + "\\1[^>]*content=([\"'])(.*?)\\2", "i"), 3) ||
    firstByRe(source, new RegExp("<meta\\b[^>]*content=([\"'])(.*?)\\1[^>]*(?:property|name)=([\"'])" + escapeRegExp(name) + "\\3", "i"), 2);
}

function firstByRe(value, re, group) {
  const match = re.exec(String(value || ""));
  if (!match) return "";
  const index = group === undefined ? 1 : group;
  return match[index] || "";
}

function cleanImage(value, baseUrl) {
  const url = cleanText(value);
  if (!url || /^data:/i.test(url) || /loading\.(?:png|gif|jpg|webp)$/i.test(url)) return "";
  return absolutize(url, baseUrl);
}

function absolutize(url, baseUrl) {
  const value = String(url || "").trim().replace(/&amp;/g, "&");
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  const base = normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL);
  if (value.charAt(0) === "/") return base + value;
  return base + "/" + value.replace(/^\.?\//, "");
}

function playableUrl(value) {
  const url = String(value || "").trim().replace(/\\\//g, "/").replace(/&amp;/g, "&");
  if (!/^https?:\/\//i.test(url)) return "";
  if (!/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(url)) return "";
  return url;
}

function numberOrUndefined(value) {
  const match = String(cleanText(value)).match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : undefined;
}

function cleanPrefix(value, prefix) {
  return cleanText(value).replace(new RegExp("^" + escapeRegExp(prefix) + "\\s*[:：]?\\s*"), "");
}

function stripSiteTitle(value) {
  return cleanText(value)
    .replace(/免费在线观看[\s\S]*$/i, "")
    .replace(/_高清[\s\S]*$/i, "")
    .replace(/\s*[-_]\s*饭搭子影视[\s\S]*$/i, "");
}

function cleanText(value) {
  return decodeHtml(String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); })
    .replace(/&#(\d+);/g, function (_, num) { return String.fromCharCode(parseInt(num, 10)); })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function safeUnescape(value) {
  if (typeof unescape === "function") return unescape(value);
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function decodeBase64(value) {
  if (typeof atob === "function") return atob(value);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < String(value || "").length; i++) {
    const c = chars.indexOf(value.charAt(i));
    if (c < 0 || c === 64) continue;
    buffer = (buffer << 6) | c;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
