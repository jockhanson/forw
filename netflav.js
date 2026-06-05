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
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
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

async function loadList(params = {}) {
  try {
    rememberRuntimeParams(params);
    const page = safePage(params.page);
    const category = String(params.genreId || params.category || "").trim();
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
    const videoId = decodeDetailLink(link);
    if (!videoId) return null;
    const params = getRuntimeParams();
    const data = await apiGet(`/video/v2/retrieveVideo/${encodeURIComponent(videoId)}`, params, {});
    const detail = parseResultObject(data);
    if (!detail || !detail.videoId) return null;
    return toDetailItem(detail);
  } catch (error) {
    console.error("[netflav][loadDetail] 失败:", error.message || error);
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
    const videoId = decodeDetailLink(params.link || params.id || params.videoId || params.url);
    if (!videoId) return [];
    const data = await apiGet(`/video/v2/retrieveVideo/${encodeURIComponent(videoId)}`, runtimeParams, {});
    const detail = parseResultObject(data);
    return collectSources(detail).map((url, index) => ({
      name: playbackName(url, index),
      description: "Netflav",
      url,
      customHeaders: mediaHeaders(runtimeParams),
    }));
  } catch (error) {
    console.error("[netflav][loadResource] 失败:", error.message || error);
    return [];
  }
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
    playerType: "system",
  };
}

function toDetailItem(video = {}) {
  const item = toVideoItem(video);
  const sources = collectSources(video);
  item.backdropPaths = unique([cleanImage(video.preview)].concat(video.previewImages || expandPreviewImages(video.previewImagesUrl))).filter(Boolean);
  item.genreItems = cleanTags(video.tags).map((title) => ({ id: title, title }));
  item.peoples = cleanPeople(video.actors).map((title) => ({ id: title, title, role: "actor" }));
  item.relatedItems = uniqueObjects([].concat(video.related1 || [], video.related2 || [], video.related || []))
    .filter((v) => String(v.videoId || "") !== String(video.videoId || ""))
    .map(toVideoItem);
  item.trailers = playableUrl(video.previewVideo) ? [{ coverUrl: item.posterPath, url: video.previewVideo }] : [];
  if (sources[0]) item.videoUrl = sources[0];
  return item;
}

function collectSources(video = {}) {
  const urls = [];
  pushSource(urls, video.src);
  pushSource(urls, video.previewVideo);
  for (const key of ["srcs", "otherSrcs", "uSrc"]) {
    const list = Array.isArray(video[key]) ? video[key] : [];
    for (const entry of list) pushSource(urls, typeof entry === "string" ? entry : entry && (entry.src || entry.url));
  }
  return unique(urls).filter(playableUrl);
}

function pushSource(urls, url) {
  if (typeof url === "string" && url.trim() && !url.startsWith("magnet:")) urls.push(url.trim());
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

function playbackName(url, index) {
  const lower = String(url || "").toLowerCase();
  if (lower.includes(".m3u8")) return index === 0 ? "HLS 播放" : `HLS ${index + 1}`;
  if (lower.includes(".mp4")) return index === 0 ? "MP4 播放" : `MP4 ${index + 1}`;
  return index === 0 ? "在线播放" : `播放源 ${index + 1}`;
}

function playableUrl(url) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) ? value : "";
}

function encodeDetailLink(videoId) {
  return videoId ? "detail:" + videoId : "";
}

function decodeDetailLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";
  if (value.startsWith("detail:")) return value.slice("detail:".length);
  const match = value.match(/[?&]id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : value;
}

function buildHeaders(params = {}) {
  return {
    client: "client",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
    Referer: normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL) + "/",
  };
}

function mediaHeaders(params = {}) {
  return {
    "User-Agent": buildHeaders(params)["User-Agent"],
    Referer: normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL) + "/",
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
