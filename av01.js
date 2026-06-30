WidgetMetadata = {
  id: "forward.av01",
  title: "AV01",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "AV01 列表、搜索、详情与播放源模块",
  author: "Forward",
  site: "https://www.av01.media/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://www.av01.media",
      placeholders: [{ title: "AV01", value: "https://www.av01.media" }],
    },
    {
      name: "apiBase",
      title: "API 地址",
      type: "input",
      value: "https://www.av01.media/api/v1",
      placeholders: [
        { title: "AV01 主站 API", value: "https://www.av01.media/api/v1" },
        { title: "AV01 备用 API", value: "https://customers.iw01.xyz/api/v1" },
      ],
    },
    {
      name: "geoUrl",
      title: "Geo 地址",
      type: "input",
      value: "https://files.iw01.xyz/edge/geo.js?json",
      placeholders: [{ title: "AV01 Geo", value: "https://files.iw01.xyz/edge/geo.js?json" }],
    },
    {
      name: "lang",
      title: "语言",
      type: "enumeration",
      value: "cn",
      enumOptions: [
        { title: "简体中文", value: "cn" },
        { title: "繁体中文", value: "tw" },
        { title: "日本语", value: "jp" },
        { title: "English", value: "en" },
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
          value: "latest",
          enumOptions: [
            { title: "最新", value: "latest" },
            { title: "热门", value: "hottest" },
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadResource",
      title: "AV01 播放源",
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

const DEFAULT_BASE_URL = "https://www.av01.media";
const DEFAULT_API_BASE = "https://www.av01.media/api/v1";
const DEFAULT_GEO_URL = "https://files.iw01.xyz/edge/geo.js?json";
const DEFAULT_LANG = "cn";
const PAGE_LIMIT = 20;
const RUNTIME_KEY = "av01.runtimeParams";
const GEO_KEY = "av01.geoData";
const FILES_HOST = "https://files.iw01.xyz";

async function loadList(params = {}) {
  try {
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const geo = await tryGetGeo(runtimeParams);
    const peopleRoute = parseRoute(params.peopleId, "actress");
    const genreRoute = parseRoute(params.genreId, "");
    let data;

    if (peopleRoute && peopleRoute.type === "actress") {
      data = await apiGet(`videos/actress/${encodePath(peopleRoute.id)}`, runtimeParams, { page, limit: PAGE_LIMIT });
    } else if (genreRoute) {
      data = await apiGet(`videos/${genreRoute.type}/${encodePath(genreRoute.id)}`, runtimeParams, { page, limit: PAGE_LIMIT });
    } else {
      const category = params.category === "hottest" ? "hottest" : "latest";
      data = await apiGet(`videos/types/${category}`, runtimeParams, { page, limit: PAGE_LIMIT });
    }

    return listFromResponse(data).map((video) => toVideoItem(video, runtimeParams, geo));
  } catch (error) {
    console.error("[av01][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const runtimeParams = rememberRuntimeParams(params);
    const geo = await tryGetGeo(runtimeParams);
    const body = {
      query: keyword,
      pagination: { page: safePage(params.page), limit: PAGE_LIMIT },
    };
    const data = await apiPost("videos/search", body, runtimeParams, { lang: runtimeParams.lang });
    return listFromResponse(data).map((video) => toVideoItem(video, runtimeParams, geo));
  } catch (error) {
    console.error("[av01][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const videoId = decodeDetailLink(link);
    if (!videoId) return null;
    const runtimeParams = getRuntimeParams();
    const geo = await tryGetGeo(runtimeParams);
    const detail = await apiGet(`videos/${encodePath(videoId)}`, runtimeParams, {});
    if (!detail || !detail.id) return null;

    let related = [];
    try {
      const similar = await apiGet(`videos/${encodePath(videoId)}/similars`, runtimeParams, { page: 1, limit: PAGE_LIMIT });
      related = listFromResponse(similar)
        .filter((item) => String(item.id || "") !== String(detail.id || ""))
        .map((item) => toVideoItem(item, runtimeParams, geo));
    } catch (error) {
      console.log("[av01][loadDetail] 相关推荐加载失败:", error.message || error);
    }

    return toDetailItem(detail, runtimeParams, geo, related);
  } catch (error) {
    console.error("[av01][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const saved = getRuntimeParams();
    const runtimeParams = rememberRuntimeParams({
      baseUrl: params.baseUrl || saved.baseUrl,
      apiBase: params.apiBase || saved.apiBase,
      geoUrl: params.geoUrl || saved.geoUrl,
      lang: params.lang || saved.lang,
    });
    const direct = directPlayableParam(params);
    if (direct) {
      return [{
        name: playbackName(direct, 0),
        description: "AV01",
        url: direct,
        customHeaders: mediaHeaders(runtimeParams, detailReferer(params.id || "", runtimeParams)),
      }];
    }

    const videoId = inferVideoId(params);
    if (!videoId) return [];
    const geo = await getGeo(runtimeParams);
    const playlist = await apiGet(`videos/${encodePath(videoId)}/playlist`, runtimeParams, {
      expires: geo.expires,
      ip: geo.ip,
      token_v2: geo.token_v2,
    });
    const src = playlistSource(playlist);
    if (!src) return [];

    return [{
      name: playbackName(src, 0),
      description: "AV01",
      url: src,
      customHeaders: mediaHeaders(runtimeParams, detailReferer(videoId, runtimeParams)),
    }];
  } catch (error) {
    console.error("[av01][loadResource] 失败:", error.message || error);
    return [];
  }
}

async function apiGet(path, params = {}, query = {}) {
  const res = await Widget.http.get(apiUrl(path, params, query), { headers: buildHeaders(params) });
  return responseData(res);
}

async function apiPost(path, body, params = {}, query = {}) {
  const res = await Widget.http.post(apiUrl(path, params, query), body, { headers: jsonHeaders(params) });
  return responseData(res);
}

function responseData(res) {
  const data = res && res.data;
  if (!data) throw new Error("空响应");
  return data;
}

function apiUrl(path, params = {}, query = {}) {
  const apiBase = normalizeApiBase(params.apiBase || DEFAULT_API_BASE);
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return appendQuery(`${apiBase}/${cleanPath}`, query);
}

function listFromResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.videos)) return data.videos;
  if (data.latest_videos && Array.isArray(data.latest_videos.videos)) return data.latest_videos.videos;
  if (data.hottest_videos && Array.isArray(data.hottest_videos.videos)) return data.hottest_videos.videos;
  return [];
}

function toDetailItem(video = {}, params = {}, geo, relatedItems = []) {
  const item = toVideoItem(video, params, geo);
  const poster = item.posterPath || item.backdropPath || "";
  item.backdropPaths = unique([poster]).filter(Boolean);
  item.genreItems = genreItems(video, params);
  item.peoples = peopleItems(video, params, geo);
  item.relatedItems = relatedItems;
  item.trailers = item.previewUrl ? [{ coverUrl: poster, url: item.previewUrl }] : [];
  item.description = detailDescription(video, params);
  return item;
}

function toVideoItem(video = {}, params = {}, geo) {
  const id = String(video.id || video.video_id || video.dmm_id || video.dvd_id || "");
  const title = videoTitle(video, params);
  const poster = coverUrl(video, geo);
  const preview = previewUrl(video, geo);
  return {
    id: id || stableId(title),
    type: "url",
    mediaType: "movie",
    title: title || id || "AV01",
    posterPath: poster,
    backdropPath: poster,
    previewUrl: preview,
    releaseDate: dateOnly(video.published_time || video.uploaded_time),
    rating: numberOrUndefined(video.views),
    description: summaryDescription(video, params),
    duration: numberOrUndefined(video.duration),
    durationText: formatDuration(video.duration),
    link: encodeDetailLink(id),
    playerType: "system",
  };
}

function genreItems(video = {}, params = {}) {
  const out = [];
  const tags = Array.isArray(video.tags) ? video.tags : [];
  for (const tag of tags) {
    if (!tag || !tag.id) continue;
    out.push({ id: "tag:" + tag.id, title: translatedName(tag, params) });
  }
  if (video.maker_id && video.maker) out.push({ id: "maker:" + video.maker_id, title: translatedValue(video.maker, video.maker_translations, params) });
  if (video.director_id && video.director) out.push({ id: "director:" + video.director_id, title: translatedValue(video.director, video.director_translations, params) });
  if (video.team_id && video.team) out.push({ id: "team:" + video.team_id, title: translatedValue(video.team, video.team_translations, params) });
  return uniqueObjects(out, "id");
}

function peopleItems(video = {}, params = {}, geo) {
  const out = [];
  const actresses = Array.isArray(video.actresses) ? video.actresses : [];
  for (const actor of actresses) {
    if (!actor || !actor.id) continue;
    out.push({
      id: "actress:" + actor.id,
      title: translatedName(actor, params),
      avatar: entityImage(actor, geo),
      role: "actress",
    });
  }
  return uniqueObjects(out, "id");
}

function summaryDescription(video = {}, params = {}) {
  const parts = [];
  const desc = translatedValue(video.description, video.description_translations, params);
  if (desc) parts.push(desc);
  if (video.dvd_id) parts.push("ID: " + video.dvd_id);
  if (video.maker) parts.push("Maker: " + translatedValue(video.maker, video.maker_translations, params));
  return parts.join("\n");
}

function detailDescription(video = {}, params = {}) {
  const parts = [];
  const desc = translatedValue(video.description, video.description_translations, params);
  if (desc) parts.push(desc);
  if (video.dvd_id) parts.push("ID: " + video.dvd_id);
  if (video.dmm_id) parts.push("DMM: " + video.dmm_id);
  if (video.maker) parts.push("Maker: " + translatedValue(video.maker, video.maker_translations, params));
  if (video.director) parts.push("Director: " + translatedValue(video.director, video.director_translations, params));
  const tags = (Array.isArray(video.tags) ? video.tags : []).map((tag) => translatedName(tag, params)).filter(Boolean);
  if (tags.length) parts.push("Tags: " + tags.join(", "));
  return parts.join("\n");
}

function videoTitle(video = {}, params = {}) {
  return cleanText(translatedValue(video.title, video.title_translations, params) || video.dvd_id || video.dmm_id || video.id);
}

function translatedName(item = {}, params = {}) {
  return translatedValue(item.name, item.name_translations, params);
}

function translatedValue(value, translations, params = {}) {
  const lang = String(params.lang || DEFAULT_LANG);
  if (translations && translations[lang]) return cleanText(translations[lang]);
  if (translations && translations.cn) return cleanText(translations.cn);
  if (translations && translations.tw) return cleanText(translations.tw);
  if (translations && translations.en) return cleanText(translations.en);
  return cleanText(value);
}

function coverUrl(video = {}, geo) {
  const direct = firstString(video.cover_url, video.coverUrl, video.cover_image_url, video.image_url);
  if (direct) return signUrl(direct, geo);
  if (!video.id || !geo || !geo.token_v2) return "";
  return `${FILES_HOST}/covers/${encodePath(video.id)}/640.jpg?${geoTokenQuery(geo)}`;
}

function previewUrl(video = {}, geo) {
  const direct = firstString(video.preview_url, video.previewUrl);
  if (direct) return signUrl(direct, geo);
  if (!video.id || !video.preview || !geo || !geo.token_v2) return "";
  return `${FILES_HOST}/covers/${encodePath(video.id)}/preview.mp4?${geoTokenQuery(geo)}`;
}

function entityImage(item = {}, geo) {
  const direct = firstString(item.avatar, item.logo, item.image_url, item.imageUrl);
  if (direct) return signUrl(direct, geo);
  if (!item.image_r2_key || !geo || !geo.token_v2) return "";
  return `${FILES_HOST}/${String(item.image_r2_key).replace(/^\/+/, "")}?${geoTokenQuery(geo)}`;
}

function signUrl(url, geo) {
  const value = String(url || "").trim();
  if (!value || !/^https?:\/\//i.test(value) || !geo || !geo.token_v2) return value;
  return appendQuery(value, {
    token_v2: geo.token_v2,
    expires: geo.expires,
    ip: geo.ip,
  });
}

async function tryGetGeo(params = {}) {
  try {
    return await getGeo(params);
  } catch (error) {
    console.log("[av01][geo] 加载失败:", error.message || error);
    return null;
  }
}

async function getGeo(params = {}) {
  const cached = Widget.storage.get(GEO_KEY);
  if (cached && !isGeoExpired(cached)) return cached;
  const url = String(params.geoUrl || DEFAULT_GEO_URL).trim() || DEFAULT_GEO_URL;
  const res = await Widget.http.get(url, { headers: buildHeaders(params) });
  const geo = responseData(res);
  if (!geo.token_v2 || !geo.expires || !geo.ip) throw new Error("Geo 响应缺少 token");
  geo.fetchedAt = Date.now();
  Widget.storage.set(GEO_KEY, geo);
  return geo;
}

function isGeoExpired(geo = {}) {
  const ttl = Number(geo.ttl || 600);
  const fetchedAt = Number(geo.fetchedAt || 0);
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > Math.max(60, ttl - 30) * 1000;
}

function parseRoute(value, fallbackType) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const index = raw.indexOf(":");
  const type = index >= 0 ? raw.slice(0, index) : fallbackType;
  const id = index >= 0 ? raw.slice(index + 1) : raw;
  if (!id) return null;
  if (["tag", "maker", "director", "team", "actress"].indexOf(type) === -1) return null;
  return { type, id };
}

function inferVideoId(params = {}) {
  const candidates = [params.videoId, params.id, params.link, params.url, params.href];
  for (const candidate of candidates) {
    const id = decodeDetailLink(candidate);
    if (id && !isPlayableUrl(id)) return id;
  }
  return "";
}

function directPlayableParam(params = {}) {
  const candidates = [params.videoUrl, params.src, params.file];
  for (const candidate of candidates) {
    const url = String(candidate || "").trim();
    if (isPlayableUrl(url)) return url;
  }
  return "";
}

function playlistSource(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.src || value.url || value.videoUrl || value.file || "";
}

function isPlayableUrl(url) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) || /^data:application\/(?:x-mpegurl|vnd\.apple\.mpegurl)/i.test(value);
}

function playbackName(url, index) {
  const lower = String(url || "").toLowerCase();
  if (lower.indexOf("mpegurl") >= 0 || lower.indexOf(".m3u8") >= 0) return index === 0 ? "HLS 播放" : `HLS ${index + 1}`;
  if (lower.indexOf(".mp4") >= 0) return index === 0 ? "MP4 播放" : `MP4 ${index + 1}`;
  return index === 0 ? "在线播放" : `播放源 ${index + 1}`;
}

function encodeDetailLink(id) {
  return id ? "detail:" + id : "";
}

function decodeDetailLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";
  if (value.startsWith("detail:")) return value.slice("detail:".length);
  const match = value.match(/\/video\/(\d+)/);
  if (match) return match[1];
  return /^\d+$/.test(value) ? value : "";
}

function detailReferer(videoId, params = {}) {
  const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL);
  const lang = String(params.lang || DEFAULT_LANG).replace(/^\/+|\/+$/g, "");
  return videoId ? `${baseUrl}/${lang}/video/${encodePath(videoId)}` : baseUrl + "/";
}

function buildHeaders(params = {}) {
  return {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": acceptLanguage(params.lang),
    Referer: normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL) + "/",
  };
}

function jsonHeaders(params = {}) {
  const headers = buildHeaders(params);
  headers["Content-Type"] = "application/json";
  return headers;
}

function mediaHeaders(params = {}, referer) {
  const headers = buildHeaders(params);
  headers.Referer = referer || normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL) + "/";
  headers.Origin = normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL);
  return headers;
}

function acceptLanguage(lang) {
  const value = String(lang || DEFAULT_LANG);
  if (value === "cn") return "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7";
  if (value === "tw") return "zh-TW,zh;q=0.9,en;q=0.8,ja;q=0.7";
  if (value === "jp") return "ja,en;q=0.8,zh-CN;q=0.7";
  return "en-US,en;q=0.9,zh-CN;q=0.8,ja;q=0.7";
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl || DEFAULT_BASE_URL),
    apiBase: normalizeApiBase(params.apiBase || saved.apiBase || DEFAULT_API_BASE),
    geoUrl: String(params.geoUrl || saved.geoUrl || DEFAULT_GEO_URL).trim() || DEFAULT_GEO_URL,
    lang: String(params.lang || saved.lang || DEFAULT_LANG).trim() || DEFAULT_LANG,
  };
  Widget.storage.set(RUNTIME_KEY, next);
  return next;
}

function getRuntimeParams() {
  return Widget.storage.get(RUNTIME_KEY) || {
    baseUrl: DEFAULT_BASE_URL,
    apiBase: DEFAULT_API_BASE,
    geoUrl: DEFAULT_GEO_URL,
    lang: DEFAULT_LANG,
  };
}

function appendQuery(url, query = {}) {
  const parts = [];
  for (const key in query) {
    const value = query[key];
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  if (!parts.length) return url;
  return url + (String(url).indexOf("?") >= 0 ? "&" : "?") + parts.join("&");
}

function geoTokenQuery(geo = {}) {
  return [
    "token_v2=" + encodeURIComponent(String(geo.token_v2 || "")),
    "expires=" + encodeURIComponent(String(geo.expires || "")),
    "ip=" + encodeURIComponent(String(geo.ip || "")),
  ].join("&");
}

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function normalizeApiBase(url) {
  return String(url || DEFAULT_API_BASE).trim().replace(/\/+$/, "") || DEFAULT_API_BASE;
}

function encodePath(value) {
  return encodeURIComponent(String(value || ""));
}

function safePage(page) {
  const value = Number(page || 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function dateOnly(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function formatDuration(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = Math.floor(value % 60);
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function numberOrUndefined(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function firstString() {
  for (let i = 0; i < arguments.length; i++) {
    const value = String(arguments[i] || "").trim();
    if (value) return value;
  }
  return "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stableId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "av01-item";
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

function uniqueObjects(list, keyName) {
  const seen = {};
  const out = [];
  for (const item of list || []) {
    const key = String((item && item[keyName]) || "");
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }
  return out;
}
