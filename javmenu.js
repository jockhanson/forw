WidgetMetadata = {
  id: "javmenu.magnet",
  title: "JAVMenu Magnet",
  description: "通过番号匹配 JAVMenu 磁力资源",
  author: "EL",
  site: "https://javmenu.com",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  globalParams: [
    {
      name: "baseUrl",
      title: "JAVMenu Base URL",
      type: "input",
      value: "https://javmenu.com",
      placeholders: [
        { title: "JAVMenu", value: "https://javmenu.com" }
      ]
    },
    {
      name: "cookie",
      title: "JAVMenu Cookie",
      type: "input",
      description: "在浏览器通过 JAVMenu Cloudflare 验证后，复制整段 Cookie 填入（含名）。"
    },
    {
      name: "userAgent",
      title: "User-Agent",
      type: "input",
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "JAVMenu 磁力资源",
      description: "根据当前视频信息匹配 JAVMenu 磁力链接",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 120,
      params: []
    }
  ]
};

const JAVMENU_DEFAULT_BASE = "https://javmenu.com";
const REQUEST_TIMEOUT = 15000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
const LOG_PREFIX = "[javmenu-magnet]";

function getText(value) {
  return String(value || "").trim();
}

function normalizeBaseUrl(baseUrl) {
  return (getText(baseUrl) || JAVMENU_DEFAULT_BASE).replace(/\/+$/, "");
}

function decodeHtml(value) {
  return getText(value)
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#(\d+);/g, function (_, dec) {
      return String.fromCharCode(parseInt(dec, 10));
    });
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

function stripTags(html) {
  return decodeHtml(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCookie(cookie) {
  return getText(cookie)
    .split(/[\r\n]+/)
    .map(function (line) { return line.trim(); })
    .filter(Boolean)
    .join("; ");
}

function normalizeCode(value) {
  return getText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatMatchedCode(value) {
  const cleaned = getText(value)
    .replace(/\s+/g, "")
    .replace(/_/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
  const match = cleaned.match(/^([A-Z]{2,15})-?(\d{2,10}[A-Z]?)(?:-?([A-Z]{1,4}))?$/);
  if (!match) return cleaned;
  return match[1] + "-" + match[2] + (match[3] ? "-" + match[3] : "");
}

function toAbsoluteUrl(href, baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  const value = decodeHtml(href);
  if (!value) return "";
  if (/^magnet:/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  if (value.charAt(0) === "/") return base + value;
  return base + "/" + value.replace(/^\/+/, "");
}

function extractAttr(html, name) {
  const re = new RegExp("\\b" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function extractSearchCode(text, options) {
  const opts = options || {};
  const allowPureNumeric = opts.allowPureNumeric !== false;
  let s = getText(text).toUpperCase();
  if (!s) return "";

  s = safeDecodeURIComponent(s);
  s = s.replace(/^[A-Z0-9]+(?:\.[A-Z0-9]+)+@/, "");

  const normalized = s
    .replace(/\./g, " ")
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const knownMakerPattern = /\b(?:SONE|S2M|MIAA|SSNI|SNIS|IPX|IPZZ|SSIS|JUQ|MIDE|MIDV|STARS|ABW|RKI|DVAJ|WANZ|LULU|DLDSS|VRTM|SDMU|SDDE|MKMP|HMN|MUDR|ADN|CAWD|PPPE|PRED|MGR|SHKD|MXGS|FSDSS|JUL|KTB|MIAB|GVH|MIMK|JUY|JUTA|IDBD|HND|DASD|CLO|BF|HONB|ROE|CEMD|MIUM|NITR|RCTD|RCT|IPVR|MIBD|JUR|JURD|SOE|ORE|PYO|START|NSFS|ESD|GVG|REAL|LAF|SMD|MD|BAD|MOND|ARSO|MOCKY|FONE|GANA|MUKO|PAPA|RASH|TAMA|ZUKO|HEY|PACO|ABP|IPZ|SDAB|FSET|MOMJ)\s*[-_ ]?\d{2,6}[A-Z]?(?:[-_ ]?[A-Z]{0,4})?\b/i;
  const makerMatch = normalized.match(knownMakerPattern);
  if (makerMatch && makerMatch[0]) return formatMatchedCode(makerMatch[0]);

  const fc2 = normalized.match(/\bFC2(?:[- ]?PPV)?[- ]?(\d{5,8})\b/i);
  if (fc2) return "FC2-" + fc2[1];

  const carib = normalized.match(/\bCARIB[- ]?(\d{6,8})\b/i);
  if (carib) return "CARIB-" + carib[1];

  const pondo = normalized.match(/\b1PONDO[- ]?(\d{6,8})\b/i);
  if (pondo) return "1PONDO-" + pondo[1];

  const heyzo = normalized.match(/\bHEYZO[- ]?(\d{3,6})\b/i);
  if (heyzo) return "HEYZO-" + heyzo[1];

  const t28 = normalized.match(/\bT28[- ]?(\d{6,8})\b/i);
  if (t28) return "T28-" + t28[1];

  const generic = normalized.match(/\b([A-Z]{2,15})\s*[-_ ]?\s*(\d{2,10}[A-Z]?)\b/i);
  if (generic) return generic[1].toUpperCase() + "-" + generic[2].toUpperCase();

  if (allowPureNumeric) {
    const num = normalized.match(/\b(\d{5,8})\b/);
    if (num) return num[1];
  }

  return "";
}

function collectStringValues(value, depth, out, visited) {
  const list = out || [];
  const seen = visited || new Set();
  const level = depth || 0;
  if (value === null || value === undefined || level > 5) return list;

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number") {
    const text = String(value).trim();
    if (text) list.push(text);
    return list;
  }

  if (valueType !== "object") return list;
  if (seen.has(value)) return list;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, level + 1, list, seen);
    return list;
  }

  for (const key of Object.keys(value)) {
    collectStringValues(value[key], level + 1, list, seen);
  }

  return list;
}

function extractCodeFromParams(params) {
  const p = params || {};
  const candidates = [
    p.code,
    p.videoId,
    p.number,
    p.id,
    p.title,
    p.name,
    p.fileName,
    p.filename,
    p.file_name,
    p.path,
    p.filePath,
    p.file_path,
    p.mediaPath,
    p.media_path,
    p.itemPath,
    p.item_path,
    p.localPath,
    p.local_path,
    p.originalFilename,
    p.originalFileName,
    p.originalTitle,
    p.originalName,
    p.episodeName,
    p.description,
    p.genreTitle,
    p.overview,
    p.seriesName,
    p.link,
    p.url,
    p.videoUrl,
    p.playUrl,
    p.streamUrl,
    p.detailUrl
  ];

  for (const container of [p.tmdbInfo, p.info, p.mediaSource]) {
    if (!container) continue;
    candidates.push(
      container.title,
      container.name,
      container.originalTitle,
      container.originalName,
      container.overview,
      container.fileName,
      container.filename,
      container.path,
      container.url,
      container.streamUrl
    );
  }

  if (Array.isArray(p.mediaSources)) {
    for (const source of p.mediaSources) {
      if (!source) continue;
      candidates.push(
        source.name,
        source.fileName,
        source.filename,
        source.path,
        source.url,
        source.streamUrl
      );
    }
  }

  for (const value of candidates) {
    const code = extractSearchCode(value, { allowPureNumeric: true });
    if (code) return code;
  }

  const allStrings = collectStringValues(p);
  for (const value of allStrings) {
    const code = extractSearchCode(value, { allowPureNumeric: false });
    if (code) return code;
  }

  return "";
}

function buildHeaders(params, referer, extra) {
  const base = normalizeBaseUrl(params && params.baseUrl);
  const headers = {
    "User-Agent": getText(params && params.userAgent) || UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": referer || base + "/"
  };

  const cookie = normalizeCookie(params && params.cookie);
  if (cookie) headers["Cookie"] = cookie;

  return Object.assign(headers, extra || {});
}

async function fetchHtml(url, params, options) {
  const opts = options || {};
  const absoluteUrl = toAbsoluteUrl(url, params && params.baseUrl);
  const requestOptions = {
    headers: buildHeaders(params, opts.referer, opts.headers),
    timeout: opts.timeout || REQUEST_TIMEOUT
  };
  if (opts.params) requestOptions.params = opts.params;

  const resp = await Widget.http.get(absoluteUrl, requestOptions);
  if (!resp) return { status: 0, html: "", headers: {}, url: absoluteUrl };

  const status = Number(resp.statusCode || resp.status || 200);
  return {
    status,
    html: String(resp.data || ""),
    headers: resp.headers || {},
    url: absoluteUrl
  };
}

function getHeader(headers, name) {
  if (!headers) return "";
  const target = String(name || "").toLowerCase();
  for (const key of Object.keys(headers)) {
    if (String(key).toLowerCase() === target) return String(headers[key] || "");
  }
  return "";
}

function isBlockedPage(resp) {
  const html = String((resp && resp.html) || "");
  const lower = html.toLowerCase();
  return (
    Number(resp && resp.status) === 403 ||
    /challenge/i.test(getHeader(resp && resp.headers, "cf-mitigated")) ||
    lower.indexOf("just a moment") >= 0 ||
    lower.indexOf("cf-browser-verification") >= 0 ||
    lower.indexOf("challenges.cloudflare.com") >= 0 ||
    lower.indexOf("cf-chl") >= 0
  );
}

function isLikelyHtmlPageUrl(url) {
  const value = getText(url);
  if (!value) return false;
  if (/^(?:#|javascript:|mailto:|magnet:)/i.test(value)) return false;
  if (/\.(?:jpg|jpeg|png|webp|gif|avif|css|js|json|xml|m3u8|mp4|torrent)(?:[?#].*)?$/i.test(value)) return false;
  return true;
}

function extractCodeFromJavMenuLink(link) {
  const href = safeDecodeURIComponent(decodeHtml(link)).split("?")[0].split("#")[0];
  const parts = href.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const code = extractSearchCode(parts[i].replace(/-/g, " "), { allowPureNumeric: true });
    if (code) return code;
  }
  return "";
}

function parseSearchResults(html, targetCode, baseUrl) {
  const target = normalizeCode(targetCode);
  const results = [];
  const seen = new Set();
  let match;
  const linkRe = /<a\b([^>]*href\s*=\s*["'][^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;

  while ((match = linkRe.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const href = extractAttr(attrs, "href");
    if (!isLikelyHtmlPageUrl(href)) continue;

    const link = toAbsoluteUrl(href, baseUrl);
    if (!link || seen.has(link)) continue;

    const imgTitle = extractAttr(body, "title") || extractAttr(body, "alt");
    const attrTitle = extractAttr(attrs, "title") || extractAttr(attrs, "aria-label");
    const text = stripTags(body);
    const code = extractCodeFromJavMenuLink(link) ||
      extractSearchCode(attrTitle, { allowPureNumeric: true }) ||
      extractSearchCode(imgTitle, { allowPureNumeric: true }) ||
      extractSearchCode(text, { allowPureNumeric: true });

    if (!code || normalizeCode(code) !== target) continue;

    seen.add(link);
    results.push({
      code,
      link,
      title: attrTitle || imgTitle || text || code
    });
  }

  return results;
}

function htmlLooksLikeDetail(html, code) {
  const body = String(html || "");
  if (!body) return false;
  if (normalizeCode(body).indexOf(normalizeCode(code)) >= 0) return true;
  return extractMagnetUrls(body).length > 0;
}

function isSearchResponseUrl(url) {
  return /\/search(?:\/|$)|[?&](?:q|s|keyword)=/i.test(String(url || ""));
}

function findParamDetailUrl(params, code) {
  const base = normalizeBaseUrl(params && params.baseUrl);
  const strings = collectStringValues(params || {});
  const target = normalizeCode(code);

  for (const value of strings) {
    const text = getText(value);
    if (!/^https?:\/\//i.test(text)) continue;
    if (text.indexOf(base) !== 0 && text.indexOf("javmenu.") < 0) continue;
    if (!isLikelyHtmlPageUrl(text)) continue;
    if (target && normalizeCode(text).indexOf(target) < 0) continue;
    return text;
  }

  return "";
}

function buildDetailCandidates(code, baseUrl) {
  const slug = code.toLowerCase();
  const compact = normalizeCode(code).toLowerCase();
  return [
    "/zh/video/" + slug,
    "/zh/videos/" + slug,
    "/zh/v/" + slug,
    "/zh/" + slug,
    "/video/" + slug,
    "/videos/" + slug,
    "/v/" + slug,
    "/" + slug,
    "/zh/video/" + compact,
    "/video/" + compact
  ].map(function (path) {
    return toAbsoluteUrl(path, baseUrl);
  });
}

function buildSearchCandidates(code, baseUrl) {
  const encoded = encodeURIComponent(code);
  return [
    { url: toAbsoluteUrl("/zh/search/" + encoded, baseUrl) },
    { url: toAbsoluteUrl("/search/" + encoded, baseUrl) },
    { url: toAbsoluteUrl("/zh/search", baseUrl), params: { q: code } },
    { url: toAbsoluteUrl("/zh/search", baseUrl), params: { keyword: code } },
    { url: toAbsoluteUrl("/search", baseUrl), params: { q: code } },
    { url: toAbsoluteUrl("/search", baseUrl), params: { keyword: code } },
    { url: toAbsoluteUrl("/zh", baseUrl), params: { s: code } },
    { url: toAbsoluteUrl("/", baseUrl), params: { s: code } }
  ];
}

async function pickDetailFromResponse(resp, code, params, referer) {
  if (isBlockedPage(resp)) return { blocked: true, detail: null };
  if (!resp || resp.status >= 400 || !resp.html) return { blocked: false, detail: null };

  if (isSearchResponseUrl(resp.url)) {
    const searchMatches = parseSearchResults(resp.html, code, params.baseUrl);
    for (const item of searchMatches) {
      const detailResp = await fetchHtml(item.link, params, { referer: referer || resp.url });
      if (isBlockedPage(detailResp)) return { blocked: true, detail: null };
      if (detailResp.status >= 400) continue;
      if (!htmlLooksLikeDetail(detailResp.html, code)) continue;

      return {
        blocked: false,
        detail: {
          code: item.code || code,
          detailUrl: detailResp.url,
          html: detailResp.html
        }
      };
    }

    return { blocked: false, detail: null };
  }

  if (htmlLooksLikeDetail(resp.html, code)) {
    return {
      blocked: false,
      detail: {
        code,
        detailUrl: resp.url,
        html: resp.html
      }
    };
  }

  const matches = parseSearchResults(resp.html, code, params.baseUrl);
  if (!matches.length) return { blocked: false, detail: null };

  for (const item of matches) {
    const detailResp = await fetchHtml(item.link, params, { referer: referer || resp.url });
    if (isBlockedPage(detailResp)) return { blocked: true, detail: null };
    if (detailResp.status >= 400) continue;
    if (!htmlLooksLikeDetail(detailResp.html, code)) continue;

    return {
      blocked: false,
      detail: {
        code: item.code || code,
        detailUrl: detailResp.url,
        html: detailResp.html
      }
    };
  }

  return { blocked: false, detail: null };
}

async function findDetailByCode(code, params) {
  const base = normalizeBaseUrl(params && params.baseUrl);
  const directFromParams = findParamDetailUrl(params, code);
  if (directFromParams) {
    console.log(LOG_PREFIX, "使用参数中的 JAVMenu 详情页:", directFromParams);
    const resp = await fetchHtml(directFromParams, params, { referer: base + "/" });
    const picked = await pickDetailFromResponse(resp, code, params, base + "/");
    if (picked.blocked || picked.detail) return picked;
  }

  const detailCandidates = buildDetailCandidates(code, base);
  for (const url of detailCandidates) {
    console.log(LOG_PREFIX, "尝试详情页:", url);
    const resp = await fetchHtml(url, params, { referer: base + "/" });
    const picked = await pickDetailFromResponse(resp, code, params, base + "/");
    if (picked.blocked || picked.detail) return picked;
  }

  const searchCandidates = buildSearchCandidates(code, base);
  for (const candidate of searchCandidates) {
    console.log(LOG_PREFIX, "尝试搜索:", candidate.url);
    const resp = await fetchHtml(candidate.url, params, {
      referer: base + "/",
      params: candidate.params
    });
    const picked = await pickDetailFromResponse(resp, code, params, candidate.url);
    if (picked.blocked || picked.detail) return picked;
  }

  return { blocked: false, detail: null };
}

function extractMagnetHash(url) {
  const match = String(url || "").match(/(?:btih|btmh):([a-z0-9]{32,64})/i);
  return match ? match[1].toLowerCase() : "";
}

function extractSize(text) {
  const match = String(text || "").match(/\b(\d+(?:\.\d+)?\s*(?:GB|G|MB|M|GiB|MiB))\b/i);
  return match ? match[1].replace(/\s+/g, " ").toUpperCase() : "";
}

function extractDate(text) {
  const match = String(text || "").match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
  return match ? match[1].replace(/[/.]/g, "-") : "";
}

function normalizeMagnet(raw) {
  let magnet = decodeHtml(getText(raw));
  magnet = magnet.replace(/\\u003[dD]/g, "=").replace(/\\u0026/g, "&");
  if (/^magnet%3A/i.test(magnet)) magnet = safeDecodeURIComponent(magnet);
  if (/^magnet:/i.test(magnet)) return magnet.replace(/&amp;/g, "&");

  const encoded = magnet.match(/magnet%3A%3Fxt%3Durn%3A[^"'<>\s]+/i);
  if (encoded) return safeDecodeURIComponent(encoded[0]).replace(/&amp;/g, "&");

  return "";
}

function extractMagnetUrls(html) {
  const source = decodeHtml(String(html || ""))
    .replace(/\\u003[dD]/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");
  const urls = [];
  let match;

  const directRe = /magnet:\?xt=urn:[^"'<>\s]+/gi;
  while ((match = directRe.exec(source)) !== null) {
    urls.push(normalizeMagnet(match[0]));
  }

  const encodedRe = /magnet%3A%3Fxt%3Durn%3A[^"'<>\s]+/gi;
  while ((match = encodedRe.exec(source)) !== null) {
    urls.push(normalizeMagnet(match[0]));
  }

  const attrs = ["href", "data-clipboard-text", "data-magnet", "data-url"];
  for (const attr of attrs) {
    const re = new RegExp("\\b" + attr + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "gi");
    while ((match = re.exec(source)) !== null) {
      const magnet = normalizeMagnet(match[2]);
      if (magnet) urls.push(magnet);
    }
  }

  const seen = new Set();
  const out = [];
  for (const url of urls) {
    const key = extractMagnetHash(url) || url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function parseMagnetRows(html) {
  const rows = [];
  let match;
  const rowRe = /<(?:tr|li)\b[\s\S]*?<\/(?:tr|li)>/gi;
  while ((match = rowRe.exec(String(html || ""))) !== null) {
    if (/magnet(?:\:|%3A)/i.test(match[0])) rows.push(match[0]);
  }

  if (rows.length) return rows;

  const text = String(html || "");
  const magnetRe = /magnet(?::|%3A)(?:\?|%3F)xt(?:=|%3D)urn(?:\:|%3A)[^"'<>\s]+/gi;
  while ((match = magnetRe.exec(text)) !== null) {
    const start = Math.max(0, match.index - 300);
    const end = Math.min(text.length, match.index + match[0].length + 300);
    rows.push(text.slice(start, end));
  }

  return rows;
}

function parseMagnetItems(html, code, detailUrl) {
  const rows = parseMagnetRows(html);
  const seen = new Set();
  const items = [];

  for (const row of rows) {
    const magnets = extractMagnetUrls(row);
    for (const magnet of magnets) {
      const key = extractMagnetHash(magnet) || magnet;
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const rowText = stripTags(row + " " + safeDecodeURIComponent(magnet));
      const size = extractSize(rowText);
      const date = extractDate(rowText);
      const hasSubtitle = /字幕|中文字幕|subtitle|\bsub\b/i.test(rowText);
      const hasHd = /高清|\bHD\b|1080|720|2160|4K/i.test(rowText);
      const tags = [];

      if (hasSubtitle) tags.push("[字幕]");
      if (hasHd) tags.push("[高清]");

      items.push({
        name: (tags.join("") + code + (size ? " " + size : "")).trim(),
        description:
          "来源：JAVMenu\n" +
          "类型：Magnet\n" +
          "番号：" + (code || "未知") + "\n" +
          "大小：" + (size || "未知") + "\n" +
          "日期：" + (date || "未知") + "\n" +
          "字幕：" + (hasSubtitle ? "是" : "未知") + "\n" +
          "高清：" + (hasHd ? "是" : "未知") + "\n" +
          "详情页：" + detailUrl,
        url: magnet
      });
    }
  }

  return items;
}

function parseMagnetPageLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  let match;
  const linkRe = /<a\b([^>]*href\s*=\s*["'][^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;

  while ((match = linkRe.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const href = extractAttr(attrs, "href");
    if (!isLikelyHtmlPageUrl(href)) continue;

    const text = (extractAttr(attrs, "title") + " " + stripTags(body) + " " + href).toLowerCase();
    if (!/(magnet|torrent|download|bt|磁力|下载|種子|种子)/i.test(text)) continue;

    const url = toAbsoluteUrl(href, baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push(url);
  }

  return links.slice(0, 5);
}

async function fetchMagnets(detail, params) {
  let items = parseMagnetItems(detail.html, detail.code, detail.detailUrl);
  if (items.length) return items;

  const base = normalizeBaseUrl(params && params.baseUrl);
  const links = parseMagnetPageLinks(detail.html, base);
  const seen = new Set();

  for (const link of links) {
    if (seen.has(link)) continue;
    seen.add(link);

    const resp = await fetchHtml(link, params, { referer: detail.detailUrl });
    if (isBlockedPage(resp) || resp.status >= 400) continue;
    items = items.concat(parseMagnetItems(resp.html, detail.code, detail.detailUrl));
  }

  const byHash = new Set();
  return items.filter(function (item) {
    const key = extractMagnetHash(item.url) || item.url;
    if (!key || byHash.has(key)) return false;
    byHash.add(key);
    return true;
  });
}

async function loadResource(params = {}) {
  try {
    const cookie = normalizeCookie(params.cookie);
    if (!cookie) {
      console.warn(LOG_PREFIX, "未配置 JAVMenu Cookie，无法通过 Cloudflare 验证，跳过匹配");
      return [];
    }

    const normalizedParams = Object.assign({}, params, {
      baseUrl: normalizeBaseUrl(params.baseUrl),
      cookie
    });

    const code = extractCodeFromParams(normalizedParams);
    if (!code) {
      console.log(LOG_PREFIX, "当前视频信息中未找到番号，跳过 JAVMenu 匹配");
      return [];
    }

    console.log(LOG_PREFIX, "提取到番号:", code);

    const found = await findDetailByCode(code, normalizedParams);
    if (found.blocked) {
      console.warn(LOG_PREFIX, "JAVMenu Cookie 缺失或已失效：页面返回 Cloudflare 验证");
      return [];
    }
    if (!found.detail) {
      console.log(LOG_PREFIX, "未找到 JAVMenu 精确匹配:", code);
      return [];
    }

    const magnets = await fetchMagnets(found.detail, normalizedParams);
    console.log(LOG_PREFIX, "磁力资源数量:", magnets.length);
    return magnets;
  } catch (error) {
    console.error(LOG_PREFIX, "loadResource 失败:", error.message || error);
    return [];
  }
}
