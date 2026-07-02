WidgetMetadata = {
  id: "forward.netflav",
  title: "Netflav",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "Netflav 列表、搜索、详情与播放源模块",
  author: "Forward",
  site: "https://netflav.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://netflav.com",
      placeholders: [{ title: "Netflav", value: "https://netflav.com" }],
    },
    {
      name: "apiBase",
      title: "API 地址",
      type: "input",
      value: "https://netflav.com/api98",
      placeholders: [{ title: "Netflav API98", value: "https://netflav.com/api98" }],
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
          value: "有碼",
          enumOptions: [
            { title: "全部", value: "" },
            { title: "有码", value: "有碼" },
            { title: "无码", value: "無碼" },
            { title: "中文字幕", value: "中文字幕" },
            { title: "高画质", value: "高畫質" },
            { title: "单体作品", value: "單體作品" },
            { title: "中出", value: "中出" },
            { title: "巨乳", value: "巨乳" },
            { title: "年度精选 2025", value: "__year:2025" },
            { title: "年度精选 2024", value: "__year:2024" },
            { title: "年度精选 2023", value: "__year:2023" },
            { title: "年度精选 2022", value: "__year:2022" },
            { title: "年度精选 2021", value: "__year:2021" },
            { title: "年度精选 2020", value: "__year:2020" },
            { title: "年度精选 2019", value: "__year:2019" },
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadRandomPlaylists",
      title: "随机片单",
      functionName: "loadRandomPlaylists",
      cacheDuration: 300,
      params: [
        {
          name: "category",
          title: "分类",
          type: "enumeration",
          value: "share:CFURVF2E",
          enumOptions: [
            { title: "随机片单 CFURVF2E", value: "share:CFURVF2E" },
            { title: "随机片单 JFAZ8PKR", value: "share:JFAZ8PKR" },
            { title: "随机片单 QP5R77LG", value: "share:QP5R77LG" },
            { title: "随机片单 CAMSWEQ1", value: "share:CAMSWEQ1" },
            { title: "随机片单 FD1CH51N", value: "share:FD1CH51N" },
            { title: "随机片单 W6RLE44S", value: "share:W6RLE44S" },
            { title: "随机片单 VPVBQKJL", value: "share:VPVBQKJL" },
            { title: "随机片单 CXD8HRXS", value: "share:CXD8HRXS" },
            { title: "随机片单 G66V5TC4", value: "share:G66V5TC4" },
            { title: "随机片单 Z6C9L3GN", value: "share:Z6C9L3GN" },
          ],
        },
        { name: "genreId", title: "片单ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadResource",
      title: "Netflav 播放源",
      functionName: "loadResource",
      type: "stream",
      params: [],
    },
  ],
  search: {
    title: "搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      {
        name: "searchType",
        title: "搜索类型",
        type: "enumeration",
        value: "title",
        enumOptions: [
          { title: "标题", value: "title" },
          { title: "演员", value: "actor" },
        ],
      },
      { name: "page", title: "页码", type: "page" },
    ],
  },
};

const DEFAULT_BASE_URL = "https://netflav.com";
const DEFAULT_API_BASE = "https://netflav.com/api98";
const VIDEO_PLAYER_TYPE = "ijk";
const DETAIL_ENDPOINTS = ["/video/v3/retrieveVideo/", "/video/v2/retrieveVideo/"];
const YEAR_SELECTION_PAGE_SIZE = 24;

async function loadList(params = {}) {
  try {
    rememberRuntimeParams(params);
    const page = safePage(params.page);
    const category = String(params.genreId || params.category || "").trim();
    if (isSpecialCategory(category)) return await loadSpecialList(params, category, page);
    const actor = String(params.peopleId || "").trim();
    const data = await apiGet("/video/v2/getVideo", params, { page, actor, category });
    return parseResultList(data).map(toVideoItem);
  } catch (error) {
    console.error("[netflav][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    rememberRuntimeParams(params);
    const data = await apiGet("/video/advanceSearchVideo", params, {
      type: params.searchType || "title",
      page: safePage(params.page),
      keyword,
    });
    return parseResultList(data).map(toVideoItem);
  } catch (error) {
    console.error("[netflav][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const shareCode = decodeShareLink(link);
    if (shareCode) return await loadSharePlaylistDetail(shareCode);
    const videoId = decodeDetailLink(link);
    if (!videoId) return null;
    const params = getRuntimeParams();
    const detail = await fetchVideoDetail(videoId, params);
    if (!detail || !detail.videoId) return null;
    const sources = await collectPlayableSources(detail, params);
    return toDetailItem(detail, params, sources);
  } catch (error) {
    console.error("[netflav][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadRandomPlaylists(params = {}) {
  try {
    rememberRuntimeParams(params);
    const page = safePage(params.page);
    const shareCode = playlistCodeFromValue(params.genreId || params.category || params.shareCode);
    if (shareCode) return await loadSharePlaylistVideos(shareCode, params, page);
    const playlists = await fetchRandomPlaylists(params);
    const firstShareCode = playlistCodeFromValue(playlists[0] && playlists[0].link);
    return firstShareCode ? await loadSharePlaylistVideos(firstShareCode, params, page) : playlists;
  } catch (error) {
    console.error("[netflav][loadRandomPlaylists] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const saved = getRuntimeParams();
    const runtimeParams = {
      baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
      apiBase: normalizeBaseUrl(params.apiBase || saved.apiBase),
    };
    const directUrl = directPlayableParam(params);
    if (directUrl) {
      const sources = await resolveHighestQualityCandidates([{ url: directUrl, referer: params.referer || runtimeParams.baseUrl + "/" }], runtimeParams);
      return toResourceItems(sources, runtimeParams, runtimeParams.baseUrl + "/");
    }
    const videoId = decodeDetailLink(params.link || params.id || params.videoId || params.url);
    if (!videoId) return [];
    const detail = await fetchVideoDetail(videoId, runtimeParams);
    const sources = await collectPlayableSources(detail, runtimeParams);
    return toResourceItems(sources, runtimeParams, detailReferer(detail && detail.videoId, runtimeParams));
  } catch (error) {
    console.error("[netflav][loadResource] 失败:", error.message || error);
    return [];
  }
}

async function fetchVideoDetail(videoId, params = {}) {
  let lastError;
  const encoded = encodeURIComponent(videoId);
  for (const endpoint of DETAIL_ENDPOINTS) {
    try {
      const data = await apiGet(endpoint + encoded, params, {});
      const detail = parseResultObject(data);
      if (detail && (detail.videoId || detail._id || detail.title || detail.code)) return detail;
    } catch (error) {
      lastError = error;
      if (!canFallbackDetail(error)) throw error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

function canFallbackDetail(error) {
  const message = String((error && error.message) || error || "");
  return /拒绝访问|Forbidden|xpon|空响应/i.test(message);
}

function toResourceItems(sources = [], runtimeParams = {}, fallbackReferer = "") {
  return (sources || []).map((source, index) => ({
    name: playbackName(source.url, index, source.resolution || source.quality),
    description: source.source || "Netflav",
    url: source.url,
    playerType: VIDEO_PLAYER_TYPE,
    customHeaders: mediaHeaders(runtimeParams, source.referer || fallbackReferer),
  }));
}

async function apiGet(path, params = {}, query = {}) {
  const apiBase = normalizeBaseUrl(params.apiBase || getRuntimeParams().apiBase || DEFAULT_API_BASE);
  const res = await Widget.http.get(apiBase + path, {
    headers: buildHeaders(params),
    params: compactParams(query),
  });
  const data = res && res.data;
  if (!data) throw new Error("空响应");
  if (data.xpon === "x1") throw new Error("Netflav API 拒绝访问");
  return data;
}

async function apiPost(path, params = {}, body = {}) {
  const apiBase = normalizeBaseUrl(params.apiBase || getRuntimeParams().apiBase || DEFAULT_API_BASE);
  const res = await Widget.http.post(apiBase + path, compactParams(body), {
    headers: buildHeaders(params),
  });
  const data = res && res.data;
  if (!data) throw new Error("空响应");
  if (data.xpon === "x1") throw new Error("Netflav API 拒绝访问");
  return data;
}

function parseResultList(data) {
  const result = parseResultObject(data);
  return (result && result.docs) || [];
}

function parseResultObject(data) {
  if (!data) return null;
  let result = data.result !== undefined ? data.result : data;
  if (typeof result === "string") result = unpackZipson(result.replace("$", "|"));
  return result;
}

function toVideoItem(video = {}) {
  const videoId = String(video.videoId || video._id || video.id || "");
  return {
    id: videoId || stableId(video.title || video.code),
    type: "url",
    title: cleanText(video.title || video.title_zh || video.title_en || video.code || videoId),
    posterPath: cleanImage(video.preview || video.preview_hp),
    previewUrl: playableUrl(video.previewVideo),
    releaseDate: dateOnly(video.videoDate || video.sourceDate || video.createdAt),
    rating: numberOrUndefined(video.views),
    description: cleanText(video.description || ""),
    durationText: cleanText(video.duration || ""),
    link: encodeDetailLink(videoId),
    playerType: VIDEO_PLAYER_TYPE,
  };
}

function toDetailItem(video = {}, params = {}, sources = []) {
  const item = toVideoItem(video);
  item.backdropPaths = unique([cleanImage(video.preview)].concat(video.previewImages || expandPreviewImages(video.previewImagesUrl))).filter(Boolean);
  item.genreItems = cleanTags(video.tags).map((title) => ({ id: title, title }));
  item.peoples = cleanPeople(video.actors).map((title) => ({ id: title, title, role: "actor" }));
  item.relatedItems = uniqueObjects([].concat(video.related1 || [], video.related2 || [], video.related || []))
    .filter((v) => String(v.videoId || "") !== String(video.videoId || ""))
    .map(toVideoItem);
  item.trailers = playableUrl(video.previewVideo) ? [{ coverUrl: item.posterPath, url: video.previewVideo }] : [];
  const firstSource = sources[0] || null;
  item.customHeaders = mediaHeaders(params, firstSource ? (firstSource.referer || detailReferer(video.videoId, params)) : detailReferer(video.videoId, params));
  if (firstSource) item.videoUrl = firstSource.url;
  return item;
}

async function loadSpecialList(params = {}, category = "", page = 1) {
  if (category.startsWith("__year:")) return await loadYearSelection(params, category.slice("__year:".length), page);
  return [];
}

function isSpecialCategory(category = "") {
  return String(category || "").startsWith("__year:");
}

async function fetchRandomPlaylists(params = {}) {
  const data = await apiGet("/bookmark/getRandomShareList", params, {});
  return parseResultList(data).map(toPlaylistItem).filter((item) => item.link);
}

async function loadSharePlaylistDetail(shareCode) {
  const params = getRuntimeParams();
  const videos = await loadSharePlaylistVideos(shareCode, params, 1);
  const posters = unique(videos.map((item) => item.posterPath).filter(Boolean));
  return {
    id: encodeShareLink(shareCode),
    type: "url",
    title: "随机片单 " + shareCode,
    posterPath: posters[0] || "",
    backdropPath: posters[0] || "",
    backdropPaths: posters,
    description: "Netflav 随机片单 " + shareCode,
    link: encodeShareLink(shareCode),
    playerType: VIDEO_PLAYER_TYPE,
    genreItems: [{ id: encodeShareLink(shareCode), title: "片单影片" }],
    relatedItems: videos,
    childItems: videos,
  };
}

async function loadSharePlaylistVideos(shareCode, params = {}, page = 1) {
  const data = await apiPost("/bookmark/getBookmarkWithCode", params, { shareCode, page: safePage(page) });
  return resultVideoDocs(data).map(toVideoItem);
}

async function loadYearSelection(params = {}, year = "", page = 1) {
  const safeYear = String(year || "").match(/^\d{4}$/) ? String(year) : "2025";
  const baseUrl = normalizeBaseUrl(params.baseUrl || getRuntimeParams().baseUrl || DEFAULT_BASE_URL);
  const res = await Widget.http.get(`${baseUrl}/${safeYear}`, { headers: buildHeaders(params) });
  const html = String((res && res.data) || "");
  const videos = paginateLocalList(parseYearVideos(html), page, YEAR_SELECTION_PAGE_SIZE);
  return (await hydrateYearVideos(videos, params)).map(toVideoItem);
}

function toPlaylistItem(item = {}) {
  const shareCode = String(item.shareCode || item.code || item.id || "").trim();
  const posters = unique((Array.isArray(item.srcs) ? item.srcs : [])
    .map(cleanImage)
    .filter(Boolean));
  return {
    id: encodeShareLink(shareCode) || stableId(JSON.stringify(item)),
    type: "url",
    title: cleanText(item.title || item.name || ("随机片单 " + shareCode)),
    posterPath: posters[0] || "",
    backdropPath: posters[0] || "",
    backdropPaths: posters,
    description: cleanText(item.description || ("Netflav 随机片单 " + shareCode)),
    link: encodeShareLink(shareCode),
    playerType: VIDEO_PLAYER_TYPE,
    genreItems: shareCode ? [{ id: encodeShareLink(shareCode), title: "片单影片" }] : [],
  };
}

function resultVideoDocs(data) {
  return parseResultList(data).map((item) => item && (item.video || item)).filter(Boolean);
}

function parseYearVideos(html) {
  const items = [];
  const seen = {};
  const re = /href=["']\/video\?id=([^"'&#]+)[^"']*["'][\s\S]*?<div class=["']grid_0_title["']>([\s\S]*?)<\/div>\s*<div class=["']grid_0_date["']>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const videoId = decodeURIComponent(match[1] || "");
    if (!videoId || seen[videoId]) continue;
    seen[videoId] = true;
    items.push({
      videoId,
      title: cleanHtmlText(match[2]),
      sourceDate: cleanHtmlText(match[3]),
    });
  }
  return items;
}

function paginateLocalList(items = [], page = 1, pageSize = 24) {
  const start = (safePage(page) - 1) * pageSize;
  return (items || []).slice(start, start + pageSize);
}

async function hydrateYearVideos(videos = [], params = {}) {
  const hydrated = [];
  const batchSize = 6;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const items = await Promise.all(batch.map((video) => hydrateYearVideo(video, params)));
    hydrated.push.apply(hydrated, items);
  }
  return hydrated;
}

async function hydrateYearVideo(video = {}, params = {}) {
  if (!video.videoId) return video;
  try {
    const detail = await fetchVideoDetail(video.videoId, params);
    return Object.assign({}, detail || {}, video, {
      title: video.title || (detail && detail.title) || video.videoId,
      sourceDate: video.sourceDate || (detail && (detail.sourceDate || detail.videoDate)) || "",
    });
  } catch (error) {
    console.error("[netflav][hydrateYearVideo] 封面获取失败:", video.videoId, error.message || error);
    return video;
  }
}

async function collectPlayableSources(video = {}, params = {}) {
  const candidates = [];
  const rawSources = collectMovieSources(video, params);
  for (const source of rawSources) {
    if (isDirectMovieUrl(source.url)) {
      pushCandidate(candidates, source);
      continue;
    }
    const resolved = await resolveEmbeddedSources(source.url, params, source.url);
    for (const candidate of resolved) pushCandidate(candidates, candidate);
  }
  return await resolveHighestQualityCandidates(candidates, params);
}

function collectMovieSources(video = {}, params = {}) {
  const candidates = [];
  const referer = detailReferer(video.videoId, params);
  pushSource(candidates, video.src, { source: "src", referer });
  pushSource(candidates, video.premiumUrl, { source: "premium", referer });
  for (const key of ["srcs", "otherSrcs", "uSrc", "sources", "playSources", "videos"]) {
    const list = Array.isArray(video[key]) ? video[key] : [];
    for (const entry of list) pushSource(candidates, entry, { source: key, referer });
  }
  return uniqueCandidates(candidates).filter((candidate) => playableUrl(candidate.url) && !isPreviewUrl(candidate.url));
}

function pushSource(candidates, value, defaults = {}) {
  const candidate = sourceCandidateFromEntry(value, defaults);
  if (candidate.url) pushCandidate(candidates, candidate);
}

function sourceUrlFromEntry(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return entry.src || entry.url || entry.file || entry.videoUrl || entry.hls || entry.m3u8 || entry.playUrl || entry.link || "";
}

function sourceCandidateFromEntry(entry, defaults = {}) {
  const url = sourceUrlFromEntry(entry);
  if (!url || String(url).startsWith("magnet:")) return {};
  const source = (entry && typeof entry === "object" && (entry.name || entry.label || entry.type || entry.source)) || defaults.source || "Netflav";
  const quality = (entry && typeof entry === "object" && (entry.quality || entry.resolution || entry.height || entry.label)) || defaults.quality || "";
  return {
    url: playableUrl(url),
    source: cleanText(source),
    quality: cleanText(quality),
    referer: defaults.referer || "",
  };
}

function pushCandidate(candidates, candidate = {}) {
  const url = playableUrl(candidate.url);
  if (!url || String(url).startsWith("magnet:") || isPreviewUrl(url)) return;
  candidates.push({
    url,
    source: candidate.source || "Netflav",
    quality: candidate.quality || "",
    resolution: candidate.resolution || "",
    bandwidth: Number(candidate.bandwidth || 0),
    referer: candidate.referer || "",
    order: candidates.length,
  });
}

async function resolveEmbeddedSources(url, params = {}, referer = "") {
  const sourceId = embeddedSourceId(url);
  if (!sourceId) return [];
  try {
    const data = await apiGet(`/video/ns1/${encodeURIComponent(sourceId)}`, params, {});
    return extractPlayableCandidates(parseResultObject(data), { source: sourceHostName(url), referer: referer || url });
  } catch (error) {
    console.error("[netflav][resolveEmbeddedSources] 解析失败:", error.message || error);
    return [];
  }
}

function embeddedSourceId(url) {
  const value = playableUrl(url);
  if (!value) return "";
  const clean = value.split(/[?#]/)[0].replace(/\/+$/, "");
  const parts = clean.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

function extractPlayableCandidates(value, meta = {}, candidates = []) {
  if (!value) return candidates;
  if (typeof value === "string") {
    if (isPlayableCandidate(value)) pushCandidate(candidates, { url: value, source: meta.source, referer: meta.referer });
    return uniqueCandidates(candidates);
  }
  if (Array.isArray(value)) {
    for (const item of value) extractPlayableCandidates(item, meta, candidates);
    return uniqueCandidates(candidates);
  }
  if (typeof value === "object") {
    const candidate = sourceCandidateFromEntry(value, meta);
    if (candidate.url && isPlayableCandidate(candidate.url)) pushCandidate(candidates, candidate);
    for (const key in value) extractPlayableCandidates(value[key], meta, candidates);
  }
  return uniqueCandidates(candidates);
}

function isDirectMovieUrl(url) {
  const value = playableUrl(url).toLowerCase();
  return !!value && !isPreviewUrl(value) && /\.(m3u8|mp4|webm)(?:[?#]|$)/i.test(value);
}

function isPlayableCandidate(url) {
  const value = playableUrl(url).toLowerCase();
  return !!value && !isPreviewUrl(value) && (
    /\.(m3u8|mp4|webm)(?:[?#]|$)/i.test(value) ||
    /\/(?:get_file|download|stream|video|media|hls|playlist|master|source|file)(?:[/?#]|$)/i.test(value) ||
    /[?&](?:file|src|url|source|hls|video)=/i.test(value)
  );
}

async function resolveHighestQualityCandidates(candidates = [], params = {}) {
  const resolved = [];
  for (const candidate of uniqueCandidates(candidates)) {
    if (isHlsUrl(candidate.url)) {
      const hlsCandidates = await resolveHlsCandidate(candidate, params);
      for (const item of hlsCandidates) pushCandidate(resolved, item);
    } else {
      pushCandidate(resolved, candidate);
    }
  }
  return sortCandidatesByQuality(uniqueCandidates(resolved));
}

async function resolveHlsCandidate(candidate = {}, params = {}) {
  try {
    const res = await Widget.http.get(candidate.url, {
      headers: mediaHeaders(params, candidate.referer),
    });
    const text = String((res && res.data) || "");
    const variants = parseHlsVariants(text, candidate.url);
    if (!variants.length) return [candidate];
    const best = sortCandidatesByQuality(variants.map((variant) => ({
      url: variant.url,
      source: candidate.source || "HLS",
      quality: variant.resolution || candidate.quality,
      resolution: variant.resolution,
      bandwidth: variant.bandwidth,
      referer: candidate.referer,
    })))[0];
    if (hasSeparateAudioRendition(text)) {
      return [{
        url: candidate.url,
        source: candidate.source || "HLS Master",
        quality: best && best.resolution ? best.resolution : candidate.quality,
        resolution: best && best.resolution,
        bandwidth: best && best.bandwidth,
        referer: candidate.referer,
      }];
    }
    return best ? [best] : [candidate];
  } catch (error) {
    console.error("[netflav][resolveHlsCandidate] HLS 清晰度解析失败:", error.message || error);
    return [candidate];
  }
}

function parseHlsVariants(text, baseUrl) {
  const lines = String(text || "").split(/\r?\n/);
  const variants = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!/^#EXT-X-STREAM-INF:/i.test(line)) continue;
    let next = "";
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim();
      if (!candidate || candidate.startsWith("#")) continue;
      next = candidate;
      break;
    }
    if (!next) continue;
    const resolution = firstByRe(line, /RESOLUTION=\d+x(\d+)/i);
    const bandwidth = Number(firstByRe(line, /BANDWIDTH=(\d+)/i) || 0);
    variants.push({
      url: absolutizeUrl(next, baseUrl),
      resolution: resolution ? `${resolution}P` : "",
      bandwidth,
    });
  }
  return variants.filter((item) => playableUrl(item.url));
}

function hasSeparateAudioRendition(text) {
  return /#EXT-X-MEDIA:[^\n\r]*TYPE=AUDIO/i.test(text || "") && /#EXT-X-STREAM-INF:[^\n\r]*AUDIO=/i.test(text || "");
}

function sortCandidatesByQuality(candidates = []) {
  return (candidates || []).slice().sort((a, b) => qualityScore(b) - qualityScore(a));
}

function qualityScore(candidate = {}) {
  const text = [candidate.url, candidate.quality, candidate.resolution, candidate.source].join(" ").toLowerCase();
  let height = Number(firstByRe(text, /(?:^|[^0-9])([1-9][0-9]{2,3})p(?:[^0-9]|$)/i) || 0);
  if (!height) height = Number(firstByRe(text, /(?:^|[^0-9])([1-9][0-9]{2,3})(?:x|_)/i) || 0);
  if (/4k|2160|uhd/.test(text)) height = Math.max(height, 2160);
  if (/2k|1440/.test(text)) height = Math.max(height, 1440);
  if (/1080|fullhd|fhd/.test(text)) height = Math.max(height, 1080);
  if (/720|hd/.test(text)) height = Math.max(height, 720);
  if (/480/.test(text)) height = Math.max(height, 480);
  const bandwidth = Number(candidate.bandwidth || firstByRe(text, /bandwidth[=:-]?(\d+)/i) || 0);
  const formatBonus = isHlsUrl(candidate.url) ? 50 : /\.(mp4|webm)(?:[?#]|$)/i.test(candidate.url) ? 25 : 0;
  const orderPenalty = Number(candidate.order || 0) / 1000;
  return height * 1000000 + bandwidth + formatBonus - orderPenalty;
}

function uniqueCandidates(candidates = []) {
  const seen = {};
  const out = [];
  for (const candidate of candidates || []) {
    const url = playableUrl(candidate && candidate.url);
    if (!url || seen[url]) continue;
    seen[url] = true;
    out.push({
      url,
      source: candidate.source || "Netflav",
      quality: candidate.quality || "",
      resolution: candidate.resolution || "",
      bandwidth: Number(candidate.bandwidth || 0),
      referer: candidate.referer || "",
      order: candidate.order || out.length,
    });
  }
  return out;
}

function directPlayableParam(params = {}) {
  const candidates = [params.videoUrl, params.url, params.src, params.file];
  for (const value of candidates) {
    const url = playableUrl(value);
    if (url && isPlayableCandidate(url)) return url;
  }
  return "";
}

function isHlsUrl(url) {
  return /\.m3u8(?:[?#]|$)/i.test(playableUrl(url));
}

function sourceHostName(url) {
  const match = playableUrl(url).match(/^https?:\/\/([^/?#]+)/i);
  return match ? match[1] : "Netflav";
}

function absolutizeUrl(url, baseUrl) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) {
    const proto = firstByRe(baseUrl, /^(https?:)\/\//i) || "https:";
    return proto + value;
  }
  const origin = originFromUrl(baseUrl);
  if (value.startsWith("/")) return origin ? origin + value : value;
  const base = String(baseUrl || "").split(/[?#]/)[0].replace(/\/[^/]*$/, "/");
  return base + value;
}

function originFromUrl(url) {
  const match = String(url || "").match(/^(https?:\/\/[^/?#]+)/i);
  return match ? match[1] : "";
}

function firstByRe(text, re) {
  const match = String(text || "").match(re);
  return match ? match[1] : "";
}

function isPreviewUrl(url) {
  const value = String(url || "").toLowerCase();
  return /(?:freepv|\/pv\/|preview|sample|trailer)/i.test(value);
}

function cleanTags(tags = []) {
  const result = [];
  for (const tag of tags || []) {
    const clean = cleanLangValue(tag);
    if (clean && !/^(Censored|Uncensored)$/i.test(clean)) result.push(clean);
  }
  return unique(result).slice(0, 24);
}

function cleanPeople(actors = []) {
  const result = [];
  for (const actor of actors || []) {
    const clean = cleanLangValue(actor);
    if (clean && !/^[a-z]+[:：]/i.test(clean)) result.push(clean);
  }
  return unique(result).slice(0, 12);
}

function cleanLangValue(value) {
  return cleanText(String(value || "").replace(/^(jp|zh|en)[:：]/i, ""));
}

function expandPreviewImages(url) {
  const value = String(url || "");
  const match = value.match(/^(.*)~~(\d+)~~(.*)$/);
  if (!match) return value ? [value] : [];
  const count = Math.min(Number(match[2] || 0), 30);
  const list = [];
  for (let i = 1; i <= count; i++) list.push(match[1] + i + match[3]);
  return list;
}

function playbackName(url, index, quality = "") {
  const lower = String(url || "").toLowerCase();
  const label = cleanText(quality) || cleanText(firstByRe(lower, /(?:^|[^0-9])([1-9][0-9]{2,3}p)(?:[^0-9]|$)/i)).toUpperCase();
  if (lower.includes(".m3u8")) return label ? `${label} HLS` : (index === 0 ? "HLS 播放" : `HLS ${index + 1}`);
  if (lower.includes(".mp4")) return label ? `${label} MP4` : (index === 0 ? "MP4 播放" : `MP4 ${index + 1}`);
  return index === 0 ? "在线播放" : `播放源 ${index + 1}`;
}

function playableUrl(url) {
  const value = String(url || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return "https:" + value;
  return "";
}

function encodeDetailLink(videoId) {
  return videoId ? "detail:" + videoId : "";
}

function encodeShareLink(shareCode) {
  return shareCode ? "share:" + shareCode : "";
}

function decodeDetailLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";
  if (value.startsWith("detail:")) return value.slice("detail:".length);
  const match = value.match(/[?&]id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : value;
}

function decodeShareLink(link) {
  const value = String(link || "").trim();
  if (value.startsWith("share:")) return value.slice("share:".length);
  const match = value.match(/[?&]c=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function playlistCodeFromValue(value) {
  const code = decodeShareLink(value);
  if (code) return code;
  const raw = String(value || "").trim();
  return /^[a-z0-9]{6,16}$/i.test(raw) ? raw : "";
}

function detailReferer(videoId, params = {}) {
  const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL);
  return videoId ? `${baseUrl}/video?id=${encodeURIComponent(videoId)}` : baseUrl + "/";
}

function buildHeaders(params = {}) {
  const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL);
  return {
    client: "client",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
    Referer: baseUrl + "/",
  };
}

function mediaHeaders(params = {}, referer = "") {
  const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL);
  return {
    "User-Agent": buildHeaders(params)["User-Agent"],
    Referer: referer || baseUrl + "/",
    Origin: baseUrl,
  };
}

function rememberRuntimeParams(params = {}) {
  Widget.storage.set("netflav.runtimeParams", {
    baseUrl: normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL),
    apiBase: normalizeBaseUrl(params.apiBase || DEFAULT_API_BASE),
  });
}

function getRuntimeParams() {
  return Widget.storage.get("netflav.runtimeParams") || { baseUrl: DEFAULT_BASE_URL, apiBase: DEFAULT_API_BASE };
}

function compactParams(params = {}) {
  const out = {};
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") out[key] = params[key];
  }
  return out;
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function safePage(page) {
  const value = Number(page || 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function cleanText(text) {
  return String(text || "").replace(/\+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHtmlText(html) {
  return cleanText(String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:lt|#60);/gi, "<")
    .replace(/&(?:gt|#62);/gi, ">")
    .replace(/&(?:quot|#34);/gi, "\"")
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " "));
}

function cleanImage(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:image/")) return "";
  return value.replace("pic.7mmtv.tv", "n1.1024cdn.sx").replace("99avcdn.com", "n1.1024cdn.sx");
}

function dateOnly(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function numberOrUndefined(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function stableId(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "netflav-item";
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

function uniqueObjects(list) {
  const seen = {};
  const out = [];
  for (const item of list || []) {
    const key = String((item && (item.videoId || item._id || item.title)) || "");
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }
  return out;
}

function unpackZipson(input) {
  const parts = String(input || "").split("^");
  const dict = [];
  addDictValues(dict, parts[0], decodePackedString);
  addDictValues(dict, parts[1], (v) => parseInt(v, 36));
  addDictValues(dict, parts[2], (v) => parseFloat(v));
  const tokens = tokenizePackedStructure(parts[3] || "");
  let index = 0;

  function read() {
    const token = tokens[index++];
    if (token === "@") {
      const arr = [];
      while (index < tokens.length) {
        const next = tokens[index];
        if (next === "]") {
          index++;
          return arr;
        }
        arr.push(next === "@" || next === "$" ? read() : primitive(tokens[index++]));
      }
      return arr;
    }
    if (token === "$") {
      const obj = {};
      while (index < tokens.length) {
        let key = tokens[index++];
        if (key === "]") return obj;
        key = key === -4 ? "" : dict[key];
        const next = tokens[index++];
        obj[key] = next === "@" || next === "$" ? readWithToken(next) : primitive(next);
      }
      return obj;
    }
    throw new Error("Bad packed token: " + token);
  }

  function readWithToken(token) {
    index--;
    tokens[index] = token;
    return read();
  }

  function primitive(token) {
    if (token === -1) return true;
    if (token === -2) return false;
    if (token === -3) return null;
    if (token === -5) return undefined;
    if (token === -4) return "";
    return dict[token];
  }

  return read();
}

function addDictValues(dict, value, mapper) {
  if (value === undefined || value === "") return;
  const values = String(value).split("|");
  for (const item of values) dict.push(mapper(item));
}

function decodePackedString(value) {
  return String(value || "").replace(/\+|%2B|%7C|%5E|%25/g, (part) => ({
    "+": " ",
    "%2B": "+",
    "%7C": "|",
    "%5E": "^",
    "%25": "%",
  })[part]);
}

function tokenizePackedStructure(input) {
  const tokens = [];
  let buf = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (ch === "|" || ch === "$" || ch === "@" || ch === "]") {
      if (buf) {
        tokens.push(parseInt(buf, 36));
        buf = "";
      }
      if (ch !== "|") tokens.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(parseInt(buf, 36));
  return tokens;
}
