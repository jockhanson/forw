WidgetMetadata = {
  id: "forward.javdb",
  title: "Javdbs",
  version: "1.0.4",
  requiredVersion: "0.0.1",
  description: "JavDB 列表、搜索与详情元数据模块",
  author: "Forward",
  site: "https://javdb.com/",
  detailCacheDuration: 0,
  globalParams: [
    inputParam("baseUrl", "站点地址", "https://javdb.com", [["JavDB", "https://javdb.com"], ["JavDB", "https://javdb570.com"]]),
    inputParam("cfCookie", "Cloudflare Cookie", "", [["浏览器通过验证后的 Cookie", "cf_clearance=..."]]),
    inputParam("loginCookie", "登录 Cookie", "", [["JavDB 登录后的完整 Cookie", "_jdb_session=...; remember_user_token=..."]]),
    inputParam("userAgent", "User-Agent", "", [["留空使用默认；如 Cookie 无效请填获取 Cookie 时浏览器的 UA", ""]]),
    inputParam("javbusCookie", "JavBus Cookie", "", [["用于详情页“磁力链接”区块", ""]]),
    inputParam("pan115Cookie", "115 Cookie", "", [["点击磁力链接提交 115 离线；留空时读取 pan115.cookie 缓存", ""]]),
  ],
  modules: [
    moduleEntry("loadCategories", "类别", 1800, [
      enumParam("category", "类别", "", [["有码", "censored"], ["无码", "uncensored"], ["欧美", "western"], ["FC2", "fc2"], ["动漫", "anime"]]),
      sortParam(true),
    ].concat(commonListParams("video"))),
    moduleEntry("loadRankings", "排行榜", 1800, [
      enumParam("category", "排行榜", "rankings/movies", [["热门", "rankings/movies"], ["TOP250", "rankings/top250"], ["有码", "rankings/censored"], ["无码", "rankings/uncensored"], ["欧美", "rankings/western"], ["FC2", "rankings/fc2"], ["FANZA成人奖", "rankings/fanza_adult_award"]]),
    ].concat(commonListParams("video"))),
    actorModule("loadActorRecommended", "推荐演员", "actors", "推荐"),
    actorModule("loadActorUncensored", "无码演员", "actors/uncensored", "无码"),
    actorModule("loadActorCensored", "有码演员", "actors/censored", "有码"),
    actorModule("loadActorWestern", "欧美演员", "actors/western", "欧美"),
    moduleEntry("loadSeries", "系列", 3600, [
      enumParam("category", "系列", "series", [["有码系列", "series"], ["无码", "series/uncensored"], ["欧美", "series/western"], ["LUXU", "video_codes/LUXU"], ["ARA", "video_codes/ARA"], ["MAAN", "video_codes/MAAN"], ["MIUM", "video_codes/MIUM"], ["SIRO", "video_codes/SIRO"], ["GANA", "video_codes/GANA"]]),
      inputParam("seriesId", "分类筛选", "", [["留空显示系列列表；填系列路径显示影片", "series/example"], ["系列示例 rY2v", "https://javdb.com/series/rY2v"]]),
    ].concat(commonListParams("series"))),
    makerModule("loadMakerUncensored", "无码片商", "makers/uncensored", 3600, [["留空显示无码片商列表；填列表里的片商路径显示作品", "makers/example"], ["Heydouga", "https://javdb.com/makers/xZyO?f=download"]]),
    makerModule("loadMakerCensored", "有码片商", "makers", 3600, [["留空显示有码片商列表；填列表里的片商路径显示作品", "makers/example"], ["S1 NO.1 STYLE", "https://javdb.com/makers/7R?f=download"]]),
    makerModule("loadMakerMadou", "麻豆传媒", "makers/N73g?f=download", 1800, [["麻豆传媒", "https://javdb.com/makers/N73g?f=download"]]),
    moduleEntry("loadLatest", "最近更新", 900, [
      enumParam("category", "类别", "", [["全部", ""], ["有码", "censored"], ["无码", "uncensored"], ["欧美", "western"], ["FC2", "fc2"], ["动漫", "anime"]]),
      sortParam(false),
    ].concat(commonListParams("video"))),
  ],
  search: {
    title: "搜索",
    functionName: "search",
    params: [
      inputParam("keyword", "关键词"),
      enumParam("searchType", "搜索范围", "all", [["全部", "all"], ["演员", "actor"]]),
      pageParam(),
      sortParam(true),
    ],
  },
};

function moduleEntry(id, title, cacheDuration, params) {
  return { id, title, functionName: "loadList", cacheDuration, requiresWebView: false, params };
}

function actorModule(id, title, category, label) {
  return moduleEntry(id, title, 3600, [
    constParam("category", "演员", category),
    inputParam("actorId", "分类筛选", "", [["留空显示" + label + "演员列表；填列表里的演员路径显示作品", "actors/example"], ["演员示例 eKbnd", "https://javdb.com/actors/eKbnd"]]),
  ].concat(commonListParams("actor")));
}

function makerModule(id, title, category, cacheDuration, placeholders) {
  return moduleEntry(id, title, cacheDuration, [
    constParam("category", "片商", category),
    inputParam("makerId", "分类筛选", "", placeholders),
  ].concat(commonListParams("maker")));
}

function commonListParams(kind) {
  return [
    constParam("listKind", "列表类型", kind),
    constParam("genreId", "分类ID", ""),
    constParam("peopleId", "演员ID", ""),
    pageParam(),
  ];
}

function inputParam(name, title, value, placeholders) {
  const param = { name, title, type: "input", value: value || "" };
  if (placeholders) param.placeholders = optionList(placeholders);
  return param;
}

function enumParam(name, title, value, options) {
  return { name, title, type: "enumeration", value, enumOptions: optionList(options) };
}

function sortParam(includeDefault) {
  const options = includeDefault ? [["默认", ""], ["发布日期", "1"], ["磁链更新", "2"]] : [["发布日期", "1"], ["磁链更新", "2"]];
  return enumParam("sortType", "排序", includeDefault ? "" : "1", options);
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

const DEFAULT_BASE_URL = "https://javdb.com";
const DEFAULT_LOGIN_COOKIE = "";
const RUNTIME_KEY = "javdb.runtimeParams";
const JAVBUS_BASE_URL = "https://www.javbus.com";
const JAVBUS_AJAX_URL = JAVBUS_BASE_URL + "/ajax/uncledatoolsbyajax.php";
const PAN115_COOKIE_KEY = "pan115.cookie";
const VIDEO_CODE_RE = /(?:FC2(?:[-_\s]*PPV)?[-_\s]*\d{4,}|1PONDO[-_\s]*\d{6,8}|CARIB[-_\s]*\d{6,8}|HEYZO[-_\s]*\d{3,6}|T28[-_\s]*\d{6,8}|[A-Z]{2,15}[-_\s]?\d{2,}[A-Z]?)/i;

async function loadList(params = {}) {
  try {
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const actorRoute = params.listKind === "actor" ? actorRouteParam(params) : "";
    const seriesRoute = params.listKind === "series" ? seriesRouteParam(params) : "";
    const makerRoute = params.listKind === "maker" ? makerRouteParam(params) : "";
    const route = actorRoute || seriesRoute || makerRoute || params.peopleId || params.genreId || params.category || "";
    const isRoutedFromDetail = !!(params.peopleId || params.genreId);
    const html = await fetchPage(pageUrl(runtimeParams.baseUrl, route, page, params.sortType), runtimeParams);
    if (actorRoute || seriesRoute || makerRoute || isDirectVideoCategory(params.listKind, route)) return parseVideoList(html, runtimeParams.baseUrl);
    if (!isRoutedFromDetail && isEntityListKind(params.listKind)) {
      const entities = parseEntityList(html, runtimeParams.baseUrl, params.listKind);
      if (entities.length) return entities;
    }
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
      sort_type: normalizeSortType(params.sortType),
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
    if (String(link || "").indexOf("offline-submit://") === 0) return await handleOfflineSubmitDetail(link, params);
    if (String(link || "").indexOf("magnet-status://") === 0) return buildOfflineReceipt(link, false, "磁力链接", "这是一张状态提示卡，请按卡片说明配置 Cookie 或稍后刷新。");
    const entityRoute = decodeEntityLink(link);
    if (entityRoute) return await loadEntityDetail(entityRoute, params);
    const href = normalizeJavDbUrl(decodeDetailLink(link), params.baseUrl);
    if (!href || !isJavDbDetailUrl(href)) return null;
    const baseUrl = getOrigin(href) || params.baseUrl;
    const html = await fetchPage(href, params);
    return await parseVideoDetail(html, href, baseUrl, params);
  } catch (error) {
    console.error("[javdb][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadEntityDetail(route, params = {}) {
  const href = pageUrl(params.baseUrl, route.path, 1, "");
  const html = await fetchPage(href, params);
  const title = entityDetailTitle(html, route) || entityTitle(route.kind);
  const poster = absolutize(
    firstByRe(html, /<meta\b[^>]*property=(["'])og:image\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstImage(firstBlockByClass(html, "profile")) ||
    firstImage(firstBlockByClass(html, "actor")) ||
    firstImage(firstBlockByClass(html, "maker")) ||
    firstImage(firstBlockByClass(html, "series")),
    params.baseUrl
  );
  const videos = parseVideoList(html, params.baseUrl);
  return {
    id: encodeEntityLink(route.kind, route.path),
    type: "url",
    mediaType: "movie",
    title,
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    description: entityTitle(route.kind) + (videos.length ? "\n" + videos.length + " 部影片" : ""),
    link: encodeEntityLink(route.kind, route.path),
    playerType: "system",
    episodeItems: videos,
    relatedItems: videos,
    childItems: videos,
  };
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
      throw new Error("目标站点返回 403/Cloudflare 验证或登录限制。请先在浏览器打开站点并通过验证/登录，然后把 Cookie 填入模块参数 Cloudflare Cookie 或 登录 Cookie");
    }
    if (message.includes("404")) throw new Error("HTTP_404:" + url);
    throw error;
  }
  const html = String((res && res.data) || "");
  if (!html) throw new Error("空响应: " + url);
  if (isCloudflareChallenge(html)) {
    throw new Error("目标站点返回 Cloudflare 验证页。请把浏览器通过验证后的 Cookie 填入 Cloudflare Cookie；如页面需要登录，也请填入登录 Cookie");
  }
  return html;
}

function parseVideoList(html, baseUrl) {
  const buckets = [];
  const bucketByHref = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']*\/v\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) {
    const href = normalizeJavDbUrl(match[2], baseUrl);
    if (!href) continue;
    const anchorHtml = match[0];
    const around = rowAround(html, match.index, anchorRe.lastIndex);
    if (!bucketByHref[href]) {
      bucketByHref[href] = { href, parts: [], poster: "" };
      buckets.push(bucketByHref[href]);
    }
    bucketByHref[href].parts.push(anchorHtml, around);
    if (!bucketByHref[href].poster) bucketByHref[href].poster = absolutize(firstImage(anchorHtml) || firstImage(around), baseUrl);
  }

  const items = [];
  for (const bucket of buckets) {
    const href = bucket.href;
    const combinedHtml = bucket.parts.join("\n");
    const poster = bucket.poster || absolutize(firstImage(combinedHtml), baseUrl);
    const metas = unique(extractClassTexts(combinedHtml, "meta"));
    const releaseDate = dateOnly(firstMeta(metas, /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/));
    const rawTitle = listTitle(combinedHtml);
    const code = normalizeCode(firstMeta(metas, VIDEO_CODE_RE) || extractVideoCode(combinedHtml) || extractVideoCode(rawTitle));
    const title = formatVideoTitle(code, rawTitle);
    if (!title || isNoiseTitle(title)) continue;

    const rating = firstRating(combinedHtml);
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

async function parseVideoDetail(html, href, baseUrl, params = {}) {
  const rawTitle = cleanTitle(
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
  const code = normalizeCode(infoValue(html, ["番號", "番号", "識別碼", "识别码", "ID", "Code"]) || extractVideoCode(rawTitle));
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
  const title = formatVideoTitle(code, rawTitle) || code || detailIdFromUrl(href) || "JavDB";
  const magnetItems = await buildJavBusMagnetItems(code, title, params);
  const visibleRelatedItems = magnetItems.concat(relatedItems);
  const streamMeta = detailStreamMetadata({
    href,
    baseUrl,
    code,
    title,
    poster,
    releaseDate,
    durationText,
    description,
    genres,
    peoples,
  });

  return Object.assign({
    type: "url",
    mediaType: "movie",
    title,
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
    relatedItems: visibleRelatedItems,
    episodeItems: magnetItems,
    childItems: magnetItems,
  }, streamMeta);
}

async function buildJavBusMagnetItems(code, detailTitle, params = {}) {
  const dvdId = normalizeCode(code);
  if (!dvdId) {
    return [buildMagnetStatusItem("unknown", "磁力链接｜未识别番号", "当前详情中没有可识别的番号，无法搜索 JavBus 磁力。")];
  }

  const cookie = normalizeLooseCookie(params.javbusCookie || storageGet("javbus.cookie"));
  if (!cookie) {
    console.log("[javdb][javbus] 未配置 JavBus Cookie，跳过磁力链接区块");
    return [buildMagnetStatusItem(dvdId, "磁力链接｜需要配置 JavBus Cookie", "请在 JavDB 全局参数填入 JavBus Cookie，或先打开/刷新 JavBus Magnet 模块让它缓存 Cookie。")];
  }

  try {
    const detail = await fetchJavBusDetail(dvdId, cookie);
    if (!detail || !detail.gid) {
      console.log("[javdb][javbus] 未找到 JavBus 详情:", dvdId);
      return [buildMagnetStatusItem(dvdId, "磁力链接｜未找到 JavBus 详情", "未在 JavBus 找到 " + dvdId + " 的可用详情或年龄验证未通过。")];
    }

    const html = await fetchJavBusAjax(detail, cookie);
    const items = parseJavBusMagnetItems(html, dvdId, detail.detailUrl, detailTitle);
    console.log("[javdb][javbus] 磁力链接数量:", items.length);
    return items.length ? items : [buildMagnetStatusItem(dvdId, "磁力链接｜暂无资源", "JavBus 暂未返回 " + dvdId + " 的磁力链接。")];
  } catch (error) {
    console.error("[javdb][javbus] 磁力链接加载失败:", error.message || error);
    return [buildMagnetStatusItem(dvdId, "磁力链接｜加载失败", String((error && error.message) || error || "未知错误"))];
  }
}

function buildMagnetStatusItem(code, title, message) {
  return {
    id: "javbus-magnet-status:" + String(code || "").toLowerCase(),
    type: "url",
    mediaType: "movie",
    title,
    description: message,
    link: "magnet-status://" + String(code || "").toLowerCase(),
    playerType: "system",
  };
}

async function fetchJavBusDetail(code, cookie) {
  const directUrl = JAVBUS_BASE_URL + "/" + encodeURIComponent(code);
  const direct = await fetchJavBusHtml(directUrl, cookie, JAVBUS_BASE_URL + "/");
  if (isJavBusBlocked(direct)) return null;

  let detail = parseJavBusDetail(direct, directUrl, code);
  if (detail.gid) return detail;

  const searchUrl = JAVBUS_BASE_URL + "/search/" + encodeURIComponent(code) + "&type=&parent=ce";
  const search = await fetchJavBusHtml(searchUrl, cookie, JAVBUS_BASE_URL + "/");
  if (isJavBusBlocked(search)) return null;

  const matchedUrl = findJavBusDetailUrl(search, code);
  if (!matchedUrl) return null;

  const matched = await fetchJavBusHtml(matchedUrl, cookie, searchUrl);
  if (isJavBusBlocked(matched)) return null;
  detail = parseJavBusDetail(matched, matchedUrl, code);
  return detail.gid ? detail : null;
}

async function fetchJavBusHtml(url, cookie, referer) {
  const response = await Widget.http.get(url, {
    headers: javBusHeaders(cookie, referer),
    timeout: 15000,
  });
  return String((response && response.data) || "");
}

async function fetchJavBusAjax(detail, cookie) {
  const response = await Widget.http.get(JAVBUS_AJAX_URL, {
    headers: Object.assign(javBusHeaders(cookie, detail.detailUrl), {
      "X-Requested-With": "XMLHttpRequest",
    }),
    params: {
      gid: detail.gid,
      lang: "zh",
      img: detail.img || "",
      uc: detail.uc || "0",
      floor: String(Math.floor(Math.random() * 1000 + 1)),
    },
    timeout: 15000,
  });
  return String((response && response.data) || "");
}

function javBusHeaders(cookie, referer) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: referer || JAVBUS_BASE_URL + "/",
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function isJavBusBlocked(html) {
  const lower = String(html || "").toLowerCase();
  return lower.indexOf("age verification javbus") >= 0 ||
    lower.indexOf('id="ageverify"') >= 0 ||
    lower.indexOf("doc/driver-verify") >= 0 ||
    lower.indexOf("你是否已經成年") >= 0 ||
    lower.indexOf("我已經成年") >= 0;
}

function parseJavBusDetail(html, detailUrl, code) {
  return {
    code,
    detailUrl,
    gid: extractJsValue(html, "gid"),
    uc: extractJsValue(html, "uc") || "0",
    img: extractJsValue(html, "img"),
  };
}

function findJavBusDetailUrl(html, code) {
  const target = normalizeCode(code).replace(/[^A-Z0-9]/g, "");
  const seen = {};
  const linkRe = /<a\b([^>]*href\s*=\s*(["'])[^"']+\2[^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(String(html || "")))) {
    const href = javBusAbsoluteUrl(attr(match[1], "href"));
    if (!href || seen[href]) continue;
    seen[href] = true;
    const last = href.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || "";
    const found = normalizeCode(last || cleanText(match[3])).replace(/[^A-Z0-9]/g, "");
    if (found && found === target) return href;
  }
  return "";
}

function javBusAbsoluteUrl(url) {
  const value = decodeHtml(String(url || "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  if (value.charAt(0) === "/") return JAVBUS_BASE_URL + value;
  return JAVBUS_BASE_URL + "/" + value;
}

function extractJsValue(html, name) {
  const patterns = [
    new RegExp("(?:var\\s+)?" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"),
    new RegExp("(?:var\\s+)?" + name + "\\s*=\\s*([^;\\s]+)", "i"),
    new RegExp("[?&]" + name + "=([^&\"'<>\\s]+)", "i"),
  ];
  for (const re of patterns) {
    const match = String(html || "").match(re);
    if (match) return decodeHtml(match[2] || match[1] || "");
  }
  return "";
}

function parseJavBusMagnetItems(html, code, detailUrl, detailTitle) {
  const rows = parseMagnetRows(html);
  const items = [];
  const seen = {};

  for (const row of rows) {
    const magnetRe = /magnet:\?xt=urn:btih:[^"'<>\s]+/ig;
    let match;
    while ((match = magnetRe.exec(row))) {
      const magnet = decodeHtml(match[0]);
      const hash = magnetInfoHash(magnet);
      const key = hash || stableId(magnet);
      if (!key || seen[key]) continue;
      seen[key] = true;

      const rowText = cleanText(row);
      const size = magnetSize(rowText);
      const date = magnetDate(rowText);
      const hasSubtitle = /字幕|中文字幕|subtitle|\bsub\b/i.test(rowText);
      const hasHd = /高清|\bHD\b|1080|720|4K/i.test(rowText);
      const tags = [];
      if (hasSubtitle) tags.push("[字幕]");
      if (hasHd) tags.push("[高清]");
      const title = "磁力链接｜" + (tags.join("") + code + (size ? " " + size : "")).trim();
      const link = buildOfflineSubmitLink(code, key, magnet, title, size);

      items.push({
        id: "javbus-magnet:" + code.toLowerCase() + ":" + key,
        type: "url",
        mediaType: "movie",
        title,
        description:
          "来源: JavBus\n" +
          "番号: " + (code || "未知") + "\n" +
          "大小: " + (size || "未知") + "\n" +
          "日期: " + (date || "未知") + "\n" +
          "字幕: " + (hasSubtitle ? "是" : "未知") + "\n" +
          "高清: " + (hasHd ? "是" : "未知") + "\n" +
          "详情页: " + detailUrl + "\n" +
          "操作: 点击保存到 115 网盘",
        link,
        playerType: "system",
        originalTitle: detailTitle || code,
        name: title,
      });
    }
  }

  return items;
}

function parseMagnetRows(html) {
  const rows = [];
  const trRe = /<tr\b[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = trRe.exec(String(html || "")))) rows.push(match[0]);
  if (rows.length) return rows;

  const text = String(html || "");
  const magnetRe = /magnet:\?xt=urn:btih:[^"'<>\s]+/gi;
  while ((match = magnetRe.exec(text))) {
    const start = Math.max(0, match.index - 300);
    const end = Math.min(text.length, match.index + match[0].length + 300);
    rows.push(text.slice(start, end));
  }
  return rows;
}

function magnetInfoHash(magnet) {
  const match = String(magnet || "").match(/btih:([a-z0-9]{32,40})/i);
  return match ? match[1].toLowerCase() : "";
}

function magnetSize(text) {
  const match = String(text || "").match(/\b(\d+(?:\.\d+)?\s*(?:GB|G|MB|M|GiB|MiB))\b/i);
  return match ? match[1].replace(/\s+/g, " ").toUpperCase() : "";
}

function magnetDate(text) {
  const match = String(text || "").match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
  return match ? match[1].replace(/[/.]/g, "-") : "";
}

function buildOfflineSubmitLink(code, candidateId, magnet, title, size) {
  const query = [
    "cid=" + encodeURIComponent(candidateId),
    "magnet=" + encodeURIComponent(magnet || ""),
    "title=" + encodeURIComponent(title || code || "磁力链接"),
    "source=javbus",
  ];
  if (size) query.push("size=" + encodeURIComponent(size));
  return "offline-submit://" + String(code || "").toLowerCase() + "?" + query.join("&");
}

async function handleOfflineSubmitDetail(link, params = {}) {
  const info = parseOfflineSubmitLink(link);
  if (!info.dvdId || !info.candidateId || !info.magnet) {
    return buildOfflineReceipt(link, false, "提交失败", "未找到有效的磁力链接。");
  }

  const submittedKey = "offline-submitted:" + info.dvdId + ":" + info.candidateId;
  const submitted = storageGetJSON(submittedKey, null);
  if (submitted && submitted.ok) {
    return buildOfflineReceipt(link, true, "此前已提交", "这条磁力已提交到 115。请返回原详情页刷新，等待资源匹配。");
  }

  const cookie = normalizeLooseCookie(params.pan115Cookie || storageGet(PAN115_COOKIE_KEY));
  if (!cookie) {
    return buildOfflineReceipt(link, false, "提交失败", "请先在 JavDB 全局参数填入 115 Cookie，或先让 pan115.js 成功加载一次以缓存 Cookie。");
  }

  let result;
  try {
    result = await pan115OfflineOneClick(cookie, info.magnet);
  } catch (error) {
    result = { state: false, error: String((error && error.message) || error) };
  }

  storageSetJSON(submittedKey, {
    ok: result && result.state === true,
    time: Date.now(),
    title: info.title,
    sizeText: info.size || "",
    message: (result && result.error) || "",
  });

  if (result && result.state === true) {
    return buildOfflineReceipt(link, true, "已提交到 115 离线下载", "任务已提交。请返回原详情页刷新，等待 115 资源匹配。");
  }
  return buildOfflineReceipt(link, false, "提交失败", (result && result.error) || "115 返回失败，请稍后重试。");
}

function parseOfflineSubmitLink(link) {
  const value = String(link || "");
  const rest = value.slice("offline-submit://".length);
  const qIdx = rest.indexOf("?");
  const rawDvdId = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  const query = qIdx >= 0 ? parseQueryString(rest.slice(qIdx + 1)) : {};
  const magnet = cleanText(query.magnet || query.maglink || query.url);
  const candidateId = cleanText(query.cid || query.id || query.infoHash || magnetInfoHash(magnet) || stableId(magnet));
  return {
    dvdId: cleanText(query.dvd || query.code || rawDvdId).toLowerCase(),
    candidateId,
    magnet,
    title: cleanText(query.title || query.name),
    size: cleanText(query.size || query.sizeText),
  };
}

function parseQueryString(query) {
  const out = {};
  String(query || "").split("&").forEach(function (pair) {
    if (!pair) return;
    const index = pair.indexOf("=");
    const key = index >= 0 ? pair.slice(0, index) : pair;
    const value = index >= 0 ? pair.slice(index + 1) : "";
    if (!key) return;
    try {
      out[key] = decodeURIComponent(value || "");
    } catch (_) {
      out[key] = value || "";
    }
  });
  return out;
}

async function pan115OfflineOneClick(cookie, magnet) {
  const token = await getPan115OfflineToken(cookie);
  return submitPan115OfflineTask(cookie, magnet, token);
}

async function getPan115OfflineToken(cookie) {
  const response = await Widget.http.get("https://115.com/?ct=offline&ac=space&_=" + Date.now(), {
    headers: pan115Headers(cookie),
    timeout: 15000,
  });
  const json = parseJsonPayload(response && response.data);
  if (!json || json.state !== true) {
    throw new Error("space 获取失败: " + ((json && (json.error || json.error_msg)) || JSON.stringify(json || {})));
  }
  return { sign: json.sign, time: json.time };
}

async function submitPan115OfflineTask(cookie, magnet, token) {
  const uid = extractUidFromCookie(cookie);
  const body = "url=" + encodeURIComponent(String(magnet || "").trim()) +
    "&uid=" + encodeURIComponent(uid) +
    "&sign=" + encodeURIComponent(token.sign) +
    "&time=" + encodeURIComponent(token.time);
  const response = await Widget.http.post(
    "https://115.com/web/lixian/?ct=lixian&ac=add_task_url",
    body,
    {
      headers: Object.assign(pan115Headers(cookie), {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://115.com",
        Referer: "https://115.com/",
      }),
      timeout: 20000,
    }
  );
  const json = parseJsonPayload(response && response.data);
  if (json && json.state === true) return { state: true, info_hash: json.info_hash || "" };
  return {
    state: false,
    error: json && json.errcode === "911" ? "账号使用异常，请手工验证" : ((json && (json.error_msg || json.error)) || "未知错误"),
  };
}

function pan115Headers(cookie) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://115.com/",
    Origin: "https://115.com",
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function extractUidFromCookie(cookie) {
  const first = String(cookie || "").split(";")[0].trim();
  const index = first.indexOf("=");
  return index >= 0 ? first.slice(index + 1) : "";
}

function parseJsonPayload(data) {
  if (typeof data === "string") return JSON.parse(data);
  if (data && typeof data === "object") return data;
  return null;
}

function buildOfflineReceipt(link, ok, title, message) {
  return {
    id: link,
    type: "url",
    mediaType: "movie",
    title,
    description: message,
    link,
    playerType: "system",
  };
}

function normalizeLooseCookie(value) {
  return String(value || "")
    .split(/[\r\n]+/)
    .map(function (line) { return line.trim(); })
    .filter(Boolean)
    .join("; ");
}

function storageGet(key) {
  try {
    return Widget.storage.get(key);
  } catch (_) {
    return "";
  }
}

function storageGetJSON(key, fallback) {
  try {
    const raw = Widget.storage.get(key);
    if (!raw) return fallback;
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch (_) {
    return fallback;
  }
}

function storageSetJSON(key, value) {
  try {
    Widget.storage.set(key, JSON.stringify(value));
  } catch (_) {}
}

function detailStreamMetadata(info = {}) {
  const href = normalizeJavDbUrl(info.href, info.baseUrl);
  const javdbId = detailIdFromUrl(href) || stableId(href);
  const code = normalizeCode(info.code || extractVideoCode(info.title));
  const publicId = code || javdbId;
  const title = cleanTitle(info.title || code || javdbId);
  const poster = info.poster || "";
  const sourceItem = compactObject({
    id: publicId,
    videoId: publicId,
    providerVideoId: javdbId,
    javdbId,
    code,
    number: code,
    javCode: code,
    title,
    name: title,
    originalTitle: title,
    originalName: title,
    fileName: code || title,
    filename: code || title,
    link: encodeDetailLink(href),
    url: href,
    detailUrl: href,
    pageUrl: href,
    posterPath: poster,
    previewUrl: poster,
  });

  return compactObject({
    provider: WidgetMetadata.id,
    sourceProvider: WidgetMetadata.id,
    currentWidgetId: WidgetMetadata.id,
    site: WidgetMetadata.site,
    id: publicId,
    videoId: publicId,
    providerVideoId: javdbId,
    javdbId,
    code,
    number: code,
    javCode: code,
    title,
    name: title,
    originalTitle: title,
    originalName: title,
    keyword: code || title,
    searchKeyword: code || title,
    fileName: code || title,
    filename: code || title,
    link: encodeDetailLink(href),
    url: href,
    detailUrl: href,
    pageUrl: href,
    posterPath: poster,
    previewUrl: poster,
    releaseDate: info.releaseDate,
    durationText: info.durationText,
    description: info.description,
    genreItems: info.genres,
    peoples: info.peoples,
    actors: (info.peoples || []).map(function (item) { return item.title; }).filter(Boolean),
    tags: (info.genres || []).map(function (item) { return item.title; }).filter(Boolean),
    sourceItem,
  });
}

function listTitle(html) {
  const candidates = [];
  pushTitleCandidate(candidates, attr(html, "title"));
  pushTitleCandidate(candidates, firstClassText(html, "video-title"));
  pushTitleCandidate(candidates, firstClassText(html, "movie-title"));
  pushTitleCandidate(candidates, firstClassText(html, "uid"));
  pushTitleCandidate(candidates, imgAttr(html, "alt"));

  const anchorRe = /<a\b[^>]*href=(["'])([^"']*\/v\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) pushTitleCandidate(candidates, stripTags(stripListNoiseBlocks(match[0])));

  if (!candidates.length) pushTitleCandidate(candidates, stripTags(stripListNoiseBlocks(html)));
  return bestTitleCandidate(candidates);
}

function stripListNoiseBlocks(html) {
  return String(html || "")
    .replace(/<[^>]*class=(["'])[^"']*\b(?:meta|score|rating|cover)\b[^"']*\1[^>]*>[\s\S]*?<\/[^>]+>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ");
}

function pushTitleCandidate(out, value) {
  const title = cleanTitle(value);
  if (!title || isNoiseTitle(title)) return;
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(title)) return;
  if (out.indexOf(title) === -1) out.push(title);
}

function bestTitleCandidate(candidates) {
  let best = "";
  let bestScore = -1;
  for (const title of candidates || []) {
    const code = extractVideoCode(title);
    const original = code ? stripLeadingVideoCode(title, code) : title;
    const hasOriginal = !!original && original !== code;
    const score = (code ? 500 : 0) + (hasOriginal ? 1000 : 0) + Math.min(title.length, 240);
    if (score > bestScore) {
      bestScore = score;
      best = title;
    }
  }
  return best;
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

function parseEntityList(html, baseUrl, kind) {
  const out = [];
  const seen = {};
  const prefixes = entityPrefixes(kind);
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || "")))) {
    const href = normalizeJavDbUrl(match[2], baseUrl);
    const path = routePathFromUrl(href, baseUrl);
    if (!pathMatchesPrefix(path, prefixes) || isEntityIndexRoute(path)) continue;
    if (seen[path]) continue;
    const anchorHtml = match[0];
    const around = rowAround(html, match.index, anchorRe.lastIndex);
    const title = cleanText(attr(anchorHtml, "title") || firstClassText(anchorHtml, "title") || imgAttr(anchorHtml, "alt") || stripTags(anchorHtml));
    if (!title || isNoiseEntityTitle(title)) continue;
    seen[path] = true;
    const poster = absolutize(firstImage(anchorHtml) || firstImage(around), baseUrl);
    const description = firstClassText(around, "meta") || firstClassText(around, "count") || entityTitle(kind);
    out.push({
      id: encodeEntityLink(kind, path),
      type: "url",
      mediaType: "movie",
      title,
      posterPath: poster,
      backdropPath: poster,
      description,
      link: encodeEntityLink(kind, path),
      playerType: "system",
    });
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

function pageUrl(baseUrl, route, page, sortType) {
  const base = normalizeBaseUrl(baseUrl);
  let path = String(route || "").trim();
  const query = {
    page: page > 1 ? page : "",
    sort_type: normalizeSortType(sortType),
  };
  if (/^https?:\/\//i.test(path)) return appendQuery(path, query);
  path = path.replace(/^\/+/, "").replace(/#.*$/, "");
  const url = path ? base + "/" + path : base + "/";
  return appendQuery(url, query);
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

function normalizeSortType(value) {
  const raw = String(value || "").trim();
  if (raw === "1" || raw === "release_date" || raw === "date") return "1";
  if (raw === "2" || raw === "magnet_update" || raw === "magnet") return "2";
  return "";
}

function isEntityListKind(kind) {
  return kind === "actor" || kind === "series" || kind === "maker";
}

function isDirectVideoCategory(kind, route) {
  const path = cleanRoutePath(route);
  if (!path) return false;
  if (kind === "series") return path.indexOf("video_codes/") === 0 || (path.indexOf("series/") === 0 && !isEntityIndexRoute(path));
  if (kind === "maker") return (path.indexOf("makers/") === 0 || path.indexOf("maker/") === 0) && !isEntityIndexRoute(path);
  return false;
}

function actorRouteParam(params = {}) {
  const raw = String(params.actorId || params.actorCategory || params.selectedActor || "").trim();
  return entityRouteParam(raw, "actor", "actors/");
}

function seriesRouteParam(params = {}) {
  const raw = String(params.seriesId || params.seriesCategory || params.selectedSeries || "").trim();
  return entityRouteParam(raw, "series", "series/");
}

function makerRouteParam(params = {}) {
  const raw = String(params.makerId || params.makerCategory || params.selectedMaker || "").trim();
  return entityRouteParam(raw, "maker", "makers/");
}

function entityRouteParam(raw, expectedKind, defaultPrefix) {
  if (!raw) return "";
  const entity = decodeEntityLink(raw);
  if (entity && entity.kind === expectedKind) return entity.path;
  let route = raw;
  if (/^https?:\/\//i.test(route)) route = routePathFromUrl(route, DEFAULT_BASE_URL, true);
  route = cleanRoutePath(route.replace(/^detail:/, ""));
  if (!route) return "";
  if (route.indexOf(defaultPrefix) === 0) return route;
  if (expectedKind === "actor" && route.indexOf("actor/") === 0) return route;
  if (expectedKind === "maker" && route.indexOf("maker/") === 0) return route;
  return defaultPrefix + route;
}

function entityPrefixes(kind) {
  if (kind === "actor") return ["actors", "actor"];
  if (kind === "series") return ["series"];
  if (kind === "maker") return ["makers", "maker", "studios", "companies"];
  return [];
}

function entityTitle(kind) {
  if (kind === "actor") return "演员";
  if (kind === "series") return "系列";
  if (kind === "maker") return "片商";
  return "条目";
}

function isEntityIndexRoute(path) {
  const clean = cleanRoutePath(path).toLowerCase();
  const routes = [
    "actors", "actors/censored", "actors/uncensored", "actors/western",
    "series", "series/censored", "series/uncensored", "series/western",
    "makers", "makers/censored", "makers/uncensored",
  ];
  return routes.indexOf(clean) !== -1;
}

function cleanRoutePath(value) {
  return String(value || "").split("#")[0].replace(/^\/+|\/+$/g, "");
}

function encodeEntityLink(kind, path) {
  const safeKind = String(kind || "entity").replace(/[:\s]+/g, "");
  const safePath = String(path || "").replace(/^\/+|\/+$/g, "");
  return safePath ? "entity:" + safeKind + ":" + safePath : "";
}

function decodeEntityLink(link) {
  const value = String(link || "").trim();
  if (!value.startsWith("entity:")) return null;
  const rest = value.slice("entity:".length);
  const index = rest.indexOf(":");
  if (index <= 0) return null;
  const kind = rest.slice(0, index);
  const path = rest.slice(index + 1).replace(/^\/+|\/+$/g, "");
  if (!path) return null;
  return { kind, path };
}

function entityDetailTitle(html, route) {
  return cleanTitle(
    firstByRe(html, /<h[12]\b[^>]*class=(["'])[^"']*\btitle\b[^"']*\1[^>]*>([\s\S]*?)<\/h[12]>/i, 2) ||
    firstByRe(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:title\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i) ||
    route.path
  );
}

function formatVideoTitle(code, title) {
  const rawTitle = cleanTitle(title);
  const safeCode = normalizeCode(code || extractVideoCode(rawTitle));
  if (!safeCode) return rawTitle;
  const original = stripLeadingVideoCode(rawTitle, safeCode);
  return original ? safeCode + " " + original : safeCode;
}

function stripLeadingVideoCode(title, code) {
  let value = cleanTitle(title);
  const match = value.match(VIDEO_CODE_RE);
  if (!match || match.index > 3 || normalizeCode(match[0]) !== code) return value === code ? "" : value;
  value = (value.slice(0, match.index) + " " + value.slice(match.index + match[0].length))
    .replace(/^[\s\[【(（]+/, "")
    .replace(/^[\s\]】)）:：\-_/]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return value === code ? "" : value;
}

function extractVideoCode(value) {
  const match = cleanText(value).match(VIDEO_CODE_RE);
  return match ? normalizeCode(match[0]) : "";
}

function normalizeCode(value) {
  const match = cleanText(value).match(VIDEO_CODE_RE);
  if (!match) return "";
  return match[0]
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl),
    cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
    loginCookie: String(params.loginCookie || saved.loginCookie || "").trim(),
    userAgent: String(params.userAgent || saved.userAgent || "").trim(),
    javbusCookie: String(params.javbusCookie || saved.javbusCookie || "").trim(),
    pan115Cookie: String(params.pan115Cookie || saved.pan115Cookie || "").trim(),
  };
  if (next.javbusCookie) Widget.storage.set("javbus.cookie", normalizeLooseCookie(next.javbusCookie));
  if (next.pan115Cookie) Widget.storage.set(PAN115_COOKIE_KEY, normalizeLooseCookie(next.pan115Cookie));
  Widget.storage.set(RUNTIME_KEY, next);
  return next;
}

function getRuntimeParams() {
  return Widget.storage.get(RUNTIME_KEY) || {
    baseUrl: DEFAULT_BASE_URL,
    cfCookie: "",
    loginCookie: "",
    userAgent: "",
    javbusCookie: "",
    pan115Cookie: "",
  };
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
  const cookie = mergeCookieHeaders(
    normalizeCookieHeader(params.cfCookie, "cf_clearance"),
    normalizeCookieHeader(params.loginCookie),
    normalizeCookieHeader(DEFAULT_LOGIN_COOKIE)
  );
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function normalizeCookieHeader(value, fallbackName) {
  const cookie = String(value || "").trim();
  if (!cookie) return "";
  if (cookie.includes("=")) return cookie;
  return fallbackName ? fallbackName + "=" + cookie : "";
}

function mergeCookieHeaders() {
  const values = [];
  const seen = {};
  for (let i = 0; i < arguments.length; i++) {
    const cookie = String(arguments[i] || "").trim();
    if (!cookie) continue;
    const parts = cookie.split(";");
    for (const part of parts) {
      const item = part.trim();
      if (!item || item.indexOf("=") === -1) continue;
      const name = item.split("=")[0].trim();
      if (!name) continue;
      if (seen[name] !== undefined) values[seen[name]] = item;
      else {
        seen[name] = values.length;
        values.push(item);
      }
    }
  }
  return values.join("; ");
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

function routePathFromUrl(url, baseUrl, keepQuery) {
  const absolute = normalizeJavDbUrl(url, baseUrl);
  let path = absolute.replace(/^https?:\/\/[^/]+\/?/i, "").split("#")[0];
  if (!keepQuery) path = path.split("?")[0];
  return path.replace(/^\/+|\/+$/g, "");
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

function compactObject(value) {
  const out = {};
  for (const key in value || {}) {
    const item = value[key];
    if (item === undefined || item === null || item === "") continue;
    if (Array.isArray(item) && !item.length) continue;
    out[key] = item;
  }
  return out;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNoiseTitle(title) {
  return /^(image|poster|cover|sample|preview)$/i.test(String(title || "").trim());
}

function isNoiseEntityTitle(title) {
  return /^(image|poster|cover|sample|preview|有码|无码|歐美|欧美|fc2|推薦|推荐|類別|类别|排行榜|演員|演员|系列|片商)$/i.test(String(title || "").trim());
}

function isCloudflareChallenge(html) {
  const text = String(html || "");
  return /cf_chl_|cf-mitigated|Just a moment|Attention Required|challenges\.cloudflare\.com/i.test(text);
}
