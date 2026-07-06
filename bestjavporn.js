WidgetMetadata = {
  id: "forward.bestjavporn",
  title: "BestJavPorn",
  version: "1.0.14",
  requiredVersion: "0.0.1",
  description: "BestJavPorn 列表、搜索与详情模块",
  author: "Forward",
  site: "https://www.bestjavporn.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://www.bestjavporn.com",
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
        { title: "浏览器通过验证后的 Cookie", value: "cf_clearance=prh3xgBXFDDOdZ_RmtXEfPWvGfkFMHGOlBBzRvNOd1M-1780629543-1.2.1.1-ExGI8khwIIU3pNbVn4pwXjFuVuBJV2vkPATIJVowXlxN53uVOtcxzSFQtODNEpofn216p5oaWTPy9_Ns0h31mTb_JuGGO0gCLrQzc4wq9hlQuJ_Gt.SS41qvOFG2Vi90.EBq_YZJ.c.LxMlLOBATC58BH_rR2r4TW6X1az2Zwn5pBVT2yX69dsExe3EOedB7l2znQKn.9iC2bIpwpyMeHKWoXA5arEsfl84OQzaQCkfENxRmpBuckM3cM_9Zs1uoJ6DqbVJTodH2CECvUjPmWKwDPGPcptvCJ8bzaewdbYWPglicATCJqGkjvtEb_gBCzIsGn8sCubN4OSoOLk6oxg; other=value" },
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
    {
      id: "loadResource",
      title: "BestJavPorn 播放源",
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
      { name: "page", title: "页码", type: "page" },
    ],
  },
};

const DEFAULT_BASE_URL = "https://www.bestjavporn.com";

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
    const params = getRuntimeParams();
    const href = normalizeBestJavPornUrl(decodeDetailLink(link), params.baseUrl);
    if (!href) return null;
    const baseUrl = getBaseUrlFromLink(href);
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
      baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl, {
        cfCookie: params.cfCookie || saved.cfCookie,
      }),
      cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
      userAgent: String(params.userAgent || saved.userAgent || "").trim(),
    };
    let href = inferDetailHref(params, runtimeParams.baseUrl);
    if (!href) {
      const code = extractStreamCodeFromParams(params);
      if (code) href = await findDetailHrefByCode(code, runtimeParams);
    }
    if (!href) return [];

    const baseUrl = getBaseUrlFromLink(href);
    const html = await fetchPage(href, runtimeParams);
    const candidates = await collectPlayableCandidates(html, href, baseUrl, runtimeParams);
    console.log("[bestjavporn][loadResource] 页面:", href);
    console.log("[bestjavporn][loadResource] 候选数:", candidates.length);
    candidates.forEach((c, i) => console.log("[bestjavporn][loadResource]  #" + i, c.url));
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
  url = normalizeBestJavPornUrl(url, params.baseUrl);
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
  const cookie = normalizeCookieHeader(params.cfCookie);
  const userAgent = String(params.userAgent || "").trim() ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
  const headers = {
    "User-Agent": userAgent,
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

function normalizeCookieHeader(value) {
  const cookie = String(value || "").trim();
  if (!cookie) return "";
  return cookie.includes("=") ? cookie : "cf_clearance=" + cookie;
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl, params),
    cfCookie: String(params.cfCookie || saved.cfCookie || "").trim(),
    userAgent: String(params.userAgent || saved.userAgent || "").trim(),
  };
  Widget.storage.set("bestjavporn.runtimeParams", next);
}

function getRuntimeParams() {
  return Widget.storage.get("bestjavporn.runtimeParams") || { baseUrl: DEFAULT_BASE_URL, cfCookie: "", userAgent: "" };
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
  const sources = videoUrl ? [{ url: videoUrl, source: "BestJavPorn" }] : [];
  const sourceItems = sources.map((source, index) => streamMediaSource(source, index, params, href));
  const streamMeta = detailStreamMetadata({
    href,
    title: title || stableId(href),
    code: extractStreamCode(title || description),
    poster,
    previewUrl: poster,
    description,
    genreItems: genres,
    peoples,
    mediaSources: sourceItems,
  });

  return Object.assign({
    type: "detail",
    title: title || stableId(href),
    posterPath: poster,
    backdropPath: poster,
    backdropPaths: poster ? [poster] : [],
    description,
    videoUrl,
    previewUrl: poster,
    link: encodeDetailLink(href),
    playerType: "ijk",
    customHeaders: mediaHeaders(params, href),
    genreItems: genres,
    peoples,
    relatedItems,
  }, streamMeta);
}

async function findDetailHrefByCode(code, params = {}) {
  const keys = aggregateSearchKeys(code);
  for (const key of keys) {
    try {
      const pagePath = "/";
      const html = await fetchPage(`${params.baseUrl}${pagePath}?s=${encodeURIComponent(key)}`, params);
      const items = parseVideoList(html, params.baseUrl);
      const matched = items.find((item) => itemMatchesStreamCode(item, code));
      if (matched && matched.link) return normalizeBestJavPornUrl(decodeDetailLink(matched.link), params.baseUrl);
    } catch (error) {
      console.log("[bestjavporn][aggregate] 搜索失败:", key, error.message || error);
    }
  }
  return "";
}

function detailStreamMetadata(info = {}) {
  const code = normalizeStreamCode(info.code || extractStreamCode(info.title));
  const providerId = stableId(info.href || info.title || code);
  const publicId = code || providerId;
  const detailUrl = info.href || "";
  const mediaSources = (info.mediaSources || []).filter((item) => item && item.url);
  const sourceItem = compactObject({
    id: publicId,
    videoId: publicId,
    providerVideoId: providerId,
    providerDetailUrl: detailUrl,
    code,
    number: code,
    javCode: code,
    title: info.title,
    name: info.title,
    originalTitle: info.title,
    originalName: info.title,
    fileName: code || info.title,
    filename: code || info.title,
    link: encodeDetailLink(detailUrl),
    url: detailUrl,
    detailUrl,
    pageUrl: detailUrl,
    posterPath: info.poster,
    previewUrl: info.previewUrl,
  });
  return compactObject({
    provider: WidgetMetadata.id,
    sourceProvider: WidgetMetadata.id,
    currentWidgetId: WidgetMetadata.id,
    site: WidgetMetadata.site,
    id: publicId,
    videoId: publicId,
    providerVideoId: providerId,
    providerDetailUrl: detailUrl,
    code,
    number: code,
    javCode: code,
    title: info.title,
    name: info.title,
    originalTitle: info.title,
    originalName: info.title,
    keyword: code || info.title,
    searchKeyword: code || info.title,
    fileName: code || info.title,
    filename: code || info.title,
    link: encodeDetailLink(detailUrl),
    url: detailUrl,
    detailUrl,
    pageUrl: detailUrl,
    posterPath: info.poster,
    previewUrl: info.previewUrl,
    description: info.description,
    genreItems: info.genreItems,
    peoples: info.peoples,
    actors: (info.peoples || []).map((item) => item.title).filter(Boolean),
    tags: (info.genreItems || []).map((item) => item.title).filter(Boolean),
    mediaSource: mediaSources[0],
    mediaSources: mediaSources.length ? mediaSources : undefined,
    sourceItem,
  });
}

function streamMediaSource(source = {}, index, params = {}, href = "") {
  return compactObject({
    name: playbackName(source.url, index),
    title: playbackName(source.url, index),
    source: source.source || "BestJavPorn",
    url: source.url,
    streamUrl: source.url,
    playUrl: source.url,
    videoUrl: source.url,
    referer: href,
    customHeaders: mediaHeaders(params, href),
  });
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
  console.log("[bestjavporn][candidates] 页面直接提取:", candidates.length);
  candidates.forEach((c, i) => console.log("[bestjavporn][candidates]   #" + i, c.source, c.url));

  const iframeUrls = extractIframeUrls(html, baseUrl).filter((url) => !isPreviewUrl(url));
  console.log("[bestjavporn][candidates] iframe 数量:", iframeUrls.length);
  for (const iframeUrl of iframeUrls) {
    try {
      const iframeHtml = await fetchPageWithReferer(iframeUrl, params, referer);
      const found = extractMediaCandidates(iframeHtml, iframeUrl);
      console.log("[bestjavporn][candidates]   iframe 提取:", iframeUrl, "->", found.length);
      found.forEach((candidate) => {
        console.log("[bestjavporn][candidates]     ", candidate.url);
        candidates.push({ url: candidate.url, source: "iframe:" + iframeUrl });
      });
    } catch (error) {
      console.log("[bestjavporn][video] iframe 解析失败:", iframeUrl, (error && error.message) || error);
    }
  }

  const directMedia = candidates.filter((c) => /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(c.url) && !isPreviewUrl(c.url));
  console.log("[bestjavporn][candidates] 直接视频 URL 数:", directMedia.length);
  if (directMedia.length === 0) {
    console.log("[bestjavporn][candidates] 未发现直接视频 URL，尝试从脚本/JSON 提取...");
    const scriptMedia = await extractVideoFromScripts(html, referer, baseUrl, params);
    scriptMedia.forEach((url) => candidates.push({ url, source: "script-probe" }));
    console.log("[bestjavporn][candidates] script-probe 新增:", scriptMedia.length);
  }

  const directMedia2 = candidates.filter((c) => /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(c.url) && !isPreviewUrl(c.url));
  if (directMedia2.length === 0) {
    console.log("[bestjavporn][candidates] 仍未发现直接视频 URL，尝试从播放器 API 提取...");
    const apiCandidates = await probePlayerApis(html, referer, baseUrl, params);
    apiCandidates.forEach((url) => candidates.push({ url, source: "api-probe" }));
    console.log("[bestjavporn][candidates] api-probe 新增:", apiCandidates.length);
  }

  const directMedia3 = candidates.filter((c) => /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(c.url) && !isPreviewUrl(c.url));
  if (directMedia3.length === 0) {
    console.log("[bestjavporn][candidates] 尝试从 iframe 页面深度提取...");
    const deepCandidates = await deepProbeIframes(html, referer, baseUrl, params);
    deepCandidates.forEach((url) => candidates.push({ url, source: "deep-iframe" }));
    console.log("[bestjavporn][candidates] deep-iframe 新增:", deepCandidates.length);
  }

  const deduped = uniqueCandidates(candidates);
  console.log("[bestjavporn][candidates] 去重后:", deduped.length);
  const expanded = [];
  for (const candidate of deduped.sort((a, b) => mediaScore(b.url) - mediaScore(a.url))) {
    const variants = await resolvePlayableVariants(candidate.url, referer, params);
    variants.forEach((variant) => expanded.push({ url: variant, source: candidate.source }));
  }
  const result = uniqueCandidates(expanded).sort((a, b) => mediaScore(b.url) - mediaScore(a.url));
  console.log("[bestjavporn][candidates] 最终:", result.length);
  result.forEach((r, i) => console.log("[bestjavporn][candidates]   结果#" + i, r.url));

  if (result.length > 1) {
    for (let i = 0; i < Math.min(result.length, 3); i++) {
      const url = result[i].url;
      if (/\.mp4(?:[?#]|$)/i.test(url)) {
        const isFull = await isLikelyFullVideo(url, referer, params);
        if (!isFull) {
          console.log("[bestjavporn][candidates] 跳过疑似预览:", url);
          result.splice(i, 1);
          i--;
        }
      }
    }
  }

  console.log("[bestjavporn][candidates] 过滤后最终:", result.length);
  result.forEach((r, i) => console.log("[bestjavporn][candidates]   最终#" + i, r.url));
  return result;
}

async function deepProbeIframes(html, referer, baseUrl, params) {
  const found = [];
  const allIframes = extractIframeUrls(html, baseUrl);
  console.log("[bestjavporn][deep-iframe] 所有 iframe:", allIframes.length);
  allIframes.forEach((u, i) => console.log("[bestjavporn][deep-iframe]   #" + i, u));

  for (const iframeUrl of allIframes) {
    try {
      const iframeHtml = await fetchPageWithReferer(iframeUrl, params, referer);
      const mediaUrls = extractMediaCandidates(iframeHtml, iframeUrl);
      const directUrls = mediaUrls.filter((c) => /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(c.url) && !isPreviewUrl(c.url));
      directUrls.forEach((c) => found.push(c.url));
      console.log("[bestjavporn][deep-iframe]   ", iframeUrl, "直接视频:", directUrls.length);

      const nestedIframes = extractIframeUrls(iframeHtml, iframeUrl);
      for (const nestedUrl of nestedIframes) {
        try {
          const nestedHtml = await fetchPageWithReferer(nestedUrl, params, iframeUrl);
          const nestedMedia = extractMediaCandidates(nestedHtml, nestedUrl);
          const nestedDirect = nestedMedia.filter((c) => /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(c.url) && !isPreviewUrl(c.url));
          nestedDirect.forEach((c) => found.push(c.url));
          console.log("[bestjavporn][deep-iframe]     嵌套:", nestedUrl, "直接视频:", nestedDirect.length);
        } catch (e) {}
      }
    } catch (e) {
      console.log("[bestjavporn][deep-iframe]   失败:", iframeUrl, (e && e.message) || e);
    }
  }
  return unique(found);
}

async function probePlayerApis(html, referer, baseUrl, params) {
  const found = [];
  const apiPatterns = [
    /["'](https?:\/\/[^"']*(?:watch|load|stream|video|source|file|data|embed|player|api|ajax|action|media|playlist|src)[^"']*)["']/gi,
    /["']((?:\/\/|\/)[^"'\s]*(?:watch|load|stream|video|source|file|data|embed|player|api|ajax|action|media|playlist|src)[^"'\s]*)["']/gi,
  ];
  const seen = new Set();
  for (const re of apiPatterns) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(html))) {
      const url = absolutize(match[1], baseUrl);
      if (!url || seen.has(url) || isPreviewUrl(url)) continue;
      seen.add(url);
      if (!shouldProbePlayableUrl(url) && !/\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(url)) continue;
      try {
        const res = await Widget.http.get(url, { headers: buildHeaders(params, referer) });
        const body = String((res && res.data) || "");
        if (/#EXTM3U/i.test(body)) {
          const variants = bestM3u8Variants(body, url);
          variants.forEach((v) => found.push(v));
        } else if (/\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(body)) {
          const urls = body.match(/(https?:\/\/[^"'<>\s\\]+\.(?:mp4|m3u8|webm)(?:\?[^"'<>\s\\]*)?)/gi);
          if (urls) urls.forEach((u) => found.push(u));
        }
      } catch (e) {}
    }
  }

  const videoIdRe = /["'](?:videoId|video_id|v|fileId|file_id|id|postId|post_id)["']\s*[:=]\s*(["'])([A-Za-z0-9_\-]+)\1/gi;
  const videoIds = new Set();
  let m;
  while ((m = videoIdRe.exec(html))) videoIds.add(m[2]);
  console.log("[bestjavporn][api-probe] 视频 ID 候选:", [...videoIds].join(", "));
  const apiEndpoints = [
    "/wp-admin/admin-ajax.php",
    "/api/video",
    "/api/watch",
    "/api/stream",
    "/video/source",
    "/video/watch",
    "/player/api",
    "/embed/api",
    "/wp-json/wp/v2/posts",
  ];
  const base = normalizeBaseUrl(baseUrl);
  for (const id of videoIds) {
    for (const ep of apiEndpoints) {
      const url = `${base}${ep}?id=${id}&video_id=${id}&post_id=${id}&file_id=${id}&action=get_video&action=getSource`;
      if (seen.has(url)) continue;
      seen.add(url);
      try {
        const res = await Widget.http.get(url, { headers: buildHeaders(params, referer) });
        const body = String((res && res.data) || "");
        if (/#EXTM3U/i.test(body) || /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(body)) {
          const variants = bestM3u8Variants(body, url);
          if (variants.length) variants.forEach((v) => found.push(v));
          else {
            const urls = body.match(/(https?:\/\/[^"'<>\s\\]+\.(?:mp4|m3u8|webm)(?:\?[^"'<>\s\\]*)?)/gi);
            if (urls) urls.forEach((u) => found.push(u));
          }
        }
      } catch (e) {}
    }
  }
  return unique(found);
}

async function extractVideoFromScripts(html, referer, baseUrl, params) {
  const found = [];
  const scriptBlocks = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html))) scriptBlocks.push(m[1]);

  const jsonRe = /["'](https?:\/\/[^"']+\.(?:mp4|m3u8|webm)[^"']*)["']/gi;
  const pathRe = /["']((?:\/\/|\/)[^"'\s]{5,}\.(?:mp4|m3u8|webm)[^"'\s]*)["']/gi;
  const apiRe = /["'](https?:\/\/[^"']*(?:api|ajax|video|source|stream|file|data|json|playlist|embed|player)[^"']*)["']/gi;
  for (const block of scriptBlocks) {
    let match;
    jsonRe.lastIndex = 0;
    while ((match = jsonRe.exec(block))) {
      const url = absolutize(match[1], baseUrl);
      if (url && isPlayableCandidate(url) && !isPreviewUrl(url)) found.push(url);
    }
    pathRe.lastIndex = 0;
    while ((match = pathRe.exec(block))) {
      const url = absolutize(match[1], baseUrl);
      if (url && isPlayableCandidate(url) && !isPreviewUrl(url)) found.push(url);
    }
    apiRe.lastIndex = 0;
    while ((match = apiRe.exec(block))) {
      const url = absolutize(match[1], baseUrl);
      if (url && shouldProbePlayableUrl(url) && !isPreviewUrl(url)) {
        try {
          const res = await Widget.http.get(url, { headers: buildHeaders(params, referer) });
          const body = String((res && res.data) || "");
          if (/#EXTM3U/i.test(body)) {
            const variants = bestM3u8Variants(body, url);
            variants.forEach((v) => found.push(v));
          } else {
            const nested = extractMediaCandidates(body, url);
            nested.forEach((c) => found.push(c.url));
          }
        } catch (e) {}
      }
    }
  }

  const ldJsonRe = /<script[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldJsonRe.exec(html))) {
    try {
      const json = JSON.parse(m[2]);
      const extractUrls = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (typeof obj === "string" && /\.(?:mp4|m3u8|webm)(?:[?#]|$)/i.test(obj) && !isPreviewUrl(obj)) {
          found.push(absolutize(obj, baseUrl));
        } else if (typeof obj === "string" && shouldProbePlayableUrl(obj) && !isPreviewUrl(obj)) {
          found.push(absolutize(obj, baseUrl));
        } else if (Array.isArray(obj)) {
          obj.forEach(extractUrls);
        } else {
          Object.values(obj).forEach(extractUrls);
        }
      };
      extractUrls(json);
    } catch (e) {}
  }
  return unique(found);
}

async function fetchPageWithReferer(url, params = {}, referer) {
  url = normalizeBestJavPornUrl(url, params.baseUrl || referer);
  const res = await Widget.http.get(url, {
    headers: buildHeaders(params, referer),
  });
  return String((res && res.data) || "");
}

function extractMediaCandidates(html, baseUrl) {
  const normalized = normalizeEscapedText(html);
  const searchable = normalized + "\n" + unpackPacker(normalized) + "\n" + decodeEmbeddedBase64Text(normalized);
  const candidates = [];
  collectMediaMatches(candidates, searchable, /\b(?:var\s+)?hlsUrl\s*=\s*(["'])(.*?)\1/gi, baseUrl, "hlsUrl", 2);
  collectMediaMatches(candidates, searchable, /<(?:source|video)\b[^>]*src=(["'])(.*?)\1/gi, baseUrl, "source", 2);
  collectMediaMatches(candidates, searchable, /<meta\b[^>]*(?:property|name)=(["'])(?:og:video|og:video:url|twitter:player:stream|video)\1[^>]*content=(["'])(.*?)\2/gi, baseUrl, "meta", 3);
  collectMediaMatches(candidates, searchable, /\b(?:data-src|data-video|data-file|data-url|data-hls|data-mp4|data-source|data-stream|file|src|url|source|hls|video|video_url|videoUrl)\s*[:=]\s*(["'])([^"']+)\1/gi, baseUrl, "script", 2);
  collectMediaMatches(candidates, searchable, /<(?:video|source|audio|track|embed|object|iframe)\b[^>]*\b(?:data-src|data-video|data-file|data-url|data-hls|data-mp4|data-source|data-stream|data-full|data-main|data-original|data-hls-url|data-video-url|src|poster|href|data)=(["'])([^"']+)\1/gi, baseUrl, "data-attr", 2);
  collectMediaMatches(candidates, searchable, /\bstyle\s*=\s*(["'])[^"']*url\s*\(\s*\\?\s*'(https?:\/\/[^']+\.(?:mp4|m3u8|webm)[^']*)\\?\s*\)/gi, baseUrl, "css-url", 2);
  collectMediaMatches(candidates, searchable, /\b(?:file|src|url|source|hls|video|video_url|videoUrl)\s*[:=]\s*([^"',}\]\s<>]+)/gi, baseUrl, "script", 1);
  collectMediaMatches(candidates, searchable, /\b(?:full_video|fullVideo|full_video_url|fullVideoUrl|main_video|mainVideo|movie_url|movieUrl|content_url|contentUrl|media_url|mediaUrl|play_url|playUrl)\s*[:=]\s*(["'])([^"']+)\1/gi, baseUrl, "full-video", 2);
  collectMediaMatches(candidates, searchable, /\b(?:full_video|fullVideo|full_video_url|fullVideoUrl|main_video|mainVideo|movie_url|movieUrl|content_url|contentUrl|media_url|mediaUrl|play_url|playUrl)\s*[:=]\s*([^"',}\]\s<>]+)/gi, baseUrl, "full-video", 1);
  collectMediaMatches(candidates, searchable, /(?:loadVideo|loadSource|setSource|changeSource|switchSource|playVideo)\s*\(\s*(["'])([^"']+)\1/gi, baseUrl, "js-func", 2);
  collectMediaMatches(candidates, searchable, /(?:fetch|axios|ajax|XMLHttpRequest)\s*\(\s*(["'])([^"']+)\1/gi, baseUrl, "ajax-call", 2);
  collectMediaMatches(candidates, searchable, /(https?:\/\/[^"'<>\s\\]+\.(?:m3u8|mp4|webm)(?:\?[^"'<>\s\\]*)?)/gi, baseUrl, "url", 1);
  collectMediaMatches(candidates, searchable, /`([^`]*\.(?:m3u8|mp4|webm)[^`]*)`/gi, baseUrl, "template-literal", 1);
  collectMediaMatches(candidates, searchable, /(https?:\/\/[^"'<>\s\\]+\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|embed|player|v\.php|source|file|watch|view|play)[^"'<>\s\\]*)/gi, baseUrl, "url", 1);
  collectMediaMatches(candidates, searchable, /<a\b[^>]*\bhref=(["'])([^"']*(?:download|watch|play|stream|video|source|file)[^"']*)["'][^>]*>/gi, baseUrl, "download-link", 2);
  collectMediaMatches(candidates, searchable, /(https?:\/\/[^"'<>\s\\]+\/wp-admin\/admin-ajax\.php\?[^"'<>\s\\]+)/gi, baseUrl, "ajax", 1);
  collectMediaMatches(candidates, searchable, /(["'])((?:\/\/|\/)[^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)\1/gi, baseUrl, "relative", 2);
  collectMediaMatches(candidates, searchable, /(["'])((?:\/\/|\/)[^"']+\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|embed|player|v\.php|source|file)[^"']*)\1/gi, baseUrl, "relative", 2);
  collectMediaMatches(candidates, searchable, /(["'])((?:\/\/|\/)[^"']+\/wp-admin\/admin-ajax\.php\?[^"']*)\1/gi, baseUrl, "ajax", 2);
  parsePlayerSourceObjects(searchable, baseUrl).forEach((url) => candidates.push({ url, source: "player-obj" }));
  buildAjaxCandidates(searchable, baseUrl).forEach((url) => candidates.push({ url, source: "ajax" }));
  return uniqueCandidates(candidates).filter((candidate) => isPlayableCandidate(candidate.url) && !isPreviewUrl(candidate.url));
}

function parsePlayerSourceObjects(text, baseUrl) {
  const out = [];
  const patterns = [
    /\b(?:sources|sources_alt|file_src|videoSources|playSources)\s*[:=]\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/gi,
    /(?:jwplayer|flowplayer|Playerjs|videojs)\s*\([^)]*\)\s*\.\s*(?:load|source|setup|play)\s*\(\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/gi,
    /\bplayerInstance\s*\.\s*(?:load|source|setup|play)\s*\(\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/gi,
  ];
  for (const re of patterns) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(text || ""))) {
      try {
        let obj = match[1].replace(/(['"])?([a-zA-Z0-9_\-]+)\s*:/g, '"$2":');
        obj = obj.replace(/'/g, '"');
        obj = obj.replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(obj);
        extractUrlsFromPlayerObject(parsed, baseUrl, out);
      } catch (e) {
        const urlRe = /["'](https?:\/\/[^"']+\.(?:mp4|m3u8|webm)[^"']*)["']/g;
        let urlMatch;
        while ((urlMatch = urlRe.exec(match[1]))) {
          const url = absolutize(urlMatch[1], baseUrl);
          if (url && isPlayableCandidate(url) && !isPreviewUrl(url)) out.push(url);
        }
      }
    }
  }
  return out;
}

function extractUrlsFromPlayerObject(obj, baseUrl, out) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((item) => extractUrlsFromPlayerObject(item, baseUrl, out));
    return;
  }
  const maybeUrl = obj.file || obj.src || obj.url || obj.source || obj.stream;
  if (typeof maybeUrl === "string") {
    const url = absolutize(maybeUrl, baseUrl);
    if (url && isPlayableCandidate(url) && !isPreviewUrl(url)) out.push(url);
  }
  const sources = obj.sources || obj.tracks || obj.files;
  if (sources) extractUrlsFromPlayerObject(sources, baseUrl, out);
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") extractUrlsFromPlayerObject(v, baseUrl, out);
  });
}

function buildAjaxCandidates(text, baseUrl) {
  const action = firstByRe(text, /\bdata-action=(["'])(.*?)\1/i, 2) ||
    firstByRe(text, /\baction\s*[:=]\s*(["'])(.*?)\1/i, 2);
  const id = firstByRe(text, /\bdata-(?:id|post|post-id|video|video-id)=(["'])(.*?)\1/i, 2) ||
    firstByRe(text, /\b(?:post_id|postId|video_id|videoId|id)\s*[:=]\s*(["'])([A-Za-z0-9_-]+)\1/i, 2);
  if (!action || !id) return [];
  const base = normalizeBaseUrl(baseUrl);
  const params = `action=${encodeURIComponent(action)}&id=${encodeURIComponent(id)}&post_id=${encodeURIComponent(id)}&video_id=${encodeURIComponent(id)}`;
  return [`${base}/wp-admin/admin-ajax.php?${params}`];
}

function collectMediaMatches(out, text, re, baseUrl, source, group) {
  let match;
  while ((match = re.exec(text || ""))) {
    collectMediaUrl(out, match[group], baseUrl, source);
  }
}

function collectMediaUrl(out, rawUrl, baseUrl, source) {
  const url = absolutize(rawUrl, baseUrl);
  if (!isPlayableCandidate(url)) return;
  out.push({ url, source: source || "unknown" });
}

function extractIframeUrls(html, baseUrl) {
  const normalized = normalizeEscapedText(html);
  const out = [];
  const patterns = [
    /<iframe\b[^>]*src=(["'])(.*?)\1/gi,
    /<iframe\b[^>]*data-src=(["'])(.*?)\1/gi,
    /<iframe\b[^>]*data-lazy-src=(["'])(.*?)\1/gi,
    /<iframe\b[^>]*data-url=(["'])(.*?)\1/gi,
    /<embed\b[^>]*src=(["'])(.*?)\1/gi,
    /<object\b[^>]*data=(["'])(.*?)\1/gi,
  ];
  for (const re of patterns) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(normalized))) {
      const url = absolutize(match[2], baseUrl);
      if (url) out.push(url);
    }
  }
  return unique(out);
}

async function resolveBestPlayableVariant(url, referer, params = {}) {
  const variants = await resolvePlayableVariants(url, referer, params);
  return variants[0] || url;
}

async function resolvePlayableVariants(url, referer, params = {}) {
  if (!shouldProbePlayableUrl(url)) return [url];
  try {
    const probed = await probeUrl(url, referer, params);
    if (/#EXTM3U/i.test(probed)) {
      const variants = bestM3u8Variants(probed, url);
      return variants.length ? variants : [url];
    }
    if (shouldProbeNestedPlayer(url)) {
      const nested = extractMediaCandidates(probed, url)
        .filter((candidate) => stripQuery(candidate.url) !== stripQuery(url))
        .sort((a, b) => mediaScore(b.url) - mediaScore(a.url));
      const expanded = [];
      for (const candidate of nested.slice(0, 8)) {
        const variants = await resolvePlayableVariants(candidate.url, url, params);
        variants.forEach((variant) => expanded.push(variant));
      }
      if (unique(expanded).length) return unique(expanded);
      const postProbed = await probeUrl(url, referer, params, true);
      if (postProbed !== probed) {
        const retry = extractMediaCandidates(postProbed, url)
          .filter((candidate) => stripQuery(candidate.url) !== stripQuery(url))
          .sort((a, b) => mediaScore(b.url) - mediaScore(a.url));
        for (const candidate of retry.slice(0, 8)) {
          const variants = await resolvePlayableVariants(candidate.url, url, params);
          variants.forEach((variant) => expanded.push(variant));
        }
        if (unique(expanded).length) return unique(expanded);
      }
      return [];
    }
    return [url];
  } catch (error) {
    console.log("[bestjavporn][video] m3u8 清晰度解析失败:", (error && error.message) || error);
    return [url];
  }
}

async function probeUrl(url, referer, params, usePost = false) {
  const headers = buildHeaders(params, referer);
  try {
    const res = usePost
      ? await Widget.http.post(url, {}, { headers })
      : await Widget.http.get(url, { headers });
    return String((res && res.data) || "");
  } catch (e) {
    return "";
  }
}

async function isLikelyFullVideo(url, referer, params) {
  try {
    const headers = buildHeaders(params, referer);
    const res = await Widget.http.head(url, { headers });
    const contentLength = Number((res && res.headers && (res.headers["content-length"] || res.headers["Content-Length"])) || 0);
    const contentType = String((res && res.headers && (res.headers["content-type"] || res.headers["Content-Type"])) || "");
    console.log("[bestjavporn][probe] HEAD", url, "size:", contentLength, "type:", contentType);
    if (contentLength > 5 * 1024 * 1024) return true;
    if (contentLength > 0 && contentLength < 500 * 1024) return false;
    if (/\.m3u8(?:[?#]|$)/i.test(url)) {
      const m3u8Res = await Widget.http.get(url, { headers });
      const body = String((m3u8Res && m3u8Res.data) || "");
      const durationMatch = body.match(/#EXT-X-TARGETDURATION:\s*(\d+)/i);
      if (durationMatch && Number(durationMatch[1]) < 15) return false;
      const totalDuration = body.match(/#EXT-X-TOTALDURATION:\s*(\d+)/i);
      if (totalDuration && Number(totalDuration[1]) < 15) return false;
    }
    return true;
  } catch (e) {
    return true;
  }
}

function shouldProbePlayableUrl(url) {
  const value = String(url || "");
  return /\.m3u8(?:[?#]|$)/i.test(value) ||
    /\/(?:get_file|stream|hls|playlist|master|v\.php|source|file|video|embed|player)(?:[\/?#]|$)/i.test(value) ||
    shouldProbeNestedPlayer(value);
}

function shouldProbeNestedPlayer(url) {
  return /(?:player|embed)\.php(?:[?#]|$)|\/(?:player|embed)\//i.test(String(url || "")) ||
    /admin-ajax\.php/i.test(String(url || ""));
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
  if (/\/(?:get_file|dl|download|stream|video|media|hls|playlist|master)\b/i.test(value)) score += 800000;
  if (/(?:player|embed)\.php|\/(?:player|embed)\//i.test(value)) score += 200000;
  score += resolutionScore(value) * 1000;
  if (/bestjavporn|stream|hls|playlist|master|get_file|player|embed/i.test(value)) score += 5000;
  if (/\/(?:pv|freepv|trailers?|cuts?|clips?|shorts?)\//i.test(value)) score -= 10000000;
  else if (/(?:preview|sample|javtrailers|teaser|promo|litevideo|avpreview|sample\.mgstage|cc3001\.dmm\.co\.jp|ads?|banner)/i.test(value)) score -= 10000000;
  return score;
}

function playbackName(url, index) {
  const res = resolutionScore(url);
  if (res) return `${res}P 正片`;
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return index === 0 ? "自适应正片" : "备用正片";
  if (/\.mp4(?:[?#]|$)/i.test(url)) return index === 0 ? "正片 MP4" : `备用 MP4 ${index + 1}`;
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
  const value = String(url || "");
  if (/\/(?:pv|freepv|trailers?|cuts?|clips?|shorts?)\//i.test(value)) return true;
  if (/(?:preview|trailer|sample|freepv|javtrailers|teaser|promo|litevideo|avpreview|sample\.mgstage|cc3001\.dmm\.co\.jp)/i.test(value)) {
    if (/\/(?:video|media|stream|hls|playlist|master|get_file|dl|download|embed|player)\//i.test(value)) return false;
    if (/\.(?:m3u8|mp4|webm)(?:[?#]|$)/i.test(value)) return false;
    return true;
  }
  return false;
}

function isPlayableCandidate(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:")) return false;
  if (/\.(?:jpg|jpeg|png|webp|gif|svg|css|js|ico)(?:[?#]|$)/i.test(value)) return false;
  if (/\/(?:ads?|banner|analytics|captcha|cdn-cgi)\b/i.test(value)) return false;
  return /\.(?:m3u8|mp4|webm)(?:[?#]|$)/i.test(value) ||
    /\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|v\.php|source|file)(?:[\/?#]|$)/i.test(value) ||
    /(?:player|embed)\.php(?:[?#]|$)|\/(?:player|embed)\//i.test(value) ||
    /admin-ajax\.php\?/i.test(value);
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

function aggregateSearchKeys(code) {
  const value = normalizeStreamCode(code);
  const compact = compareStreamCode(value);
  const keys = [value, value.replace(/-/g, ""), compact];
  return unique(keys).filter(Boolean);
}

function itemMatchesStreamCode(item = {}, code = "") {
  const target = compareStreamCode(code);
  if (!target) return false;
  const candidates = [item.code, item.number, item.id, item.videoId, item.title, item.name, item.description, item.link];
  for (const value of candidates) {
    const found = extractStreamCode(value);
    if (compareStreamCode(found) === target) return true;
  }
  return false;
}

function extractStreamCodeFromParams(params = {}) {
  const candidates = [
    params.code,
    params.number,
    params.javCode,
    params.videoId,
    params.id,
    params.title,
    params.name,
    params.originalTitle,
    params.originalName,
    params.fileName,
    params.filename,
    params.description,
    params.link,
    params.url,
    params.detailUrl,
    params.pageUrl,
  ];
  appendNestedStreamCandidates(candidates, params.sourceItem);
  appendNestedStreamCandidates(candidates, params.info);
  appendNestedStreamCandidates(candidates, params.mediaSource);
  if (Array.isArray(params.mediaSources)) {
    for (const source of params.mediaSources) appendNestedStreamCandidates(candidates, source);
  }
  for (const value of candidates) {
    const code = extractStreamCode(value);
    if (code) return code;
  }
  for (const value of collectStringValues(params)) {
    const code = extractStreamCode(value, { allowPureNumeric: false });
    if (code) return code;
  }
  return "";
}

function appendNestedStreamCandidates(out, value = {}) {
  if (!value || typeof value !== "object") return;
  out.push(value.code, value.number, value.javCode, value.videoId, value.id, value.title, value.name, value.fileName, value.filename, value.link, value.url, value.detailUrl, value.pageUrl, value.description);
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

function extractStreamCode(value, options = {}) {
  const allowPureNumeric = options.allowPureNumeric === true;
  let text = cleanText(value);
  if (!text) return "";
  text = safeDecodeURIComponent(text)
    .replace(/^[a-z0-9]+(?:\.[a-z0-9]+)+@/i, "")
    .replace(/^(?:hhd800|hhb800)[_\-@.\s]?/i, "");
  if (/^https?:\/\//i.test(text)) text = text.replace(/^https?:\/\/[^/?#]+/i, " ").replace(/[?#].*$/, " ");
  text = text.toUpperCase().replace(/\./g, " ").replace(/_/g, "-").replace(/\s+/g, " ").trim();
  const special = [
    ["FC2", /\bFC2(?:[- ]?PPV)?[- ]?(\d{5,8})\b/i],
    ["CARIB", /\bCARIB[- ]?(\d{6,8})\b/i],
    ["1PONDO", /\b1PONDO[- ]?(\d{6,8})\b/i],
    ["HEYZO", /\bHEYZO[- ]?(\d{3,6})\b/i],
    ["T28", /\bT28[- ]?(\d{6,8})\b/i],
  ];
  for (const item of special) {
    const match = text.match(item[1]);
    if (match) return item[0] + "-" + match[1];
  }
  const generic = text.match(/\b([A-Z]{2,15})\s*[-_ ]?\s*(\d{2,10}[A-Z]?)(?:[-_ ]?([A-Z]{1,4}))?\b/i);
  if (generic) return generic[1].toUpperCase() + "-" + generic[2].toUpperCase() + (generic[3] ? "-" + generic[3].toUpperCase() : "");
  if (allowPureNumeric) {
    const num = text.match(/\b(\d{4,8})\b/);
    if (num) return num[1];
  }
  return "";
}

function normalizeStreamCode(value) {
  return extractStreamCode(value) || cleanText(value).toUpperCase().replace(/[_\s]+/g, "-");
}

function compareStreamCode(value) {
  return normalizeStreamCode(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (error) {
    return String(value || "");
  }
}

function normalizeBaseUrl(baseUrl, params = {}) {
  const value = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  if (String((params && params.cfCookie) || "").trim()) return value;
  return value === "https://www.bestjavporn.com" ? "https://www3.bestjavporn.com" : value;
}

function inferDetailHref(params = {}, baseUrl) {
  const values = [
    params.link,
    params.detailLink,
    params.href,
    params.pageUrl,
    params.detailUrl,
    params.url,
    params.webUrl,
    params.sourceItem && params.sourceItem.link,
    params.sourceItem && params.sourceItem.detailUrl,
  ];
  for (const value of values) {
    const decoded = decodeDetailLink(value);
    if (decoded && /\/video\//i.test(decoded)) return absolutize(decoded, baseUrl);
  }
  return "";
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function absolutize(url, baseUrl) {
  if (!url) return "";
  const value = decodeHtml(String(url).trim());
  if (!value || value.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(value)) return normalizeBestJavPornUrl(value, baseUrl);
  if (value.startsWith("//")) return "https:" + value;
  return normalizeBaseUrl(baseUrl) + "/" + trimSlashes(value);
}

function normalizeBestJavPornUrl(url, baseUrl) {
  const value = String(url || "");
  if (/^https?:\/\/www3\.bestjavporn\.com\b/i.test(String(baseUrl || ""))) {
    return value.replace(/^https?:\/\/www\.bestjavporn\.com\b/i, "https://www3.bestjavporn.com");
  }
  return value;
}

function stripQuery(url) {
  return String(url || "").split("#")[0].split("?")[0];
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
