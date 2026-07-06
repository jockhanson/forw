WidgetMetadata = {
  id: "forward.netflav",
  title: "Netflav",
  version: "1.0.4",
  requiredVersion: "0.0.1",
  description: "Netflav 列表、搜索、详情、播放源与聚合搜索模块",
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
    {
      name: "supjavCookie",
      title: "Supjav Cookie",
      type: "input",
      value: "",
      placeholders: [{ title: "可选，用于通过 Supjav 验证", value: "" }],
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
      cacheDuration: 0,
      params: [
        {
          name: "category",
          title: "分类",
          type: "enumeration",
          value: "__randomSlot:0",
          enumOptions: [
            { title: "随机片单 1", value: "__randomSlot:0" },
            { title: "随机片单 2", value: "__randomSlot:1" },
            { title: "随机片单 3", value: "__randomSlot:2" },
            { title: "随机片单 4", value: "__randomSlot:3" },
            { title: "随机片单 5", value: "__randomSlot:4" },
            { title: "随机片单 6", value: "__randomSlot:5" },
            { title: "随机片单 7", value: "__randomSlot:6" },
            { title: "随机片单 8", value: "__randomSlot:7" },
            { title: "随机片单 9", value: "__randomSlot:8" },
            { title: "随机片单 10", value: "__randomSlot:9" },
          ],
        },
        { name: "genreId", title: "片单ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadResource",
      title: "Netflav 播放源",
      description: "直接解析 Netflav 链接，或按番号聚合搜索 Netflav 播放源",
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
const SUPJAV_BASE = "https://supjav.com";
const SUPJAV_API = "https://lk1.supremejav.com/supjav.php";
const SUPJAV_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
const SUPJAV_REQUEST_TIMEOUT = 15000;

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
    const sources = await collectDetailEntryPlayableSources(detail, params);
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
    const selection = randomPlaylistSelection(params.genreId || params.category || params.shareCode);
    const shareCode = selection.shareCode;
    if (shareCode) return await loadSharePlaylistVideos(shareCode, params, page);
    const playlists = await fetchRandomPlaylists(params);
    const selected = playlists[selection.slotIndex] || playlists[0];
    const selectedShareCode = playlistCodeFromValue(selected && selected.link);
    return selectedShareCode ? await loadSharePlaylistVideos(selectedShareCode, params, page) : [];
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
      supjavCookie: normalizeCookie(params.supjavCookie || params.cookie || saved.supjavCookie),
    };
    const directUrl = directPlayableParam(params);
    if (directUrl) {
      const sources = await resolveHighestQualityCandidates([{ url: directUrl, referer: params.referer || runtimeParams.baseUrl + "/" }], runtimeParams);
      return toResourceItems(sources, runtimeParams, runtimeParams.baseUrl + "/");
    }
    const videoId = directNetflavVideoIdFromParams(params, runtimeParams);
    if (videoId) {
      try {
        const detail = await fetchVideoDetail(videoId, runtimeParams);
        const sources = await collectPlayableSourcesWithFallback(detail, runtimeParams);
        return toResourceItems(sources, runtimeParams, detailReferer(detail && detail.videoId, runtimeParams));
      } catch (error) {
        console.error("[netflav][loadResource] 直接解析失败，尝试聚合搜索:", error.message || error);
      }
    }
    return await loadAggregateSearchResource(params, runtimeParams);
  } catch (error) {
    console.error("[netflav][loadResource] 失败:", error.message || error);
    return [];
  }
}

async function loadAggregateSearchResource(params = {}, runtimeParams = {}) {
  const code = extractAggregateCodeFromParams(params);
  if (!code) {
    console.log("[netflav][aggregate] 当前视频信息中未找到番号，跳过 Netflav 聚合搜索");
    return [];
  }

  console.log("[netflav][aggregate] 提取到番号:", code);
  const matches = await findNetflavVideosByCode(code, runtimeParams);
  if (!matches.length) {
    console.log("[netflav][aggregate] 未找到 Netflav 精确匹配:", code);
    return [];
  }

  const resources = [];
  const seenUrls = {};
  for (const video of matches.slice(0, 3)) {
    const videoId = String(video.videoId || video._id || video.id || "").trim();
    if (!videoId) continue;
    try {
      const fetched = await fetchVideoDetail(videoId, runtimeParams);
      const detail = Object.assign({}, fetched || video, {
        videoId: String((fetched && (fetched.videoId || fetched._id || fetched.id)) || videoId),
      });
      const sources = await collectPlayableSourcesFallbackChain(detail, runtimeParams, false);
      const items = toAggregateResourceItems(detail, code, sources, runtimeParams);
      for (const item of items) {
        if (!item.url || seenUrls[item.url]) continue;
        seenUrls[item.url] = true;
        resources.push(item);
      }
    } catch (error) {
      console.error("[netflav][aggregate] 匹配项解析失败:", videoId, error.message || error);
    }
  }

  return resources;
}

async function findNetflavVideosByCode(code, params = {}) {
  const candidates = [];
  const keys = aggregateSearchKeys(code);
  for (const key of keys) {
    try {
      const data = await apiGet("/video/advanceSearchVideo", params, {
        type: "title",
        page: 1,
        keyword: key,
      });
      candidates.push.apply(candidates, parseResultList(data));
    } catch (error) {
      console.error("[netflav][aggregate] 搜索失败:", key, error.message || error);
    }
  }

  const exact = uniqueObjects(candidates).filter((video) => videoMatchesAggregateCode(video, code));
  return sortAggregateMatches(exact, code);
}

function aggregateSearchKeys(code) {
  const value = cleanText(code);
  const compact = normalizeAggregateCodeForCompare(value);
  const keys = [value, value.replace(/-/g, ""), compact];
  const hyphenated = hyphenatedAggregateCode(compact);
  if (hyphenated) keys.push(hyphenated);
  return unique(keys).filter(Boolean);
}

function hyphenatedAggregateCode(compact) {
  const value = String(compact || "").toUpperCase();
  const special = value.match(/^(FC2|CARIB|1PONDO|HEYZO|T28)(?:PPV)?(\d{3,10})$/i);
  if (special) return special[1].toUpperCase() + "-" + special[2];
  const generic = value.match(/^([A-Z]{2,15})(\d{2,10}[A-Z]?)([A-Z]{0,4})$/);
  if (!generic) return "";
  return generic[1] + "-" + generic[2] + (generic[3] ? "-" + generic[3] : "");
}

function videoMatchesAggregateCode(video = {}, code = "") {
  const target = normalizeAggregateCodeForCompare(code);
  if (!target) return false;
  const candidates = aggregateVideoCodeCandidates(video);
  for (const value of candidates) {
    const extracted = extractAggregateSearchCode(value, { allowPureNumeric: true });
    if (normalizeAggregateCodeForCompare(extracted) === target) return true;
  }
  return false;
}

function sortAggregateMatches(videos = [], code = "") {
  return (videos || []).slice().sort((a, b) => aggregateMatchScore(b, code) - aggregateMatchScore(a, code));
}

function aggregateMatchScore(video = {}, code = "") {
  const target = normalizeAggregateCodeForCompare(code);
  let score = 0;
  const title = cleanText(video.title || video.title_zh || video.title_en || "");
  const videoCode = cleanText(video.code || video.number || "");
  if (normalizeAggregateCodeForCompare(extractAggregateSearchCode(videoCode, { allowPureNumeric: true })) === target) score += 80;
  if (normalizeAggregateCodeForCompare(extractAggregateSearchCode(title, { allowPureNumeric: true })) === target) score += 60;
  if (normalizeAggregateCodeForCompare(title).indexOf(target) >= 0) score += 20;
  if (video.videoId || video._id || video.id) score += 5;
  return score;
}

function aggregateVideoCodeCandidates(video = {}) {
  return [
    video.code,
    video.number,
    video.videoId,
    video._id,
    video.id,
    video.title,
    video.title_zh,
    video.title_en,
    video.description,
    video.preview,
    video.preview_hp,
  ];
}

function extractStreamSearchCodeFromVideo(video = {}, params = {}) {
  const priorityCandidates = [
    video.code,
    video.number,
    video.title,
    video.title_zh,
    video.title_en,
    video.videoId,
    video._id,
    video.id,
    video.description,
    params.code,
    params.number,
    params.title,
    params.name,
    params.originalTitle,
    params.originalName,
    params.fileName,
    params.filename,
    params.link,
    params.url,
    params.detailUrl,
    params.pageUrl,
  ];

  appendNestedAggregateCandidates(priorityCandidates, params.sourceItem);
  appendNestedAggregateCandidates(priorityCandidates, params.info);
  appendNestedAggregateCandidates(priorityCandidates, params.mediaSource);

  for (const value of priorityCandidates) {
    const code = extractAggregateSearchCode(value, { allowPureNumeric: true });
    if (code) return code;
  }

  for (const value of collectStringValues([video, params])) {
    const code = extractAggregateSearchCode(value, { allowPureNumeric: false });
    if (code) return code;
  }

  return extractSupjavSearchCodeFromVideo(video, params);
}

function toAggregateResourceItems(video = {}, code = "", sources = [], params = {}) {
  const videoId = String(video.videoId || video._id || video.id || "").trim();
  const title = cleanText(video.title || video.title_zh || video.title_en || video.code || code);
  const referer = detailReferer(videoId, params);
  return toResourceItems(sources, params, referer).map((item) => ({
    name: item.name.indexOf("Netflav ") === 0 ? item.name : "Netflav " + item.name,
    description: [
      "番号：" + code,
      "来源：" + (item.description || "Netflav"),
      title ? "标题：" + title : "",
      referer ? "详情页：" + referer : "",
    ].filter(Boolean).join("\n"),
    url: item.url,
    playerType: item.playerType || VIDEO_PLAYER_TYPE,
    customHeaders: item.customHeaders,
  }));
}

function extractAggregateCodeFromParams(params = {}) {
  const priorityCandidates = [
    params.code,
    params.videoId,
    params.number,
    params.fileName,
    params.filename,
    params.file_name,
    params.name,
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
    params.id,
    params.title,
    params.seriesName,
    params.originalTitle,
    params.originalName,
    params.episodeName,
    params.description,
    params.genreTitle,
    params.overview,
    params.link,
    params.url,
    params.videoUrl,
    params.playUrl,
    params.streamUrl,
  ];

  appendNestedAggregateCandidates(priorityCandidates, params.tmdbInfo);
  appendNestedAggregateCandidates(priorityCandidates, params.info);
  appendNestedAggregateCandidates(priorityCandidates, params.sourceItem);
  appendNestedAggregateCandidates(priorityCandidates, params.mediaSource);

  if (Array.isArray(params.mediaSources)) {
    for (const source of params.mediaSources) appendNestedAggregateCandidates(priorityCandidates, source);
  }

  for (const value of priorityCandidates) {
    const code = extractAggregateSearchCode(value, { allowPureNumeric: true });
    if (code) return code;
  }

  const allStrings = collectStringValues(params);
  for (const value of allStrings) {
    const code = extractAggregateSearchCode(value, { allowPureNumeric: false });
    if (code) return code;
  }

  return "";
}

function appendNestedAggregateCandidates(out, value = {}) {
  if (!value || typeof value !== "object") return;
  out.push(
    value.code,
    value.videoId,
    value.number,
    value.title,
    value.name,
    value.originalTitle,
    value.originalName,
    value.fileName,
    value.filename,
    value.path,
    value.url,
    value.link,
    value.streamUrl,
    value.description,
    value.overview
  );
}

function extractAggregateSearchCode(text, options = {}) {
  const allowPureNumeric = options.allowPureNumeric === true;
  let raw = cleanText(text);
  if (!raw) return "";
  const looksLikeUrl = /^https?:\/\//i.test(raw) || raw.startsWith("//");
  if (looksLikeUrl && (isPreviewUrl(raw) || isStaticAssetUrl(raw))) return "";

  raw = safeDecodeURIComponent(raw)
    .replace(/^[a-z0-9]+(?:\.[a-z0-9]+)+@/i, "")
    .replace(/^(?:hhd800|hhb800)[_\-@.\s]?/i, "");

  if (/^https?:\/\//i.test(raw)) {
    raw = raw
      .replace(/^https?:\/\/[^/?#]+/i, " ")
      .replace(/[?#].*$/, " ");
  }

  const value = raw
    .toUpperCase()
    .replace(/\./g, " ")
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const special = [
    ["FC2", /\bFC2(?:[- ]?PPV)?[- ]?(\d{5,8})\b/i],
    ["CARIB", /\bCARIB[- ]?(\d{6,8})\b/i],
    ["1PONDO", /\b1PONDO[- ]?(\d{6,8})\b/i],
    ["HEYZO", /\bHEYZO[- ]?(\d{3,6})\b/i],
    ["T28", /\bT28[- ]?(\d{6,8})\b/i],
  ];
  for (const item of special) {
    const match = value.match(item[1]);
    if (match) return item[0] + "-" + match[1];
  }

  const knownMakerPattern = /\b(SONE|S2M|MIAA|SSNI|SNIS|IPX|IPZZ|SSIS|JUQ|MIDE|MIDV|STARS|ABW|RKI|DVAJ|WANZ|LULU|DLDSS|VRTM|SDMU|SDDE|MKMP|HMN|MUDR|ADN|CAWD|PPPE|PRED|MGR|SHKD|MXGS|FSDSS|JUL|KTB|MIAB|GVH|MIMK|JUY|JUTA|IDBD|HND|DASD|CLO|BF|HONB|ROE|CEMD|MIUM|NITR|RCTD|RCT|IPVR|MIBD|JUR|JURD|SOE|ORE|PYO|START|NSFS|ESD|GVG|REAL|LAF|SMD|BAD|MOND|ARSO|MOCKY|FONE|GANA|MUKO|PAPA|RASH|TAMA|ZUKO|HEY|PACO)\s*[-_ ]?\s*(\d{2,10}[A-Z]?)(?:[-_ ]?([A-Z]{1,4}))?\b/i;
  const makerMatch = value.match(knownMakerPattern);
  if (makerMatch) return makerMatch[1].toUpperCase() + "-" + makerMatch[2].toUpperCase() + (makerMatch[3] ? "-" + makerMatch[3].toUpperCase() : "");

  const generic = value.match(/\b([A-Z]{2,15})\s*[-_ ]?\s*(\d{2,10}[A-Z]?)(?:[-_ ]?([A-Z]{1,4}))?\b/i);
  if (generic) return generic[1].toUpperCase() + "-" + generic[2].toUpperCase() + (generic[3] ? "-" + generic[3].toUpperCase() : "");

  if (allowPureNumeric) {
    const numMatch = value.match(/\b(\d{4,8})\b/);
    if (numMatch) return numMatch[1];
  }

  return "";
}

function normalizeAggregateCodeForCompare(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (error) {
    return String(value || "");
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
    customHeaders: source.customHeaders || mediaHeaders(runtimeParams, source.referer || fallbackReferer),
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
  const streamMeta = detailStreamMetadata(video, params, sources);
  Object.assign(item, streamMeta);
  item.backdropPaths = unique([cleanImage(video.preview)].concat(video.previewImages || expandPreviewImages(video.previewImagesUrl))).filter(Boolean);
  item.genreItems = cleanTags(video.tags).map((title) => ({ id: title, title }));
  item.peoples = cleanPeople(video.actors).map((title) => ({ id: title, title, role: "actor" }));
  item.relatedItems = uniqueObjects([].concat(video.related1 || [], video.related2 || [], video.related || []))
    .filter((v) => String(v.videoId || "") !== String(video.videoId || ""))
    .map(toVideoItem);
  item.trailers = playableUrl(video.previewVideo) ? [{ coverUrl: item.posterPath, url: video.previewVideo }] : [];
  const firstSource = sources[0] || null;
  item.customHeaders = firstSource && firstSource.customHeaders
    ? firstSource.customHeaders
    : mediaHeaders(params, firstSource ? (firstSource.referer || detailReferer(video.videoId, params)) : detailReferer(video.videoId, params));
  if (firstSource) {
    item.videoUrl = firstSource.url;
    item.streamUrl = firstSource.url;
    item.playUrl = firstSource.url;
  }
  return item;
}

function detailStreamMetadata(video = {}, params = {}, sources = []) {
  const videoId = String(video.videoId || video._id || video.id || "").trim();
  const title = cleanText(video.title || video.title_zh || video.title_en || video.code || videoId);
  const code = extractStreamSearchCodeFromVideo(video, params);
  const detailUrl = detailReferer(videoId, params);
  const actors = cleanPeople(video.actors);
  const tags = cleanTags(video.tags);
  const mediaSources = detailMediaSources(sources, params, detailUrl);
  const posterPath = cleanImage(video.preview || video.preview_hp);
  const previewUrl = playableUrl(video.previewVideo);
  const sourceItem = compactParams({
    id: videoId,
    videoId,
    netflavVideoId: videoId,
    code,
    number: code,
    title,
    name: title,
    originalTitle: title,
    originalName: title,
    link: encodeDetailLink(videoId),
    url: detailUrl,
    detailUrl,
    pageUrl: detailUrl,
    posterPath,
    previewUrl,
  });

  return compactParams({
    provider: WidgetMetadata.id,
    sourceProvider: WidgetMetadata.id,
    currentWidgetId: WidgetMetadata.id,
    site: WidgetMetadata.site,
    id: videoId,
    videoId,
    netflavVideoId: videoId,
    code,
    number: code,
    title,
    name: title,
    originalTitle: title,
    originalName: title,
    keyword: code || title,
    searchKeyword: code || title,
    fileName: code || title,
    filename: code || title,
    link: encodeDetailLink(videoId),
    url: detailUrl,
    detailUrl,
    pageUrl: detailUrl,
    posterPath,
    previewUrl,
    description: cleanText(video.description || ""),
    actors,
    tags,
    peoples: actors.map((title) => ({ id: title, title, role: "actor" })),
    genreItems: tags.map((title) => ({ id: title, title })),
    sourceItem,
    mediaSource: mediaSources[0],
    mediaSources: mediaSources.length ? mediaSources : undefined,
  });
}

function detailMediaSources(sources = [], params = {}, fallbackReferer = "") {
  return (sources || []).map((source, index) => compactParams({
    name: "Netflav " + playbackName(source.url, index, source.resolution || source.quality),
    title: "Netflav " + playbackName(source.url, index, source.resolution || source.quality),
    source: source.source || "Netflav",
    quality: source.resolution || source.quality || "",
    resolution: source.resolution || "",
    url: source.url,
    streamUrl: source.url,
    playUrl: source.url,
    videoUrl: source.url,
    referer: source.referer || fallbackReferer,
    customHeaders: source.customHeaders || mediaHeaders(params, source.referer || fallbackReferer),
  })).filter((source) => source.url);
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

async function collectPlayableSourcesWithFallback(video = {}, params = {}) {
  return await collectPlayableSourcesFallbackChain(video, params, true);
}

async function collectDetailEntryPlayableSources(video = {}, params = {}) {
  const streamSources = await collectAppModuleFallbackSources(video, params);
  if (streamSources.length) return streamSources;
  return await collectPlayableSourcesFallbackChain(video, params, false);
}

async function collectPlayableSourcesFallbackChain(video = {}, params = {}, includeAppFallback = true) {
  const primary = await collectPlayableSources(video, params);
  if (primary.length) return primary;

  const pageSources = await collectDetailPageSources(video, params);
  if (pageSources.length) return pageSources;

  const supjavSources = await collectSupjavFallbackSources(video, params);
  if (supjavSources.length) return supjavSources;

  return includeAppFallback ? await collectAppModuleFallbackSources(video, params) : [];
}

async function collectDetailPageSources(video = {}, params = {}) {
  const videoId = String(video.videoId || video._id || video.id || "").trim();
  if (!videoId) return [];
  const referer = detailReferer(videoId, params);
  try {
    const res = await Widget.http.get(referer, { headers: buildHeaders(params) });
    const html = String((res && res.data) || "");
    const candidates = extractHtmlPlayableCandidates(html, referer, params.baseUrl || DEFAULT_BASE_URL);
    return await resolveHighestQualityCandidates(candidates, params);
  } catch (error) {
    console.error("[netflav][collectDetailPageSources] 详情页兜底失败:", error.message || error);
    return [];
  }
}

function extractHtmlPlayableCandidates(html, referer = "", baseUrl = DEFAULT_BASE_URL) {
  const source = decodeHtmlSource(html);
  const candidates = [];
  collectHtmlPlayableMatches(candidates, source, /<(?:source|video|iframe)\b[^>]*(?:src|data-src)=["']([^"']+)["']/gi, 1, referer, baseUrl);
  collectHtmlPlayableMatches(candidates, source, /\b(?:file|src|url|source|hls|m3u8|video|videoUrl|video_url|playUrl)\s*[:=]\s*["']([^"']+)["']/gi, 1, referer, baseUrl);
  collectHtmlPlayableMatches(candidates, source, /(https?:\/\/[^"'<>\s\\]+(?:\.m3u8|\.mp4|\.webm|\/(?:get_file|download|stream|video|media|hls|playlist|master|source|file))(?:[^"'<>\s\\]*)?)/gi, 1, referer, baseUrl);
  collectHtmlPlayableMatches(candidates, source, /["']((?:\/\/|\/)[^"']*(?:\.m3u8|\.mp4|\.webm|\/(?:get_file|download|stream|video|media|hls|playlist|master|source|file))[^"']*)["']/gi, 1, referer, baseUrl);
  return uniqueCandidates(candidates);
}

function collectHtmlPlayableMatches(candidates, source, re, groupIndex, referer, baseUrl) {
  let match;
  while ((match = re.exec(source || ""))) {
    const url = absolutizeUrl(match[groupIndex], referer || baseUrl);
    if (isHtmlPlayableCandidate(url, referer)) pushCandidate(candidates, { url, source: "Netflav 页面", referer });
  }
}

function isHtmlPlayableCandidate(url, referer = "") {
  return isPlayableCandidate(url) && !isLikelyDetailPageUrl(url, referer);
}

function isLikelyDetailPageUrl(url, referer = "") {
  const value = playableUrl(url).split("#")[0];
  if (!value) return false;
  if (value === playableUrl(referer).split("#")[0]) return true;
  return originFromUrl(value) === originFromUrl(referer) && /\/video\?(?:[^#]*&)?id=/i.test(value);
}

function decodeHtmlSource(html) {
  return String(html || "")
    .replace(/\\\//g, "/")
    .replace(/&amp;|&#38;/gi, "&")
    .replace(/&quot;|&#34;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'");
}

async function collectSupjavFallbackSources(video = {}, params = {}) {
  const code = extractSupjavSearchCodeFromVideo(video, params);
  if (!code) return [];
  try {
    const detailUrl = await supjavDetailUrlForCode(code, params);
    if (!detailUrl) return [];
    const masterUrl = await supjavMasterByDetailUrl(detailUrl, params);
    if (!masterUrl) return [];
    return uniqueCandidates([{
      url: masterUrl,
      source: `Supjav TV ${code}`,
      quality: "1080P",
      referer: supjavMediaReferer(masterUrl),
      customHeaders: supjavMediaHeaders(masterUrl),
    }]);
  } catch (error) {
    console.error("[netflav][collectSupjavFallbackSources] Supjav 兜底失败:", error.message || error);
    return [];
  }
}

function extractSupjavSearchCodeFromVideo(video = {}, params = {}) {
  const candidates = [
    params.code,
    params.number,
    params.title,
    params.name,
    video.code,
    video.number,
    video.videoId,
    video._id,
    video.title,
    video.title_zh,
    video.title_en,
    video.description,
    video.preview,
    video.preview_hp,
  ];
  for (const value of candidates) {
    const code = extractSupjavSearchCode(value, { allowPureNumeric: false, allowHtmlId: false });
    if (code) return code;
  }
  for (const value of collectStringValues([params, video])) {
    const code = extractSupjavSearchCode(value, { allowPureNumeric: false, allowHtmlId: false });
    if (code) return code;
  }
  return "";
}

function extractSupjavSearchCode(text, options = {}) {
  const allowPureNumeric = options.allowPureNumeric === true;
  const allowHtmlId = options.allowHtmlId === true;
  const raw = cleanText(text);
  if (!raw) return "";
  const looksLikeUrl = /^https?:\/\//i.test(raw) || raw.includes("/");
  if (looksLikeUrl && (isPreviewUrl(raw) || isStaticAssetUrl(raw))) return "";
  if (/^https?:\/\//i.test(raw) && !/supjav\.com\/(?:[a-z]{2}\/)?\d{4,8}\.html/i.test(raw)) return "";
  let value = raw.toUpperCase();
  if (!value) return "";
  value = value
    .replace(/^[A-Z0-9]+(?:\.[A-Z0-9]+)+@/, "")
    .replace(/^(?:HHD800|HHB800)[_\-@.\s]?/, "")
    .replace(/\./g, " ")
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const knownMakerPattern = /\b(?:SONE|S2M|MIAA|SSNI|SNIS|IPX|IPZZ|SSIS|JUQ|MIDE|MIDV|STARS|ABW|RKI|DVAJ|WANZ|LULU|DLDSS|VRTM|SDMU|SDDE|MKMP|HMN|MUDR|ADN|CAWD|PPPE|PRED|MGR|SHKD|MXGS|FSDSS|JUL|KTB|MIAB|GVH|MIMK|JUY|JUTA|IDBD|HND|DASD|CLO|BF|HONB|ROE|CEMD|MIUM|NITR|RCTD|RCT|IPVR|MIBD|JUR|JURD|SOE|ORE|PYO|START|NSFS|ESD|GVG|REAL|LAF|SMD|MD|BAD|MOND|ARSO|MOCKY|FONE|GANA|MUKO|PAPA|RASH|TAMA|ZUKO|HEY|PACO)\s*[-_ ]?\d{2,6}[A-Z]?(?:[-_ ]?[A-Z]{0,4})?\b/i;
  const makerMatch = value.match(knownMakerPattern);
  if (makerMatch && makerMatch[0]) return normalizeSupjavCode(makerMatch[0]);

  const special = [
    ["FC2", /\bFC2(?:[- ]?PPV)?[- ]?(\d{5,8})\b/i],
    ["CARIB", /\bCARIB[- ]?(\d{6,8})\b/i],
    ["1PONDO", /\b1PONDO[- ]?(\d{6,8})\b/i],
    ["HEYZO", /\bHEYZO[- ]?(\d{3,6})\b/i],
    ["T28", /\bT28[- ]?(\d{6,8})\b/i],
  ];
  for (const item of special) {
    const match = value.match(item[1]);
    if (match) return item[0] + "-" + match[1];
  }

  const generic = value.match(/\b([A-Z]{2,15})\s*[-_ ]?\s*(\d{2,10})\b/i);
  if (generic) return generic[1].toUpperCase() + "-" + generic[2];

  if (allowPureNumeric) {
    const numMatch = value.match(/\b(\d{4,8})\b/);
    if (numMatch) return numMatch[1];
  }
  if (allowHtmlId) {
    const urlNumMatch = value.match(/(\d{4,8})\.html/);
    if (urlNumMatch) return urlNumMatch[1];
  }
  return "";
}

function normalizeSupjavCode(value) {
  return cleanText(value).replace(/\s+/g, "").replace(/_/g, "-").replace(/-+/g, "-").toUpperCase();
}

async function supjavDetailUrlForCode(code, params = {}) {
  if (/^\d{4,8}$/.test(code)) return `${SUPJAV_BASE}/${code}.html`;
  const searchUrl = `${SUPJAV_BASE}/?s=${encodeURIComponent(code)}`;
  const res = await Widget.http.get(searchUrl, {
    headers: supjavHeaders(params),
    timeout: SUPJAV_REQUEST_TIMEOUT,
  });
  assertHttpOk(res, "Supjav 搜索页");
  const html = String((res && res.data) || "");
  if (isCloudflarePage(html)) throw new Error("Supjav 搜索页被 Cloudflare 拦截");
  const id = selectSupjavSearchId(html, code);
  return id ? `${SUPJAV_BASE}/${id}.html` : "";
}

function selectSupjavSearchId(html, code) {
  const results = [];
  const source = decodeHtmlSource(html);
  const re = /<a\b([^>]*href=["'](?:https?:\/\/supjav\.com)?(?:\/[a-z]{2})?\/(\d{4,8})\.html["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(source))) {
    const title = cleanHtmlText(firstByRe(match[1], /\btitle=["']([^"']+)["']/i) || firstByRe(match[3], /\balt=["']([^"']+)["']/i) || match[3]);
    results.push({ id: match[2], title });
  }
  if (!results.length) {
    const ids = [];
    const idRe = /href=["'](?:https?:\/\/supjav\.com)?(?:\/[a-z]{2})?\/(\d{4,8})\.html["']/gi;
    while ((match = idRe.exec(source))) ids.push(match[1]);
    for (const id of unique(ids)) results.push({ id, title: "" });
  }
  if (!results.length) throw new Error("Supjav 搜索页未找到详情页");
  const target = normalizeSupjavCode(code).replace(/-/g, "");
  const matched = results.find((item) => normalizeSupjavCode(item.title).replace(/-/g, "").includes(target));
  return (matched || results[0]).id;
}

async function supjavMasterByDetailUrl(detailUrl, params = {}) {
  const detail = await Widget.http.get(detailUrl, {
    headers: supjavHeaders(params),
    timeout: SUPJAV_REQUEST_TIMEOUT,
  });
  assertHttpOk(detail, "Supjav 详情页");
  const html = String((detail && detail.data) || "");
  if (isCloudflarePage(html)) throw new Error("Supjav 详情页被 Cloudflare 拦截");
  const serverMap = supjavServerMap(html);
  const dataLink = serverMap.TV || serverMap.tv || "";
  if (!dataLink) throw new Error("Supjav 详情页未找到 TV data-link");
  const apiUrl = `${SUPJAV_API}?c=${encodeURIComponent(reverseString(dataLink))}`;
  const api = await Widget.http.get(apiUrl, {
    headers: supjavHeaders(params, { Referer: SUPJAV_BASE + "/", Origin: SUPJAV_BASE }),
    timeout: SUPJAV_REQUEST_TIMEOUT,
  });
  assertHttpOk(api, "Supjav 播放 API");
  const masterUrl = extractSupjavM3U8(api && api.data);
  if (!masterUrl) throw new Error("Supjav 播放 API 未返回 m3u8");
  return masterUrl;
}

function supjavServerMap(html) {
  const map = {};
  const re = /data-link=["']([^"']+)["'][^>]*>\s*([^<]+?)\s*<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const dataLink = cleanText(match[1]);
    const name = cleanText(match[2]);
    if (dataLink && name) map[name] = dataLink;
  }
  return map;
}

function extractSupjavM3U8(text) {
  const source = decodeHtmlSource(text);
  const play = source.match(/urlPlay.*?(https?:\/\/[^"'\\\s<>]+?\.m3u8[^"'\\\s<>]*)/i);
  if (play && play[1]) return play[1];
  const any = source.match(/https?:\/\/[^"'\\\s<>]+?\.m3u8[^"'\\\s<>]*/i);
  return any && any[0] ? any[0] : "";
}

function supjavHeaders(params = {}, extra = {}) {
  const headers = {
    "User-Agent": SUPJAV_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: SUPJAV_BASE + "/",
  };
  const cookie = normalizeCookie(params.supjavCookie || params.cookie);
  if (cookie) headers.Cookie = cookie;
  for (const key in extra || {}) headers[key] = extra[key];
  return headers;
}

function supjavMediaReferer(url) {
  const origin = originFromUrl(url);
  return origin ? origin + "/" : SUPJAV_BASE + "/";
}

function supjavMediaHeaders(url) {
  return {
    Referer: supjavMediaReferer(url),
    "User-Agent": SUPJAV_UA,
    Accept: "*/*",
  };
}

function reverseString(value) {
  return String(value || "").split("").reverse().join("");
}

function isCloudflarePage(html) {
  return /Just a moment|cf-browser-verification|cf-challenge/i.test(String(html || ""));
}

function assertHttpOk(res, label) {
  const status = Number((res && (res.statusCode || res.status)) || 200);
  if (!res || status < 200 || status >= 300) throw new Error(`${label} HTTP ${status || "无响应"}`);
}

async function collectAppModuleFallbackSources(video = {}, params = {}) {
  const bridges = appModuleFallbackBridges();
  if (!bridges.length) return [];
  const payload = appModuleFallbackPayload(video, params);
  for (const bridge of bridges) {
    try {
      const result = await bridge.call(payload);
      const candidates = normalizeFallbackResourceCandidates(result, params, detailReferer(video.videoId || video._id || video.id, params));
      const sources = await resolveHighestQualityCandidates(candidates, params);
      if (sources.length) return sources;
    } catch (error) {
      console.error("[netflav][collectAppModuleFallbackSources] " + bridge.name + " 兜底失败:", error.message || error);
    }
  }
  return [];
}

function appModuleFallbackBridges() {
  const bridges = [];
  if (typeof Widget === "undefined" || !Widget) return bridges;
  addAppBridge(bridges, "searchPlaybackSources", Widget, Widget.searchPlaybackSources);
  addAppBridge(bridges, "searchVideoResources", Widget, Widget.searchVideoResources);
  addAppBridge(bridges, "resolvePlaybackSources", Widget, Widget.resolvePlaybackSources);
  addAppBridge(bridges, "findPlaybackSources", Widget, Widget.findPlaybackSources);
  addAppBridge(bridges, "searchStreamSources", Widget, Widget.searchStreamSources);
  addAppBridge(bridges, "searchStreamResources", Widget, Widget.searchStreamResources);
  addAppBridge(bridges, "resolveStreamSources", Widget, Widget.resolveStreamSources);
  addAppBridge(bridges, "resolveStreamResources", Widget, Widget.resolveStreamResources);
  addAppBridge(bridges, "findStreamSources", Widget, Widget.findStreamSources);
  addAppBridge(bridges, "findStreamResources", Widget, Widget.findStreamResources);
  addAppBridge(bridges, "searchImportedStreams", Widget, Widget.searchImportedStreams);
  addAppBridge(bridges, "searchImportedStreamSources", Widget, Widget.searchImportedStreamSources);
  addAppBridge(bridges, "invokeStreamModules", Widget, Widget.invokeStreamModules);
  addAppBridge(bridges, "callStreamModules", Widget, Widget.callStreamModules);
  addAppBridge(bridges, "stream.search", Widget.stream, Widget.stream && Widget.stream.search);
  addAppBridge(bridges, "stream.resolve", Widget.stream, Widget.stream && Widget.stream.resolve);
  addAppBridge(bridges, "streams.search", Widget.streams, Widget.streams && Widget.streams.search);
  addAppBridge(bridges, "streams.resolve", Widget.streams, Widget.streams && Widget.streams.resolve);
  addAppBridge(bridges, "streamModules.search", Widget.streamModules, Widget.streamModules && Widget.streamModules.search);
  addAppBridge(bridges, "streamModules.resolve", Widget.streamModules, Widget.streamModules && Widget.streamModules.resolve);
  return bridges;
}

function addAppBridge(bridges, name, owner, fn) {
  if (typeof fn !== "function") return;
  for (const bridge of bridges) {
    if (bridge.fn === fn) return;
  }
  bridges.push({
    name,
    fn,
    call: (payload) => fn.call(owner || Widget, payload),
  });
}

function appModuleFallbackPayload(video = {}, params = {}) {
  const meta = detailStreamMetadata(video, params, []);
  return compactParams(Object.assign({}, meta, {
    provider: WidgetMetadata.id,
    sourceProvider: WidgetMetadata.id,
    currentWidgetId: WidgetMetadata.id,
    excludeProvider: WidgetMetadata.id,
    fallbackType: "stream",
    targetType: "stream",
    useImportedStreams: true,
  }));
}

function normalizeFallbackResourceCandidates(result, params = {}, referer = "") {
  const candidates = [];
  for (const item of flattenFallbackResult(result)) {
    const candidate = sourceCandidateFromEntry(item, { source: "App 其它模块", referer });
    if (candidate.url && isPlayableCandidate(candidate.url)) pushCandidate(candidates, candidate);
  }
  return uniqueCandidates(candidates);
}

function flattenFallbackResult(value, out = [], depth = 0, visited = []) {
  if (!value) return out;
  if (depth > 6) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenFallbackResult(item, out, depth + 1, visited);
    return out;
  }
  if (typeof value === "object") {
    for (const item of visited) {
      if (item === value) return out;
    }
    visited.push(value);
    if (value.url || value.videoUrl || value.src || value.file || value.hls || value.m3u8 || value.playUrl) out.push(value);
    const priorityKeys = ["resources", "sources", "streams", "streamSources", "items", "result", "data", "videos", "modules", "providers", "matches"];
    for (const key of priorityKeys) flattenFallbackResult(value[key], out, depth + 1, visited);
    for (const key in value) {
      if (priorityKeys.indexOf(key) >= 0) continue;
      flattenFallbackResult(value[key], out, depth + 1, visited);
    }
  }
  return out;
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
  const referer = (entry && typeof entry === "object" && (entry.referer || entry.referrer || entry.pageUrl || entry.detailUrl)) || defaults.referer || "";
  const customHeaders = (entry && typeof entry === "object" && (entry.customHeaders || entry.headers)) || defaults.customHeaders || null;
  return {
    url: playableUrl(url),
    source: cleanText(source),
    quality: cleanText(quality),
    referer,
    customHeaders,
  };
}

function pushCandidate(candidates, candidate = {}) {
  const url = playableUrl(candidate.url);
  if (!url || String(url).startsWith("magnet:") || isPreviewUrl(url) || isStaticAssetUrl(url)) return;
  candidates.push({
    url,
    source: candidate.source || "Netflav",
    quality: candidate.quality || "",
    resolution: candidate.resolution || "",
    bandwidth: Number(candidate.bandwidth || 0),
    referer: candidate.referer || "",
    customHeaders: candidate.customHeaders || null,
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
  return !!value && !isPreviewUrl(value) && !isStaticAssetUrl(value) && /\.(m3u8|mp4|webm)(?:[?#]|$)/i.test(value);
}

function isPlayableCandidate(url) {
  const value = playableUrl(url).toLowerCase();
  return !!value && !isPreviewUrl(value) && !isStaticAssetUrl(value) && (
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
      headers: candidate.customHeaders || mediaHeaders(params, candidate.referer),
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
      customHeaders: candidate.customHeaders || null,
    })))[0];
    if (hasSeparateAudioRendition(text)) {
      return [{
        url: candidate.url,
        source: candidate.source || "HLS Master",
        quality: best && best.resolution ? best.resolution : candidate.quality,
        resolution: best && best.resolution,
        bandwidth: best && best.bandwidth,
        referer: candidate.referer,
        customHeaders: candidate.customHeaders || null,
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
    if (!url || seen[url] || isPreviewUrl(url) || isStaticAssetUrl(url)) continue;
    seen[url] = true;
    out.push({
      url,
      source: candidate.source || "Netflav",
      quality: candidate.quality || "",
      resolution: candidate.resolution || "",
      bandwidth: Number(candidate.bandwidth || 0),
      referer: candidate.referer || "",
      customHeaders: candidate.customHeaders || null,
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
  return /(?:freepv|\/pv\/|preview|sample|trailer|teaser|thumb|thumbnail|poster)/i.test(value);
}

function isStaticAssetUrl(url) {
  return /\.(?:jpe?g|png|gif|webp|avif|bmp|svg|ico)(?:[?#]|$)/i.test(playableUrl(url));
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

function directNetflavVideoIdFromParams(params = {}, runtimeParams = {}) {
  const linkValues = [params.link, params.detailUrl, params.pageUrl, params.url];
  for (const value of linkValues) {
    const videoId = decodeDirectNetflavVideoId(value, runtimeParams);
    if (videoId) return videoId;
  }
  return decodeDetailLink(params.videoId || params.id);
}

function decodeDirectNetflavVideoId(value, runtimeParams = {}) {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("share:")) return "";
  if (raw.startsWith("detail:")) return decodeDetailLink(raw);
  if (/^https?:\/\//i.test(raw)) {
    const baseOrigin = originFromUrl(normalizeBaseUrl(runtimeParams.baseUrl || DEFAULT_BASE_URL));
    const rawOrigin = originFromUrl(raw);
    if (rawOrigin !== baseOrigin && !/\/\/(?:www\.)?netflav\./i.test(raw)) return "";
    const match = raw.match(/[?&]id=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
  if (raw.indexOf("/") >= 0 || raw.indexOf("?") >= 0 || raw.indexOf("#") >= 0) return "";
  return raw;
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

function randomPlaylistSelection(value) {
  const shareCode = playlistCodeFromValue(value);
  if (shareCode) return { shareCode, slotIndex: 0 };
  const slot = Number(firstByRe(value, /^__randomSlot:(\d+)$/i));
  return {
    shareCode: "",
    slotIndex: Number.isFinite(slot) && slot >= 0 ? Math.floor(slot) : 0,
  };
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
    supjavCookie: normalizeCookie(params.supjavCookie || params.cookie || ""),
  });
}

function getRuntimeParams() {
  return Widget.storage.get("netflav.runtimeParams") || { baseUrl: DEFAULT_BASE_URL, apiBase: DEFAULT_API_BASE, supjavCookie: "" };
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

function normalizeCookie(cookie) {
  return cleanText(cookie)
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("; ");
}

function collectStringValues(value, depth = 0, out = [], visited = []) {
  if (value === null || value === undefined || depth > 5) return out;
  const type = typeof value;
  if (type === "string" || type === "number") {
    const text = String(value).trim();
    if (text) out.push(text);
    return out;
  }
  if (type !== "object") return out;
  for (const item of visited) {
    if (item === value) return out;
  }
  visited.push(value);
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, depth + 1, out, visited);
    return out;
  }
  for (const key in value) collectStringValues(value[key], depth + 1, out, visited);
  return out;
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
