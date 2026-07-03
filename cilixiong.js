WidgetMetadata = {
  id: "forward.cilixiong",
  title: "磁力熊",
  version: "1.0.2",
  requiredVersion: "0.0.1",
  description: "磁力熊电影、剧集、榜单、搜索、详情与授权播放源模块",
  author: "Forward",
  site: "https://www.cilixiong.org/",
  detailCacheDuration: 60,
  globalParams: [
    inputParam("baseUrl", "站点地址", "https://www.cilixiong.org", [["磁力熊", "https://www.cilixiong.org"]]),
    inputParam("playApiBase", "备用授权播放API", "", [["可选；站内解析失败时使用", "https://play.example.com"]]),
    inputParam("playApiToken", "播放API Token", "", [["Bearer Token，可留空", ""]]),
    enumParam("verifyAudio", "过滤无声源", "1", [["是", "1"], ["否", "0"]]),
  ],
  modules: [
    {
      id: "loadHome",
      title: "首页最新",
      functionName: "loadHome",
      cacheDuration: 900,
      requiresWebView: false,
      params: [pageParam()],
    },
    {
      id: "loadList",
      title: "电影剧集",
      functionName: "loadList",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        enumParam("contentType", "类型", "movie", [["电影", "movie"], ["剧集", "drama"]]),
        genreParam(),
        areaParam(),
        constParam("peopleId", "演员ID", ""),
        pageParam(),
      ],
    },
    {
      id: "loadRankList",
      title: "高分榜单",
      functionName: "loadRankList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [rankPathParam(), pageParam()],
    },
    {
      id: "loadResource",
      title: "播放源",
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

const DEFAULT_BASE_URL = "https://www.cilixiong.org";
const RUNTIME_KEY = "cilixiong.runtimeParams";
const SEARCH_CACHE_PREFIX = "cilixiong.search.";
const PROVIDER_ID = "cilixiong";
const PLAYER_TYPE = "ijk";

const GENRE_CODE_BY_NAME = {
  "剧情": "1",
  "喜剧": "2",
  "惊悚": "3",
  "动作": "4",
  "爱情": "5",
  "犯罪": "6",
  "恐怖": "7",
  "冒险": "8",
  "悬疑": "9",
  "科幻": "10",
  "家庭": "11",
  "奇幻": "12",
  "动画": "13",
  "战争": "14",
  "历史": "15",
  "传记": "16",
  "音乐": "17",
  "歌舞": "18",
  "运动": "19",
  "西部": "20",
  "灾难": "21",
  "古装": "22",
  "情色": "23",
  "同性": "24",
  "儿童": "25",
  "纪录片": "26",
};

async function loadHome(params = {}) {
  try {
    const runtime = rememberRuntimeParams(params);
    const html = await fetchPage(runtime.baseUrl + "/", runtime);
    return parseVideoList(html, runtime.baseUrl);
  } catch (error) {
    console.error("[cilixiong][loadHome] 失败:", error.message || error);
    throw error;
  }
}

async function loadList(params = {}) {
  try {
    const runtime = rememberRuntimeParams(params);
    const actorKeyword = decodePeopleLink(params.peopleId);
    if (actorKeyword) return await search({ keyword: actorKeyword, page: params.page || 1 });
    const route = listRoute(params, safePage(params.page));
    const html = await fetchPage(runtime.baseUrl + route, runtime);
    return parseVideoList(html, runtime.baseUrl);
  } catch (error) {
    console.error("[cilixiong][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function loadRankList(params = {}) {
  try {
    const runtime = rememberRuntimeParams(params);
    const route = rankRoute(params.rankPath || params.category, safePage(params.page));
    const html = await fetchPage(runtime.baseUrl + route, runtime);
    return parseVideoList(html, runtime.baseUrl);
  } catch (error) {
    console.error("[cilixiong][loadRankList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const runtime = rememberRuntimeParams(params);
    const page = safePage(params.page);

    if (page <= 1) {
      const html = await postSearch(keyword, runtime);
      rememberSearchId(runtime, keyword, parseSearchId(html));
      return parseVideoList(html, runtime.baseUrl);
    }

    let searchId = cachedSearchId(runtime, keyword);
    if (!searchId) {
      const firstPage = await postSearch(keyword, runtime);
      searchId = parseSearchId(firstPage);
      rememberSearchId(runtime, keyword, searchId);
      if (!searchId) return [];
    }

    const route = "/e/search/result/index.php?page=" + encodeURIComponent(String(page - 1)) + "&searchid=" + encodeURIComponent(String(searchId));
    const html = await fetchPage(runtime.baseUrl + route, runtime);
    return parseVideoList(html, runtime.baseUrl);
  } catch (error) {
    console.error("[cilixiong][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const runtime = getRuntimeParams();
    const path = normalizeDetailPath(link, runtime.baseUrl);
    if (!isDetailPath(path)) return null;
    const html = await fetchPage(runtime.baseUrl + path, runtime);
    const item = parseVideoDetail(html, path, runtime.baseUrl);
    return await enrichDetailWithPlayableSource(item, runtime, html, path);
  } catch (error) {
    console.error("[cilixiong][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const runtime = resourceRuntimeParams(params);
    const direct = directPlayableParam(params);
    if (direct) return [directResourceItem(direct, params)];

    const payload = resourcePayload(params, runtime);
    const path = normalizeDetailPath(payload.detailUrl || detailPathFromItemId(payload.itemId), runtime.baseUrl);
    if (isDetailPath(path)) {
      const html = await fetchPage(runtime.baseUrl + path, runtime);
      const siteSources = await collectPagePlayableSources(html, path, runtime);
      if (siteSources.length) return siteSources;
    }
    if (!runtime.playApiBase) return [];
    return await requestAuthorizedResources(payload, runtime);
  } catch (error) {
    console.error("[cilixiong][loadResource] 失败:", error.message || error);
    return [];
  }
}

function parseVideoList(html, baseUrl) {
  const items = [];
  const seen = {};
  const source = String(html || "");
  const anchorRe = /<a\b[^>]*href=(["'])([^"']*\/(?:movie|drama)\/\d+\.html)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(source))) {
    const path = normalizeDetailPath(match[2], baseUrl);
    if (!isDetailPath(path) || seen[path]) continue;
    const item = parseListAnchor(path, match[3], baseUrl);
    if (!item || !item.title) continue;
    seen[path] = true;
    items.push(item);
  }
  return items;
}

function parseListAnchor(path, anchorHtml, baseUrl) {
  const mediaType = mediaTypeFromPath(path);
  const poster = absolutize(
    firstByRe(anchorHtml, /background-image\s*:\s*url\((["']?)(.*?)\1\)/i, 2) ||
    firstImage(anchorHtml),
    baseUrl
  );
  const title = cleanText(
    firstByRe(anchorHtml, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i, 1) ||
    firstByRe(anchorHtml, /<img\b[^>]*alt=(["'])(.*?)\1/i, 2)
  );
  const rankText = cleanText(firstByRe(anchorHtml, /<span\b[^>]*class=(["'])[^"']*\brank\b[^"']*\1[^>]*>([\s\S]*?)<\/span>/i, 2));
  const yearText = cleanText(firstByRe(anchorHtml, /<li\b[^>]*class=(["'])[^"']*\bsmall\b[^"']*\1[^>]*>([\s\S]*?)<\/li>/i, 2));
  const year = firstByRe(yearText || cleanText(anchorHtml), /((?:19|20)\d{2})/, 1);

  return {
    id: detailIdFromPath(path),
    type: "url",
    mediaType,
    title,
    posterPath: poster,
    backdropPath: poster,
    rating: numberOrUndefined(rankText),
    releaseDate: year || undefined,
    description: listDescription(rankText, year),
    link: encodeDetailLink(path),
    playerType: "system",
  };
}

function parseVideoDetail(html, path, baseUrl) {
  const mediaType = mediaTypeFromPath(path);
  const title = cleanText(
    firstByRe(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i, 1) ||
    stripSiteTitle(metaContent(html, "og:title")) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i, 1)
  );
  const poster = absolutize(
    metaContent(html, "og:image") ||
    firstByRe(html, /<img\b[^>]*class=(["'])[^"']*\brounded-2\b[^"']*\1[^>]*src=(["'])(.*?)\2/i, 3) ||
    firstImage(firstByRe(html, /<div\b[^>]*class=(["'])[^"']*\bp-3\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2)),
    baseUrl
  );
  const rating = numberOrUndefined(
    cleanText(firstByRe(html, /<span\b[^>]*class=(["'])[^"']*\bdb_rank\b[^"']*\1[^>]*>([\s\S]*?)<\/span>/i, 2)) ||
    detailField(html, "豆瓣评分")
  );
  const alias = detailField(html, "又名");
  const releaseRaw = detailField(html, "上映日期");
  const releaseDate = firstByRe(releaseRaw, /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/, 1) || firstByRe(releaseRaw, /((?:19|20)\d{2})/, 1);
  const genreRaw = detailField(html, "类型");
  const region = detailField(html, "上映地区");
  const actors = detailField(html, "主演");
  const durationRaw = detailField(html, "片长");
  const updateText = detailField(html, "最后更新于");
  const plot = htmlToText(firstByRe(html, /<div\b[^>]*class=(["'])[^"']*\bmv_card_box\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2)) || cleanText(metaContent(html, "og:description"));
  const resources = parseResourceTitles(html);
  const genres = parseGenreItems(genreRaw, mediaType);
  const duration = durationMinutes(durationRaw);
  const description = detailDescription({
    alias,
    releaseRaw,
    region,
    actors,
    durationRaw,
    updateText,
    plot,
    resources,
  });

  return {
    id: detailIdFromPath(path),
    type: "url",
    mediaType,
    title,
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    rating,
    releaseDate,
    duration,
    durationText: durationRaw || undefined,
    description,
    genreItems: genres,
    link: encodeDetailLink(path),
    playerType: "system",
  };
}

function toResourceItems(data, runtime) {
  const sources = sourceList(data);
  const items = [];
  for (let index = 0; index < sources.length; index++) {
    const source = normalizeSource(sources[index]);
    const url = String(source.url || source.src || source.file || "").trim();
    if (!isHttpPlayableUrl(url)) continue;
    if (!sourceHasAudio(source, runtime.verifyAudio)) continue;
    const score = sourceQualityScore(source, url);
    const headers = sourceHeaders(source);
    items.push({
      name: sourceName(source, score, index),
      description: sourceDescription(source, url),
      url,
      playerType: PLAYER_TYPE,
      customHeaders: headers,
      _score: score,
      _order: index,
    });
  }

  items.sort(function (a, b) {
    if (b._score !== a._score) return b._score - a._score;
    return a._order - b._order;
  });

  return items.map(function (item) {
    delete item._score;
    delete item._order;
    return item;
  });
}

function sourceList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.sources)) return data.sources;
  if (data.source) return [data.source];
  if (data.result && Array.isArray(data.result.sources)) return data.result.sources;
  if (data.result && data.result.source) return [data.result.source];
  if (data.data && Array.isArray(data.data.sources)) return data.data.sources;
  if (data.data && data.data.source) return [data.data.source];
  return [];
}

function resourcePayload(params, runtime) {
  const inferredPath = detailPathFromItemId(params.itemId || params.videoId || params.id);
  const path = normalizeDetailPath(params.detailUrl || params.link || params.detailLink || params.href || params.url || inferredPath, runtime.baseUrl);
  const detailUrl = String(params.detailUrl || "").trim() || (isDetailPath(path) ? runtime.baseUrl + path : "");
  const mediaType = params.mediaType || (isDetailPath(path) ? mediaTypeFromPath(path) : "movie");
  const title = String(params.title || params.name || "").trim();
  return {
    provider: PROVIDER_ID,
    itemId: String(params.itemId || params.videoId || params.id || detailIdFromPath(path) || stableId(detailUrl || title)).trim(),
    detailUrl,
    title,
    mediaType,
    year: String(params.year || yearFromDate(params.releaseDate) || firstByRe(title, /((?:19|20)\d{2})/, 1) || "").trim(),
    posterPath: String(params.posterPath || params.cover || "").trim(),
  };
}

async function enrichDetailWithPlayableSource(item, runtime, html, path) {
  if (!item) return item;
  try {
    let sources = await collectPagePlayableSources(html, path, runtime);
    if (!sources.length && runtime.playApiBase) {
      sources = await requestAuthorizedResources(resourcePayload(item, runtime), runtime);
    }
    const first = sources[0];
    if (!first) return item;
    item.videoUrl = first.url;
    item.playerType = first.playerType || PLAYER_TYPE;
    item.customHeaders = first.customHeaders || {};
    item.trailers = [{ coverUrl: item.posterPath || item.backdropPath || "", url: first.url }];
  } catch (error) {
    console.log("[cilixiong][loadDetail] 播放源加载失败:", error.message || error);
  }
  return item;
}

async function collectPagePlayableSources(html, path, runtime) {
  const detailUrl = runtime.baseUrl + path;
  const candidates = [];
  for (const source of extractPlayableSourcesFromHtml(html, detailUrl, runtime.baseUrl)) {
    candidates.push(source);
  }
  const frames = extractPlayerFrameUrls(html, runtime.baseUrl);
  for (let i = 0; i < frames.length; i++) {
    try {
      const frameHtml = await fetchPage(frames[i], runtime, detailUrl);
      for (const source of extractPlayableSourcesFromHtml(frameHtml, frames[i], runtime.baseUrl)) {
        candidates.push(source);
      }
    } catch (error) {
      console.log("[cilixiong][collectPagePlayableSources] 播放 iframe 加载失败:", error.message || error);
    }
  }
  const resolved = [];
  for (const source of uniqueSourceCandidates(candidates)) {
    const expanded = await resolveHlsSource(source, runtime);
    for (const item of expanded) resolved.push(item);
  }
  return toResourceItems(resolved, runtime);
}

function extractPlayerFrameUrls(html, baseUrl) {
  const urls = [];
  const re = /<iframe\b[^>]*src=(["'])(.*?)\1/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const url = absolutize(match[2], baseUrl);
    if (/\/e\/extend\/jx\.php\b/i.test(url) || /(?:player|embed|play)/i.test(url)) urls.push(url);
  }
  return unique(urls);
}

function extractPlayableSourcesFromHtml(html, referer, baseUrl) {
  const sources = [];
  const text = String(html || "");
  collectMediaMatches(sources, text, /\b(?:vurl|videoUrl|video_url|playUrl|play_url|hls|m3u8|src|file|url)\s*=\s*(["'])(https?:\/\/[^"']+\.(?:m3u8|mp4)(?:\?[^"']*)?)\1/gi, referer, baseUrl, 2);
  collectMediaMatches(sources, text, /\b(?:url|src|file)\s*:\s*(["'])(https?:\/\/[^"']+\.(?:m3u8|mp4)(?:\?[^"']*)?)\1/gi, referer, baseUrl, 2);
  collectMediaMatches(sources, text, /(https?:\/\/[^"'<>\\\s]+\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?)/gi, referer, baseUrl, 1);
  return uniqueSourceCandidates(sources);
}

function collectMediaMatches(sources, text, re, referer, baseUrl, groupIndex) {
  let match;
  while ((match = re.exec(String(text || "")))) {
    const url = absolutize(match[groupIndex], baseUrl);
    if (!isHttpPlayableUrl(url)) continue;
    sources.push({
      url,
      name: sourceNameFromUrl(url),
      source: "磁力熊",
      referer,
      hasAudio: true,
    });
  }
}

async function resolveHlsSource(source, runtime) {
  if (!/\.m3u8(?:[?#]|$)/i.test(source.url || "")) return [source];
  try {
    const res = await Widget.http.get(source.url, { headers: mediaHeaders(source.referer || runtime.baseUrl + "/") });
    const playlist = String((res && res.data) || "");
    const variants = parseHlsVariants(playlist, source.url);
    if (!variants.length) return [source];
    if (hasSeparateAudioRendition(playlist)) {
      const best = bestVariant(variants);
      return [copySource(source, {
        name: best && best.resolution ? best.resolution + "P HLS Master" : "HLS Master",
        height: best && best.resolution,
        bandwidth: best && best.bandwidth,
      })];
    }
    return [copySource(source, bestVariant(variants)), source];
  } catch (error) {
    console.log("[cilixiong][resolveHlsSource] HLS 清晰度解析失败:", error.message || error);
    return [source];
  }
}

function parseHlsVariants(playlist, playlistUrl) {
  const lines = String(playlist || "").split(/\r?\n/);
  const variants = [];
  let pending = null;
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || "").trim();
    if (!line) continue;
    if (/^#EXT-X-STREAM-INF:/i.test(line)) {
      pending = {
        bandwidth: Number(firstByRe(line, /BANDWIDTH=(\d+)/i, 1) || 0),
        resolution: Number(firstByRe(line, /RESOLUTION=\d+x(\d+)/i, 1) || firstByRe(line, /RESOLUTION=(\d+)x\d+/i, 1) || 0),
        codecs: attributeValue(line, "CODECS"),
        audio: attributeValue(line, "AUDIO"),
      };
      continue;
    }
    if (pending && line.charAt(0) !== "#") {
      variants.push({
        url: absolutizeUrl(line, playlistUrl),
        name: (pending.resolution || 0) + "P HLS",
        height: pending.resolution,
        bandwidth: pending.bandwidth,
        hasAudio: hlsVariantKeepsAudio(pending),
      });
      pending = null;
    }
  }
  return variants.filter((item) => isHttpPlayableUrl(item.url));
}

function bestVariant(variants) {
  return (variants || []).slice().sort(function (a, b) {
    return (b.height || 0) - (a.height || 0) || (b.bandwidth || 0) - (a.bandwidth || 0);
  })[0] || null;
}

function hasSeparateAudioRendition(text) {
  return /#EXT-X-MEDIA:[^\n\r]*TYPE=AUDIO/i.test(text || "") && /#EXT-X-STREAM-INF:[^\n\r]*AUDIO=/i.test(text || "");
}

function hlsVariantKeepsAudio(variant) {
  const codecs = String((variant && variant.codecs) || "");
  if (!codecs) return true;
  return /mp4a|aac|ac-3|ec-3|opus/i.test(codecs);
}

function copySource(source, overrides) {
  const result = {};
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
  }
  for (const key in (overrides || {})) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) result[key] = overrides[key];
  }
  return result;
}

function uniqueSourceCandidates(candidates) {
  const seen = {};
  const result = [];
  for (const item of candidates || []) {
    const url = String((item && item.url) || "").trim();
    if (!url || seen[url]) continue;
    seen[url] = true;
    result.push(item);
  }
  return result;
}

async function requestAuthorizedResources(payload, runtime) {
  const headers = buildHeaders(runtime, payload.detailUrl || runtime.baseUrl + "/");
  headers["Content-Type"] = "application/json";
  if (runtime.playApiToken) headers.Authorization = "Bearer " + runtime.playApiToken;
  const res = await Widget.http.post(resolveEndpoint(runtime.playApiBase), payload, { headers });
  return toResourceItems((res && res.data) || {}, runtime);
}

function fetchPage(url, runtime, referer) {
  return Widget.http.get(url, { headers: buildHeaders(runtime, referer) }).then(function (res) {
    const html = String((res && res.data) || "");
    if (!html) throw new Error("空响应: " + url);
    return html;
  });
}

function postSearch(keyword, runtime) {
  const body = formEncode({
    classid: "1,2",
    show: "title",
    tempid: "1",
    keyboard: keyword,
  });
  const headers = buildHeaders(runtime, runtime.baseUrl + "/");
  headers["Content-Type"] = "application/x-www-form-urlencoded";
  return Widget.http.post(runtime.baseUrl + "/e/search/index.php", body, { headers }).then(function (res) {
    return String((res && res.data) || "");
  });
}

function listRoute(params, page) {
  const genreRoute = decodeGenreLink(params.genreId || "");
  const contentType = genreRoute.mediaType || normalizeContentType(params.contentType || params.type);
  const classId = contentType === "tv" ? "2" : "1";
  const genre = genreRoute.code || normalizeCode(params.genreId, "0");
  const area = normalizeCode(params.areaId || params.regionId, "0");
  const hasFilter = genre !== "0" || area !== "0";

  if (!hasFilter) {
    const base = contentType === "tv" ? "/drama/" : "/movie/";
    return page <= 1 ? base : base + "index_" + page + ".html";
  }

  return "/" + classId + "-" + genre + "-" + area + "-" + Math.max(page - 1, 0) + ".html";
}

function rankRoute(value, page) {
  let path = String(value || "/top250/").trim();
  if (!path) path = "/top250/";
  path = path.replace(/^https?:\/\/[^/]+/i, "");
  if (path.charAt(0) !== "/") path = "/" + path;
  if (page <= 1) return path;
  if (/\/$/.test(path)) return path + "index_" + page + ".html";
  return path.replace(/\.html(?:[?#].*)?$/i, "") + "/index_" + page + ".html";
}

function parseSearchId(html) {
  return firstByRe(String(html || "").replace(/&amp;/g, "&"), /[?&]searchid=([^"'&<>\s]+)/i, 1);
}

function rememberSearchId(runtime, keyword, searchId) {
  if (!searchId || !Widget.storage) return;
  Widget.storage.set(searchCacheKey(runtime, keyword), String(searchId));
}

function cachedSearchId(runtime, keyword) {
  if (!Widget.storage) return "";
  return String(Widget.storage.get(searchCacheKey(runtime, keyword)) || "");
}

function searchCacheKey(runtime, keyword) {
  return SEARCH_CACHE_PREFIX + runtime.baseUrl + "." + String(keyword || "").trim();
}

function parseGenreItems(raw, mediaType) {
  const text = cleanText(raw).replace(/^类型[:：]?/, "");
  const names = unique(text.split(/[|,，、/\s]+/).map(cleanText).filter(Boolean));
  return names.map(function (name) {
    const code = GENRE_CODE_BY_NAME[name];
    if (!code) return null;
    return { id: encodeGenreLink(mediaType, code, name), title: name };
  }).filter(Boolean);
}

function parseResourceTitles(html) {
  const titles = [];
  const re = /<a\b[^>]*href=(["'])magnet:[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const title = cleanText(match[2]);
    if (title) titles.push(title);
  }
  return unique(titles);
}

function detailDescription(parts) {
  const lines = [];
  if (parts.alias) lines.push("又名: " + parts.alias);
  if (parts.releaseRaw) lines.push("上映日期: " + parts.releaseRaw);
  if (parts.region) lines.push("上映地区: " + parts.region);
  if (parts.durationRaw) lines.push("片长: " + parts.durationRaw);
  if (parts.actors) lines.push("主演: " + parts.actors);
  if (parts.updateText) lines.push("最后更新: " + parts.updateText);
  if (parts.plot) lines.push("", parts.plot);
  if (parts.resources && parts.resources.length) {
    lines.push("", "资源标题:");
    parts.resources.slice(0, 8).forEach(function (title, index) {
      lines.push(String(index + 1) + ". " + title);
    });
  }
  return lines.join("\n").trim();
}

function detailField(html, label) {
  const safe = escapeRegExp(label);
  const text = firstByRe(html, new RegExp("<p\\b[^>]*>\\s*" + safe + "\\s*[:：]\\s*([\\s\\S]*?)<\\/p>", "i"), 1);
  return cleanText(text);
}

function listDescription(rankText, year) {
  const lines = [];
  if (rankText) lines.push("豆瓣评分: " + rankText);
  if (year) lines.push("年份: " + year);
  return lines.join("\n");
}

function buildHeaders(runtime, referer) {
  return {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: referer || runtime.baseUrl + "/",
  };
}

function resourceRuntimeParams(params) {
  const saved = getRuntimeParams();
  const runtime = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
    playApiBase: normalizeApiBase(params.playApiBase || saved.playApiBase),
    playApiToken: String(params.playApiToken || saved.playApiToken || ""),
    verifyAudio: normalizeBool(params.verifyAudio === undefined ? saved.verifyAudio : params.verifyAudio, true),
  };
  if (Widget.storage) Widget.storage.set(RUNTIME_KEY, runtime);
  return runtime;
}

function rememberRuntimeParams(params) {
  const saved = getRuntimeParams();
  const runtime = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
    playApiBase: normalizeApiBase(params.playApiBase || saved.playApiBase),
    playApiToken: String(params.playApiToken || saved.playApiToken || ""),
    verifyAudio: normalizeBool(params.verifyAudio === undefined ? saved.verifyAudio : params.verifyAudio, true),
  };
  if (Widget.storage) Widget.storage.set(RUNTIME_KEY, runtime);
  return runtime;
}

function getRuntimeParams() {
  const saved = (Widget.storage && Widget.storage.get(RUNTIME_KEY)) || {};
  return {
    baseUrl: normalizeBaseUrl(saved.baseUrl),
    playApiBase: normalizeApiBase(saved.playApiBase),
    playApiToken: String(saved.playApiToken || ""),
    verifyAudio: normalizeBool(saved.verifyAudio, true),
  };
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveEndpoint(playApiBase) {
  return /\/resolve$/i.test(playApiBase) ? playApiBase : playApiBase + "/resolve";
}

function normalizeContentType(value) {
  const text = String(value || "").toLowerCase();
  return text === "tv" || text === "drama" || text === "series" ? "tv" : "movie";
}

function safePage(value) {
  const page = parseInt(value, 10);
  return page > 0 ? page : 1;
}

function normalizeCode(value, fallback) {
  const text = String(value || "").trim();
  if (/^\d+$/.test(text)) return text;
  return fallback || "0";
}

function normalizeBool(value, fallback) {
  if (value === undefined || value === null || value === "") return !!fallback;
  const text = String(value).toLowerCase();
  return !(text === "0" || text === "false" || text === "no" || text === "否");
}

function encodeDetailLink(path) {
  return "detail:" + normalizeDetailPath(path, DEFAULT_BASE_URL);
}

function normalizeDetailPath(value, baseUrl) {
  let text = String(value || "").trim();
  if (!text) return "";
  if (text.indexOf("detail:") === 0) text = text.slice(7);
  if (/^https?:\/\//i.test(text)) text = text.replace(/^https?:\/\/[^/]+/i, "");
  if (text.indexOf(baseUrl) === 0) text = text.slice(String(baseUrl).length);
  text = text.replace(/[?#].*$/, "");
  if (text && text.charAt(0) !== "/") text = "/" + text;
  return text;
}

function isDetailPath(path) {
  return /^\/(?:movie|drama)\/\d+\.html$/i.test(String(path || ""));
}

function mediaTypeFromPath(path) {
  return /^\/drama\//i.test(String(path || "")) ? "tv" : "movie";
}

function detailIdFromPath(path) {
  const match = String(path || "").match(/\/(movie|drama)\/(\d+)\.html/i);
  if (!match) return "";
  return (match[1].toLowerCase() === "drama" ? "tv" : "movie") + "-" + match[2];
}

function detailPathFromItemId(value) {
  const match = String(value || "").match(/^(movie|tv|drama)-(\d+)$/i);
  if (!match) return "";
  return "/" + (match[1].toLowerCase() === "movie" ? "movie" : "drama") + "/" + match[2] + ".html";
}

function encodeGenreLink(mediaType, code, title) {
  return "genre:" + normalizeContentType(mediaType) + ":" + String(code || "0") + ":" + String(title || "");
}

function decodeGenreLink(value) {
  const match = String(value || "").match(/^genre:(movie|tv|drama):(\d+)(?::.*)?$/i);
  if (!match) return { mediaType: "", code: "" };
  return { mediaType: normalizeContentType(match[1]), code: match[2] || "0" };
}

function decodePeopleLink(value) {
  const match = String(value || "").match(/^actor:(.+)$/);
  return match ? decodeURIComponentSafe(match[1]) : "";
}

function yearFromDate(value) {
  return firstByRe(String(value || ""), /((?:19|20)\d{2})/, 1);
}

function durationMinutes(value) {
  const minutes = parseInt(firstByRe(value, /(\d+)\s*分钟/, 1), 10);
  return minutes > 0 ? minutes * 60 : undefined;
}

function numberOrUndefined(value) {
  const num = parseFloat(String(value || "").replace(/[^\d.]/g, ""));
  return isFinite(num) ? num : undefined;
}

function sourceHasAudio(source, verifyAudio) {
  if (!verifyAudio) return true;
  const audioMarkers = [source.hasAudio, source.has_audio, source.audio, source.withAudio, source.with_audio];
  for (let i = 0; i < audioMarkers.length; i++) {
    if (audioMarkers[i] === undefined || audioMarkers[i] === null || audioMarkers[i] === "") continue;
    if (audioMarkers[i] === false) return false;
    const text = String(audioMarkers[i]).toLowerCase();
    if (text === "false" || text === "0" || text === "no") return false;
  }
  const noAudioMarkers = [source.videoOnly, source.video_only, source.muted, source.noAudio, source.no_audio];
  for (let i = 0; i < noAudioMarkers.length; i++) {
    if (noAudioMarkers[i] === true) return false;
    const text = String(noAudioMarkers[i]).toLowerCase();
    if (text === "true" || text === "1" || text === "yes") return false;
  }
  const searchable = [source.url, source.src, source.file, source.name, source.label, source.quality, source.description].join(" ");
  if (/\b(?:no[-_ ]?audio|video[-_ ]?only|muted|silent)\b/i.test(searchable)) return false;
  return true;
}

function sourceQualityScore(source, url) {
  const explicit = parseInt(source.height || source.resolutionHeight || source.resolution_height, 10);
  if (explicit > 0) return explicit;
  const text = [source.quality, source.label, source.name, url].join(" ");
  const p = parseInt(firstByRe(text, /(\d{3,4})\s*p/i, 1), 10);
  if (p > 0) return p;
  if (/4k|uhd|2160/i.test(text)) return 2160;
  if (/2k|1440/i.test(text)) return 1440;
  if (/full\s*hd|1080/i.test(text)) return 1080;
  if (/hd|720/i.test(text)) return 720;
  return 0;
}

function sourceName(source, score, index) {
  const base = cleanText(source.name || source.label || source.quality);
  if (base) return base;
  return score > 0 ? score + "P" : "播放源 " + (index + 1);
}

function sourceDescription(source, url) {
  const text = cleanText(source.description || source.provider || source.type);
  if (text) return text;
  return /\.m3u8(?:[?#]|$)/i.test(url) ? "HLS" : "授权播放源";
}

function isHttpPlayableUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/^magnet:|^thunder:|^ed2k:/i.test(url)) return false;
  return true;
}

function directPlayableParam(params) {
  const keys = ["videoUrl", "src", "file", "hls", "m3u8", "playUrl", "streamUrl", "url"];
  for (let i = 0; i < keys.length; i++) {
    const url = String(params[keys[i]] || "").trim();
    if (!url || !isHttpPlayableUrl(url)) continue;
    if (isDetailPath(normalizeDetailPath(url, params.baseUrl || DEFAULT_BASE_URL))) continue;
    return url;
  }
  return "";
}

function directResourceItem(url, params) {
  return {
    name: sourceName(params, sourceQualityScore(params, url), 0),
    description: sourceDescription(params, url),
    url,
    playerType: PLAYER_TYPE,
    customHeaders: sourceHeaders(params),
  };
}

function normalizeSource(source) {
  if (typeof source === "string") return { url: source };
  return source || {};
}

function sourceHeaders(source) {
  const headers = {};
  const input = source.headers || source.customHeaders || {};
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) headers[key] = input[key];
  }
  const referer = source.referer || source.referrer;
  if (referer && !headers.Referer) headers.Referer = referer;
  const userAgent = source.userAgent || source.user_agent;
  if (userAgent && !headers["User-Agent"]) headers["User-Agent"] = userAgent;
  return headers;
}

function mediaHeaders(referer) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "*/*",
  };
  if (referer) headers.Referer = referer;
  return headers;
}

function absolutizeUrl(value, baseUrl) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.indexOf("//") === 0) return "https:" + url;
  const base = String(baseUrl || DEFAULT_BASE_URL);
  const origin = getOrigin(base) || DEFAULT_BASE_URL;
  if (url.charAt(0) === "/") return origin + url;
  return base.replace(/[#?].*$/, "").replace(/\/[^/]*$/, "/") + url;
}

function attributeValue(line, name) {
  const match = String(line || "").match(new RegExp(name + '=(?:"([^"]+)"|([^,\\s]+))', "i"));
  return match ? String(match[1] || match[2] || "") : "";
}

function sourceNameFromUrl(url) {
  const score = sourceQualityScore({}, url);
  if (score) return score + "P HLS";
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return "HLS";
  if (/\.mp4(?:[?#]|$)/i.test(url)) return "MP4";
  return "播放源";
}

function getOrigin(url) {
  return firstByRe(url, /^(https?:\/\/[^/]+)/i, 1);
}

function stableId(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return "cilixiong-" + Math.abs(hash);
}

function formEncode(object) {
  const parts = [];
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(object[key])));
    }
  }
  return parts.join("&");
}

function metaContent(html, property) {
  const safe = escapeRegExp(property);
  return decodeHtml(
    firstByRe(html, new RegExp("<meta\\b[^>]*(?:property|name)=(['\"])" + safe + "\\1[^>]*content=(['\"])(.*?)\\2", "i"), 3) ||
    firstByRe(html, new RegExp("<meta\\b[^>]*content=(['\"])(.*?)\\1[^>]*(?:property|name)=(['\"])" + safe + "\\3", "i"), 2)
  );
}

function firstImage(html) {
  return decodeHtml(firstByRe(html, /<img\b[^>]*src=(["'])(.*?)\1/i, 2));
}

function firstByRe(value, re, index) {
  const match = String(value || "").match(re);
  return match ? String(match[index] || "").trim() : "";
}

function htmlToText(value) {
  return cleanText(String(value || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n"));
}

function cleanText(value) {
  return decodeHtml(stripTags(value)).replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
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
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, function (_, code) {
      return String.fromCharCode(parseInt(code, 10));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) {
      return String.fromCharCode(parseInt(code, 16));
    });
}

function absolutize(url, baseUrl) {
  const text = decodeHtml(String(url || "").trim());
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (text.indexOf("//") === 0) return "https:" + text;
  const base = normalizeBaseUrl(baseUrl);
  return text.charAt(0) === "/" ? base + text : base + "/" + text;
}

function stripSiteTitle(value) {
  return cleanText(String(value || "").replace(/\s*-\s*磁力熊\s*$/i, ""));
}

function unique(list) {
  const seen = {};
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const value = String(list[i] || "").trim();
    if (!value || seen[value]) continue;
    seen[value] = true;
    result.push(value);
  }
  return result;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return String(value || "");
  }
}

function inputParam(name, title, value, placeholders) {
  const param = { name, title, type: "input", value: value || "" };
  if (placeholders) param.placeholders = optionList(placeholders);
  return param;
}

function enumParam(name, title, value, options) {
  return { name, title, type: "enumeration", value, enumOptions: optionList(options) };
}

function constParam(name, title, value) {
  return { name, title, type: "constant", value };
}

function pageParam() {
  return { name: "page", title: "页码", type: "page" };
}

function optionList(list) {
  return (list || []).map(function (item) {
    return { title: item[0], value: item[1] };
  });
}

function genreParam() {
  return enumParam("genreId", "类型", "0", [
    ["全部", "0"], ["剧情", "1"], ["喜剧", "2"], ["惊悚", "3"], ["动作", "4"], ["爱情", "5"], ["犯罪", "6"],
    ["恐怖", "7"], ["冒险", "8"], ["悬疑", "9"], ["科幻", "10"], ["家庭", "11"], ["奇幻", "12"], ["动画", "13"],
    ["战争", "14"], ["历史", "15"], ["传记", "16"], ["音乐", "17"], ["歌舞", "18"], ["运动", "19"], ["西部", "20"],
    ["灾难", "21"], ["古装", "22"], ["情色", "23"], ["同性", "24"], ["儿童", "25"], ["纪录片", "26"],
  ]);
}

function areaParam() {
  return enumParam("areaId", "地区", "0", [
    ["全部", "0"], ["大陆", "1"], ["香港", "2"], ["台湾", "3"], ["美国", "4"], ["日本", "5"], ["韩国", "6"],
    ["英国", "7"], ["法国", "8"], ["德国", "9"], ["印度", "10"], ["泰国", "11"], ["丹麦", "12"], ["瑞典", "13"],
    ["巴西", "14"], ["加拿大", "15"], ["俄罗斯", "16"], ["意大利", "17"], ["比利时", "18"], ["爱尔兰", "19"],
    ["西班牙", "20"], ["澳大利亚", "21"], ["波兰", "22"], ["土耳其", "23"], ["越南", "24"],
  ]);
}

function rankPathParam() {
  return enumParam("rankPath", "榜单", "/top250/", [
    ["豆瓣电影Top250", "/top250/"], ["IMDB Top250", "/s/imdbtop250/"], ["高分悬疑片", "/s/suspense/"],
    ["高分喜剧片", "/s/comedy/"], ["高分传记片", "/s/biopic/"], ["高分爱情片", "/s/romance/"],
    ["高分犯罪片", "/s/crime/"], ["高分恐怖片", "/s/horror/"], ["高分冒险片", "/s/adventure/"],
    ["高分武侠片", "/s/martial/"], ["高分奇幻片", "/s/fantasy/"], ["高分历史片", "/s/history/"],
    ["高分战争片", "/s/war/"], ["高分歌舞片", "/s/musical/"], ["高分灾难片", "/s/disaster/"],
    ["高分情色片", "/s/erotic/"], ["高分西部片", "/s/west/"], ["高分音乐片", "/s/music/"],
    ["高分科幻片", "/s/sci-fi/"], ["高分动作片", "/s/action/"], ["高分动画片", "/s/animation/"],
    ["高分纪录片", "/s/documentary/"], ["冷门佳片", "/s/unpopular/"],
  ]);
}
