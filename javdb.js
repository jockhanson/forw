WidgetMetadata = {
  id: "forward.javdb",
  title: "JavDB",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "JavDB 列表、搜索与详情元数据模块",
  author: "Forward",
  site: "https://javdb.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://javdb.com",
      placeholders: [
        { title: "JavDB", value: "https://javdb.com" },
      ],
    },
    {
      name: "cfCookie",
      title: "Cloudflare Cookie",
      type: "input",
      value: "",
      placeholders: [
        { title: "浏览器通过验证后的 Cookie", value: "cf_clearance=..." },
      ],
    },
    {
      name: "loginCookie",
      title: "登录 Cookie",
      type: "input",
      value: "",
      placeholders: [
        { title: "JavDB 登录后的完整 Cookie", value: "_jdb_session=...; remember_user_token=..." },
      ],
    },
    {
      name: "userAgent",
      title: "User-Agent",
      type: "input",
      value: "",
      placeholders: [
        { title: "留空使用默认；如 Cookie 无效请填获取 Cookie 时浏览器的 UA", value: "" },
      ],
    },
  ],
  modules: [
    {
      id: "loadCategories",
      title: "类别",
      functionName: "loadList",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        {
          name: "category",
          title: "类别",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "有码", value: "censored" },
            { title: "无码", value: "uncensored" },
            { title: "欧美", value: "western" },
            { title: "FC2", value: "fc2" },
            { title: "动漫", value: "anime" },
          ],
        },
        {
          name: "sortType",
          title: "排序",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "默认", value: "" },
            { title: "发布日期", value: "1" },
            { title: "磁链更新", value: "2" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "video" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadRankings",
      title: "排行榜",
      functionName: "loadList",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        {
          name: "category",
          title: "排行榜",
          type: "enumeration",
          value: "rankings/movies",
          enumOptions: [
            { title: "热门", value: "rankings/movies" },
            { title: "TOP250", value: "rankings/top250" },
            { title: "有码", value: "rankings/censored" },
            { title: "无码", value: "rankings/uncensored" },
            { title: "欧美", value: "rankings/western" },
            { title: "FC2", value: "rankings/fc2" },
            { title: "FANZA(DMM)成人奖", value: "rankings/fanza_adult_award" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "video" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadActorRecommended",
      title: "推荐演员",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        { name: "category", title: "演员", type: "constant", value: "actors/eKbnd" },
        {
          name: "actorId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "分类", value: "actors" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "actor" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadActorUncensored",
      title: "无码演员",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        { name: "category", title: "演员", type: "constant", value: "actors/uncensored" },
        {
          name: "actorId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示无码演员列表；填列表里的演员路径显示作品", value: "actors/example" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "actor" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadActorCensored",
      title: "有码演员",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        { name: "category", title: "演员", type: "constant", value: "actors/censored" },
        {
          name: "actorId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示有码演员列表；填列表里的演员路径显示作品", value: "actors/example" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "actor" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadActorWestern",
      title: "欧美演员",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        { name: "category", title: "演员", type: "constant", value: "actors/western" },
        {
          name: "actorId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示欧美演员列表；填列表里的演员路径显示作品", value: "actors/example" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "actor" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadSeries",
      title: "系列",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        {
          name: "category",
          title: "系列",
          type: "enumeration",
          value: "series",
          enumOptions: [
            { title: "有码系列", value: "series" },
            { title: "无码", value: "series/uncensored" },
            { title: "欧美", value: "series/western" },
            { title: "LUXU", value: "video_codes/LUXU" },
            { title: "ARA", value: "video_codes/ARA" },
            { title: "MAAN", value: "video_codes/MAAN" },
            { title: "MIUM", value: "video_codes/MIUM" },
            { title: "SIRO", value: "video_codes/SIRO" },
            { title: "GANA", value: "video_codes/GANA" },
          ],
        },
        {
          name: "seriesId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示系列列表；填系列路径显示影片", value: "series/example" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "series" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadMakerUncensored",
      title: "无码片商",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        { name: "category", title: "片商", type: "constant", value: "makers/uncensored" },
        {
          name: "makerId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示无码片商列表；填列表里的片商路径显示作品", value: "makers/example" },
            { title: "Heydouga", value: "makers/xZyO" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "maker" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadMakerCensored",
      title: "有码片商",
      functionName: "loadList",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        { name: "category", title: "片商", type: "constant", value: "makers" },
        {
          name: "makerId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示有码片商列表；填列表里的片商路径显示作品", value: "makers/example" },
            { title: "S1 NO.1 STYLE", value: "makers/7R" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "maker" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadMakerMadou",
      title: "麻豆传媒",
      functionName: "loadList",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        { name: "category", title: "片商", type: "constant", value: "makers/N73g?f=download" },
        {
          name: "makerId",
          title: "分类筛选",
          type: "input",
          value: "",
          placeholders: [
            { title: "留空显示麻豆传媒作品；填片商路径显示对应作品", value: "makers/N73g?f=download" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "maker" },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadLatest",
      title: "最近更新",
      functionName: "loadList",
      cacheDuration: 900,
      requiresWebView: false,
      params: [
        {
          name: "category",
          title: "类别",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "全部", value: "" },
            { title: "有码", value: "censored" },
            { title: "无码", value: "uncensored" },
            { title: "欧美", value: "western" },
            { title: "FC2", value: "fc2" },
            { title: "动漫", value: "anime" },
          ],
        },
        {
          name: "sortType",
          title: "排序",
          type: "enumeration",
          value: "1",
          enumOptions: [
            { title: "发布日期", value: "1" },
            { title: "磁链更新", value: "2" },
          ],
        },
        { name: "listKind", title: "列表类型", type: "constant", value: "video" },
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
      {
        name: "searchType",
        title: "搜索范围",
        type: "enumeration",
        value: "all",
        enumOptions: [
          { title: "全部", value: "all" },
          { title: "演员", value: "actor" },
        ],
      },
      { name: "page", title: "页码", type: "page" },
      {
        name: "sortType",
        title: "排序",
        type: "enumeration",
        value: "",
        enumOptions: [
          { title: "默认", value: "" },
          { title: "发布日期", value: "1" },
          { title: "磁链更新", value: "2" },
        ],
      },
    ],
  },
};

const DEFAULT_BASE_URL = "https://javdb.com";
const DEFAULT_LOGIN_COOKIE = "";
const RUNTIME_KEY = "javdb.runtimeParams";
const VIDEO_CODE_RE = /(?:FC2(?:[-_\s]*PPV)?[-_\s]*\d{4,}|[A-Z]{2,10}[-_\s]?\d{2,}[A-Z]?)/i;

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
    const entityRoute = decodeEntityLink(link);
    if (entityRoute) return await loadEntityDetail(entityRoute, params);
    const href = normalizeJavDbUrl(decodeDetailLink(link), params.baseUrl);
    if (!href || !isJavDbDetailUrl(href)) return null;
    const baseUrl = getOrigin(href) || params.baseUrl;
    const html = await fetchPage(href, params);
    return parseVideoDetail(html, href, baseUrl);
  } catch (error) {
    console.error("[javdb][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadEntityDetail(route, params = {}) {
  const href = pageUrl(params.baseUrl, route.path, 1, "");
  const html = await fetchPage(href, params);
  const title = entityDetailTitle(html, route) || route.title || entityTitle(route.kind);
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
    id: encodeEntityLink(route.kind, route.path, title),
    type: "url",
    mediaType: "movie",
    title,
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    description: entityTitle(route.kind) + (videos.length ? "\n" + videos.length + " 部影片" : ""),
    link: encodeEntityLink(route.kind, route.path, title),
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
    const rawTitle = listTitle(combinedHtml, combinedHtml);
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

function parseVideoDetail(html, href, baseUrl) {
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

  return {
    id: detailIdFromUrl(href) || stableId(href),
    type: "url",
    mediaType: "movie",
    title: formatVideoTitle(code, rawTitle) || code || detailIdFromUrl(href) || "JavDB",
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
    relatedItems,
  };
}

function listTitle(anchorHtml, around) {
  const candidates = [];
  pushTitleCandidate(candidates, attr(anchorHtml, "title"));
  pushTitleCandidate(candidates, firstClassText(anchorHtml, "video-title"));
  pushTitleCandidate(candidates, firstClassText(around, "video-title"));
  pushTitleCandidate(candidates, firstClassText(around, "movie-title"));
  pushTitleCandidate(candidates, firstClassText(around, "uid"));
  pushTitleCandidate(candidates, imgAttr(anchorHtml, "alt"));
  pushTitleCandidate(candidates, imgAttr(around, "alt"));

  const anchorRe = /<a\b[^>]*href=(["'])([^"']*\/v\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(around || "")))) pushTitleCandidate(candidates, stripTags(stripListNoiseBlocks(match[0])));

  if (!candidates.length) pushTitleCandidate(candidates, stripTags(stripListNoiseBlocks(anchorHtml)));
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
      id: encodeEntityLink(kind, path, title),
      type: "url",
      mediaType: "movie",
      title,
      posterPath: poster,
      backdropPath: poster,
      description,
      link: encodeEntityLink(kind, path, title),
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
  if (/^https?:\/\//i.test(route)) route = routePathFromUrl(route, DEFAULT_BASE_URL);
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
  };
  Widget.storage.set(RUNTIME_KEY, next);
  return next;
}

function getRuntimeParams() {
  return Widget.storage.get(RUNTIME_KEY) || { baseUrl: DEFAULT_BASE_URL, cfCookie: "", loginCookie: "", userAgent: "" };
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

function routePathFromUrl(url, baseUrl) {
  const absolute = normalizeJavDbUrl(url, baseUrl);
  return absolute.replace(/^https?:\/\/[^/]+\/?/i, "").split("#")[0].split("?")[0].replace(/^\/+|\/+$/g, "");
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
