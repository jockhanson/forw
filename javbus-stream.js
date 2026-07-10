WidgetMetadata = {
  id: "javbus-stream",
  title: "磁力链接",
  description: "通过番号匹配 JavBus 磁力资源",
  author: "EL",
  site: "https://www.javbus.com",
  version: "1.4.2",
  requiredVersion: "0.0.1",
  detailCacheDuration: 0,
  globalParams: [
    {
      name: "cookie",
      title: "JavBus Cookie",
      type: "input",
      description: "在浏览器通过 JavBus 年龄验证后，复制整段 Cookie 填入（含名）。"
    },
    {
      name: "pan115Cookie",
      title: "115 Cookie",
      type: "input",
      description: "115.com 登录后的完整 Cookie，用于点击磁力候选后提交离线任务。"
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "磁力链接",
      description: "根据当前视频信息匹配 JavBus 磁力链接，点击提交到 115 离线下载",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: []
    }
  ]
};

const JAVBUS_BASE = "https://www.javbus.com";
const JAVBUS_AJAX = JAVBUS_BASE + "/ajax/uncledatoolsbyajax.php";
const REQUEST_TIMEOUT = 15000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
const LOG_PREFIX = "[javbus-stream]";
const PAN115_MAGNET_CACHE_TTL = 3600 * 1000;
const PAN115_BASE = "https://115.com";
const PAN115_SPACE_URL = PAN115_BASE + "/?ct=offline&ac=space";
const PAN115_ADD_TASK_URL = PAN115_BASE + "/web/lixian/?ct=lixian&ac=add_task_url";
const PAN115_PENDING_TTL = 5 * 60 * 1000;
const RUNTIME_PARAMS_KEY = "javbus-stream.runtimeParams";

function getText(value) {
  return String(value || "").trim();
}

function decodeHtml(value) {
  return getText(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#(\d+);/g, function (_, dec) {
      return String.fromCharCode(parseInt(dec, 10));
    });
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

function cacheJavBusCookie(cookie) {
  try {
    if (cookie && typeof Widget !== "undefined" && Widget.storage && typeof Widget.storage.set === "function") {
      Widget.storage.set("javbus.cookie", cookie);
    }
  } catch (_) {}
}

function storageGet(key) {
  try {
    if (typeof Widget === "undefined" || !Widget.storage || typeof Widget.storage.get !== "function") return "";
    return Widget.storage.get(key);
  } catch (_) {
    return "";
  }
}

function storageSet(key, value) {
  try {
    if (typeof Widget === "undefined" || !Widget.storage || typeof Widget.storage.set !== "function") return;
    Widget.storage.set(key, value);
  } catch (error) {
    console.warn(LOG_PREFIX, "storage set failed:", key, error.message || error);
  }
}

function storeGetJSON(key, fallback) {
  const raw = storageGet(key);
  if (!raw) return fallback;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_) {
    return fallback;
  }
}

function storeSetJSON(key, value) {
  storageSet(key, JSON.stringify(value));
}

function pickRuntimeParams(params) {
  const p = params || {};
  const keys = [
    "cookie",
    "pan115Cookie",
    "cookie115",
    "115Cookie",
    "pan115_cookie",
    "offlineCookie",
    "code",
    "videoId",
    "number",
    "id",
    "vod_id",
    "title",
    "name",
    "originalTitle",
    "originalName",
    "fileName",
    "filename",
    "description",
    "episodeName",
    "link",
    "url",
    "detailUrl",
    "pageUrl",
    "posterPath",
    "coverUrl",
    "backdropPath",
    "previewUrl"
  ];
  const out = {};

  for (const key of keys) {
    if (p[key] === undefined || p[key] === null) continue;
    const value = String(p[key]).trim();
    if (value) out[key] = value;
  }

  return out;
}

function rememberRuntimeParams(params) {
  const saved = storeGetJSON(RUNTIME_PARAMS_KEY, {});
  const next = Object.assign({}, saved || {}, pickRuntimeParams(params));
  if (Object.keys(next).length) storeSetJSON(RUNTIME_PARAMS_KEY, next);
  return next;
}

function getRuntimeParams() {
  return storeGetJSON(RUNTIME_PARAMS_KEY, {}) || {};
}

function getCookieValue(cookie, name) {
  const target = String(name || "").toLowerCase();
  const parts = String(cookie || "").split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    if (key === target) return trimmed.slice(idx + 1).trim();
  }
  return "";
}

function looksLikePan115Cookie(cookie) {
  const text = String(cookie || "");
  return !!(getCookieValue(text, "UID") || getCookieValue(text, "SEID") || getCookieValue(text, "CID"));
}

function cachePan115Cookie(cookie) {
  const normalized = normalizeCookie(cookie);
  if (normalized && looksLikePan115Cookie(normalized)) {
    storageSet("pan115.cookie", normalized);
  }
}

function resolvePan115Cookie(params) {
  const p = params || {};
  const direct = normalizeCookie(
    p.pan115Cookie ||
    p.cookie115 ||
    p["115Cookie"] ||
    p.pan115_cookie ||
    p.offlineCookie
  );

  if (direct) {
    cachePan115Cookie(direct);
    return direct;
  }

  const cached = normalizeCookie(storageGet("pan115.cookie"));
  if (cached) return cached;

  const lastResort = normalizeCookie(p.cookie);
  if (looksLikePan115Cookie(lastResort)) {
    cachePan115Cookie(lastResort);
    return lastResort;
  }

  return "";
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

function toAbsoluteUrl(href) {
  const value = decodeHtml(href);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  if (value.charAt(0) === "/") return JAVBUS_BASE + value;
  return JAVBUS_BASE + "/" + value;
}

function extractAttr(html, name) {
  const re = new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function extractSearchCode(text, options) {
  const opts = options || {};
  const allowPureNumeric = opts.allowPureNumeric !== false;
  let s = getText(text).toUpperCase();
  if (!s) return "";

  try {
    s = decodeURIComponent(s);
  } catch (e) {}

  s = s.replace(/^[A-Z0-9]+(?:\.[A-Z0-9]+)+@/, "");

  const normalized = s
    .replace(/\./g, " ")
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const knownMakerPattern = /\b(?:SONE|S2M|MIAA|SSNI|SNIS|IPX|IPZZ|SSIS|JUQ|MIDE|MIDV|STARS|ABW|RKI|DVAJ|WANZ|LULU|DLDSS|VRTM|SDMU|SDDE|MKMP|HMN|MUDR|ADN|CAWD|PPPE|PRED|MGR|SHKD|MXGS|FSDSS|JUL|KTB|MIAB|GVH|MIMK|JUY|JUTA|IDBD|HND|DASD|CLO|BF|HONB|ROE|CEMD|MIUM|NITR|RCTD|RCT|IPVR|MIBD|JUR|JURD|SOE|ORE|PYO|START|NSFS|ESD|GVG|REAL|LAF|SMD|MD|BAD|MOND|ARSO|MOCKY|FONE|GANA|MUKO|PAPA|RASH|TAMA|ZUKO|HEY|PACO)\s*[-_ ]?\d{2,6}[A-Z]?(?:[-_ ]?[A-Z]{0,4})?\b/i;
  const makerMatch = normalized.match(knownMakerPattern);
  if (makerMatch && makerMatch[0]) {
    return formatMatchedCode(makerMatch[0]);
  }

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
    p.streamUrl
  ];

  if (p.tmdbInfo) {
    candidates.push(
      p.tmdbInfo.title,
      p.tmdbInfo.name,
      p.tmdbInfo.originalTitle,
      p.tmdbInfo.originalName,
      p.tmdbInfo.overview
    );
  }

  if (p.info) {
    candidates.push(
      p.info.title,
      p.info.name,
      p.info.originalTitle,
      p.info.originalName,
      p.info.overview
    );
  }

  if (p.mediaSource) {
    candidates.push(
      p.mediaSource.name,
      p.mediaSource.fileName,
      p.mediaSource.filename,
      p.mediaSource.path,
      p.mediaSource.url,
      p.mediaSource.streamUrl
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

function buildHeaders(params, extra) {
  const headers = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": JAVBUS_BASE + "/"
  };

  const cookie = normalizeCookie(params && params.cookie);
  if (cookie) headers["Cookie"] = cookie;

  return Object.assign(headers, extra || {});
}

async function fetchHtml(url, params, options) {
  const opts = options || {};
  const requestOptions = {
    headers: buildHeaders(params, opts.headers),
    timeout: opts.timeout || REQUEST_TIMEOUT
  };

  if (opts.params) requestOptions.params = opts.params;

  const resp = await Widget.http.get(url, requestOptions);
  if (!resp) return { status: 0, html: "" };

  const status = Number(resp.statusCode || resp.status || 200);
  return {
    status,
    html: String(resp.data || "")
  };
}

function isAgeVerifyPage(html) {
  const lower = String(html || "").toLowerCase();
  return (
    lower.indexOf("age verification javbus") >= 0 ||
    lower.indexOf('id="ageverify"') >= 0 ||
    lower.indexOf("doc/driver-verify") >= 0 ||
    lower.indexOf("你是否已經成年") >= 0 ||
    lower.indexOf("我已經成年") >= 0
  );
}

function extractCodeFromJavbusLink(link) {
  const href = decodeHtml(link).split("?")[0].split("#")[0];
  const parts = href.split("/").filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : "";
  return extractSearchCode(last, { allowPureNumeric: true });
}

function parseSearchResults(html, targetCode) {
  const target = normalizeCode(targetCode);
  const results = [];
  const seen = new Set();
  let match;

  const movieBoxRe = /<a\b(?=[^>]*class\s*=\s*["'][^"']*\bmovie-box\b[^"']*["'])([^>]*)>([\s\S]*?)<\/a>/gi;
  while ((match = movieBoxRe.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const href = extractAttr(attrs, "href");
    const link = toAbsoluteUrl(href);
    if (!link || seen.has(link)) continue;

    const imgTitle = extractAttr(body, "title");
    const text = stripTags(body);
    const code = extractCodeFromJavbusLink(link) ||
      extractSearchCode(imgTitle, { allowPureNumeric: true }) ||
      extractSearchCode(text, { allowPureNumeric: true });

    if (!code) continue;
    seen.add(link);
    results.push({
      code,
      link,
      title: imgTitle || text || code
    });
  }

  if (results.length === 0) {
    const linkRe = /<a\b([^>]*href\s*=\s*["'][^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
    while ((match = linkRe.exec(String(html || ""))) !== null) {
      const attrs = match[1] || "";
      const href = extractAttr(attrs, "href");
      const link = toAbsoluteUrl(href);
      if (!link || seen.has(link)) continue;

      const code = extractCodeFromJavbusLink(link);
      if (!code) continue;

      seen.add(link);
      results.push({
        code,
        link,
        title: stripTags(match[2]) || code
      });
    }
  }

  const exact = results.filter(function (item) {
    return normalizeCode(item.code) === target;
  });

  return exact.length ? exact : [];
}

function extractJsValue(html, name) {
  const patterns = [
    new RegExp("(?:var\\s+)?" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"),
    new RegExp("(?:var\\s+)?" + name + "\\s*=\\s*([^;\\s]+)", "i"),
    new RegExp("[?&]" + name + "=([^&\"'<>\\s]+)", "i")
  ];

  for (const re of patterns) {
    const match = String(html || "").match(re);
    if (match) return decodeHtml(match[2] || match[1] || "");
  }

  return "";
}

function parseDetailInfo(html, detailUrl, code) {
  const titleMatch = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    code,
    detailUrl,
    title: titleMatch ? stripTags(titleMatch[1]) : code,
    gid: extractJsValue(html, "gid"),
    uc: extractJsValue(html, "uc") || "0",
    img: extractJsValue(html, "img")
  };
}

function hasDetailAjaxParams(detail) {
  return !!(detail && detail.gid);
}

async function findDetailByCode(code, params) {
  const directUrl = JAVBUS_BASE + "/" + encodeURIComponent(code);
  console.log(LOG_PREFIX, "尝试详情页:", directUrl);

  const direct = await fetchHtml(directUrl, params, {
    headers: { "Referer": JAVBUS_BASE + "/" }
  });

  if (isAgeVerifyPage(direct.html)) {
    console.warn(LOG_PREFIX, "JavBus Cookie 缺失或已失效：详情页返回年龄验证页面");
    return { blocked: true, detail: null };
  }

  if (direct.status < 400) {
    const detail = parseDetailInfo(direct.html, directUrl, code);
    if (hasDetailAjaxParams(detail)) return { blocked: false, detail };
  }

  const searchUrl = JAVBUS_BASE + "/search/" + encodeURIComponent(code) + "&type=&parent=ce";
  console.log(LOG_PREFIX, "直接详情不可用，改用搜索:", searchUrl);

  const search = await fetchHtml(searchUrl, params, {
    headers: { "Referer": JAVBUS_BASE + "/" }
  });

  if (isAgeVerifyPage(search.html)) {
    console.warn(LOG_PREFIX, "JavBus Cookie 缺失或已失效：搜索页返回年龄验证页面");
    return { blocked: true, detail: null };
  }

  if (search.status >= 400) return { blocked: false, detail: null };

  const matches = parseSearchResults(search.html, code);
  if (!matches.length) return { blocked: false, detail: null };

  const picked = matches[0];
  console.log(LOG_PREFIX, "搜索匹配详情页:", picked.link);

  const detailResp = await fetchHtml(picked.link, params, {
    headers: { "Referer": searchUrl }
  });

  if (isAgeVerifyPage(detailResp.html)) {
    console.warn(LOG_PREFIX, "JavBus Cookie 缺失或已失效：匹配详情页返回年龄验证页面");
    return { blocked: true, detail: null };
  }

  if (detailResp.status >= 400) return { blocked: false, detail: null };

  const detail = parseDetailInfo(detailResp.html, picked.link, picked.code);
  return { blocked: false, detail: hasDetailAjaxParams(detail) ? detail : null };
}

function extractMagnetHash(url) {
  const match = String(url || "").match(/btih:([a-z0-9]{32,40})/i);
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

function normalizePan115DvdId(code) {
  return getText(code).toLowerCase();
}

function parseSizeBytes(sizeText) {
  const match = String(sizeText || "").replace(/,/g, "").match(/([\d.]+)\s*(GiB|MiB|KiB|GB|G|MB|M|KB|K|B)?/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  if (!isFinite(value)) return 0;

  const unit = (match[2] || "B").toUpperCase();
  const map = {
    GIB: 1024 * 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    G: 1024 * 1024 * 1024,
    MIB: 1024 * 1024,
    MB: 1024 * 1024,
    M: 1024 * 1024,
    KIB: 1024,
    KB: 1024,
    K: 1024,
    B: 1
  };

  return value * (map[unit] || 1);
}

function simpleHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36);
}

function buildPan115Tags(hasSubtitle, hasHd, rowText) {
  const tags = [];
  if (hasSubtitle) tags.push("cnsub");
  if (hasHd) tags.push("hd");
  if (/4K|2160/i.test(rowText || "")) tags.push("4k");
  return tags;
}

function storePan115MagnetCandidates(code, candidates) {
  const dvdId = normalizePan115DvdId(code);
  if (!dvdId || !candidates || !candidates.length) return;

  try {
    if (typeof Widget === "undefined" || !Widget.storage || typeof Widget.storage.set !== "function") return;
    Widget.storage.set("magnet-candidates:" + dvdId, JSON.stringify({
      time: Date.now(),
      ttl: PAN115_MAGNET_CACHE_TTL,
      items: candidates
    }));
    console.log(LOG_PREFIX, "已写入 pan115 磁力候选缓存:", dvdId, candidates.length);
  } catch (error) {
    console.warn(LOG_PREFIX, "写入 pan115 磁力候选缓存失败:", error.message || error);
  }
}

function buildPan115OfflineLink(code, candidateId, magnet, title, size) {
  const query = [
    "cid=" + encodeURIComponent(candidateId),
    "magnet=" + encodeURIComponent(magnet || ""),
    "title=" + encodeURIComponent(title || code || "JavBus Magnet")
  ];

  if (size) query.push("size=" + encodeURIComponent(size));
  query.push("source=javbus");

  return "offline-submit://" + normalizePan115DvdId(code) + "?" + query.join("&");
}

function parseQueryString(query) {
  const result = {};
  String(query || "").split("&").forEach(function (pair) {
    if (!pair) return;
    const idx = pair.indexOf("=");
    const key = idx >= 0 ? pair.slice(0, idx) : pair;
    const value = idx >= 0 ? pair.slice(idx + 1) : "";
    if (!key) return;
    try {
      result[key] = decodeURIComponent(value || "");
    } catch (_) {
      result[key] = value || "";
    }
  });
  return result;
}

function parseOfflineSubmitLink(link) {
  const rest = String(link || "").slice("offline-submit://".length);
  const qIndex = rest.indexOf("?");
  const rawDvdId = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
  const query = qIndex >= 0 ? parseQueryString(rest.slice(qIndex + 1)) : {};
  let dvdId = rawDvdId || "";

  try {
    dvdId = decodeURIComponent(dvdId);
  } catch (_) {}

  const magnet = getText(query.magnet || query.maglink || query.url);
  let candidateId = getText(query.cid || query.id || query.infoHash);
  if (!candidateId && magnet) candidateId = extractMagnetHash(magnet) || simpleHash(magnet);

  return {
    dvdId: getText(query.dvd || query.code || dvdId).toLowerCase(),
    candidateId,
    magnet,
    title: getText(query.title || query.name),
    size: getText(query.size || query.sizeText),
    sizeBytes: Number(query.sizeBytes || 0) || parseSizeBytes(query.size || ""),
    source: getText(query.source || "javbus")
  };
}

function formatSizeLabel(bytes) {
  if (!bytes || bytes <= 0) return "";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return gb.toFixed(gb >= 10 ? 1 : 2) + " GB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return Math.round(mb) + " MB";
  const kb = bytes / 1024;
  if (kb >= 1) return Math.round(kb) + " KB";
  return String(Math.round(bytes)) + " B";
}

function scoreCandidate(candidate) {
  let score = 0;
  const tags = candidate && candidate.tags ? candidate.tags : [];
  if (tags.indexOf("cnsub") >= 0) score += 100;
  if (tags.indexOf("hd") >= 0) score += 20;
  if (tags.indexOf("4k") >= 0) score += 10;

  const gb = Number(candidate && candidate.sizeBytes || 0) / (1024 * 1024 * 1024);
  if (gb >= 0.3 && gb <= 15) score += 20;
  if (gb > 30) score -= 50;
  return score;
}

function tagText(tags) {
  const list = tags || [];
  let text = "";
  if (list.indexOf("cnsub") >= 0) text += "｜中文字幕";
  if (list.indexOf("hd") >= 0) text += "｜高清";
  if (list.indexOf("4k") >= 0) text += "｜4K";
  return text;
}

function buildCandidateDescription(code, candidate, submitted) {
  const size = formatSizeLabel(candidate.sizeBytes) || candidate.size || "未知";
  const status = submitted && submitted.ok
    ? "状态：已提交到 115"
    : submitted && submitted.ok === false
      ? "状态：上次提交失败，点击可重试"
      : "状态：点击确认后提交到 115 离线下载";

  return [
    status,
    "来源：JavBus",
    "番号：" + (code || candidate.dvdId || "未知"),
    "大小：" + size,
    "日期：" + (candidate.date || "未知"),
    "字幕：" + ((candidate.tags || []).indexOf("cnsub") >= 0 ? "是" : "未知"),
    "高清：" + ((candidate.tags || []).indexOf("hd") >= 0 ? "是" : "未知"),
    candidate.detailUrl ? "详情页：" + candidate.detailUrl : ""
  ].filter(Boolean).join("\n");
}

function buildStatusEpisodeItem(code, title, message) {
  const dvdId = normalizePan115DvdId(code || "unknown");
  return {
    id: "javbus-magnet-status:" + dvdId + ":" + simpleHash(title + message),
    type: "url",
    mediaType: "movie",
    title,
    name: title,
    description: message,
    link: "magnet-status://" + dvdId,
    episode: 1,
    originalTitle: code || title,
    playerType: "system"
  };
}

function buildEpisodeItems(code, candidates) {
  const dvdId = normalizePan115DvdId(code);
  if (!dvdId || !candidates || !candidates.length) return [];

  return candidates.map(function (candidate, index) {
    const candidateId = candidate.infoHash || extractMagnetHash(candidate.maglink) || ("idx_" + index);
    const submitted = storeGetJSON("offline-submitted:" + dvdId + ":" + candidateId, null);
    const size = formatSizeLabel(candidate.sizeBytes) || candidate.size || "";
    const tags = tagText(candidate.tags);
    let title = "";

    if (submitted && submitted.ok) {
      title = "已提交到115｜JavBus" + (size ? "｜" + size : "") + tags;
    } else if (submitted && submitted.ok === false) {
      title = "提交失败，可重试｜JavBus" + (size ? "｜" + size : "") + tags;
    } else {
      title = "确认提交115离线｜JavBus" + (size ? "｜" + size : "") + tags;
    }

    const offlineLink = buildPan115OfflineLink(
      dvdId,
      candidateId,
      candidate.maglink,
      candidate.title || title,
      candidate.size || size
    );

    return {
      id: "javbus-offline:" + dvdId + ":" + candidateId,
      type: "url",
      title,
      name: title,
      description: buildCandidateDescription(code, candidate, submitted),
      link: offlineLink,
      actionLink: offlineLink,
      offlineLink,
      magnetUrl: candidate.maglink,
      mediaType: "movie",
      episode: index + 1,
      originalTitle: code || title,
      playerType: "system"
    };
  });
}

function findOfflineCandidate(info) {
  if (info && info.magnet) {
    return {
      title: info.title || info.dvdId || "JavBus Magnet",
      maglink: info.magnet,
      size: info.size || "",
      sizeBytes: info.sizeBytes || 0,
      infoHash: info.candidateId,
      source: info.source || "javbus",
      tags: []
    };
  }

  const dvdId = info && info.dvdId;
  const cached = storeGetJSON("magnet-candidates:" + dvdId, null);
  const items = cached && cached.items ? cached.items : [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const candidateId = item.infoHash || extractMagnetHash(item.maglink) || ("idx_" + i);
    if (candidateId === info.candidateId) return item;
  }

  return null;
}

function buildMagnetDetailItem(params, code, episodeItems) {
  const p = params || {};
  const dvdId = normalizePan115DvdId(code);
  const title = getText(p.title || p.name || p.originalTitle || code || "JavBus 磁力候选");
  const poster = getText(p.posterPath || p.coverUrl || p.backdropPath || p.previewUrl);
  const link = getText(p.link || p.detailUrl || p.url || ("javbus-magnets://" + dvdId));
  const items = episodeItems || [];

  return {
    id: "javbus-magnets:" + dvdId,
    vod_id: "javbus-magnets:" + dvdId,
    type: "url",
    mediaType: "movie",
    title,
    name: title,
    originalTitle: code || title,
    description: "JavBus 磁力候选，点击候选提交到 115 离线下载。",
    link,
    posterPath: poster,
    coverUrl: poster,
    backdropPath: poster,
    previewUrl: poster,
    playerType: "system",
    episodeItems: items,
    childItems: items,
    relatedItems: items
  };
}

function parseMagnetRows(html) {
  const rows = [];
  let match;
  const trRe = /<tr\b[\s\S]*?<\/tr>/gi;

  while ((match = trRe.exec(String(html || ""))) !== null) {
    rows.push(match[0]);
  }

  if (rows.length) return rows;

  const text = String(html || "");
  const magnetRe = /magnet:\?xt=urn:btih:[^"'<>\s]+/gi;
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
  const candidates = [];

  for (const row of rows) {
    const magnetRe = /magnet:\?xt=urn:btih:[^"'<>\s]+/ig;
    let match;

    while ((match = magnetRe.exec(row)) !== null) {
      const magnet = decodeHtml(match[0]);
      const hash = extractMagnetHash(magnet);
      const seenKey = hash || magnet;
      if (!seenKey || seen.has(seenKey)) continue;
      seen.add(seenKey);

      const rowText = stripTags(row);
      const size = extractSize(rowText);
      const date = extractDate(rowText);
      const hasSubtitle = /字幕|中文字幕|subtitle|\bsub\b/i.test(rowText);
      const hasHd = /高清|\bHD\b|1080|720|4K/i.test(rowText);
      const tags = [];
      const candidateId = hash || simpleHash(magnet);
      const pan115Tags = buildPan115Tags(hasSubtitle, hasHd, rowText);

      if (hasSubtitle) tags.push("[字幕]");
      if (hasHd) tags.push("[高清]");
      const rawTitle = (tags.join("") + code + (size ? " " + size : "")).trim();

      candidates.push({
        title: rawTitle,
        maglink: magnet,
        size: size || "",
        sizeBytes: parseSizeBytes(size),
        infoHash: candidateId,
        source: "javbus",
        tags: pan115Tags,
        date,
        detailUrl
      });
    }
  }

  candidates.sort(function (a, b) {
    return scoreCandidate(b) - scoreCandidate(a);
  });

  storePan115MagnetCandidates(code, candidates);
  return buildEpisodeItems(code, candidates);
}

async function fetchMagnets(detail, params) {
  const ajax = await fetchHtml(JAVBUS_AJAX, params, {
    headers: {
      "Referer": detail.detailUrl,
      "X-Requested-With": "XMLHttpRequest"
    },
    params: {
      gid: detail.gid,
      lang: "zh",
      img: detail.img || "",
      uc: detail.uc || "0",
      floor: String(Math.floor(Math.random() * 1000 + 1))
    }
  });

  if (isAgeVerifyPage(ajax.html)) {
    console.warn(LOG_PREFIX, "JavBus Cookie 缺失或已失效：磁力接口返回年龄验证页面");
    return [];
  }

  return parseMagnetItems(ajax.html, detail.code, detail.detailUrl);
}

function buildPan115Headers(cookie, extra) {
  const headers = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": PAN115_BASE + "/",
    "Origin": PAN115_BASE
  };

  const normalized = normalizeCookie(cookie);
  if (normalized) headers["Cookie"] = normalized;
  return Object.assign(headers, extra || {});
}

function parseJsonResponse(resp, label) {
  const data = resp && Object.prototype.hasOwnProperty.call(resp, "data") ? resp.data : resp;
  if (typeof data === "string") {
    const text = data.trim();
    if (!text) throw new Error(label + " 返回空内容");
    return JSON.parse(text);
  }
  if (data && typeof data === "object") return data;
  throw new Error(label + " 返回格式异常: " + String(data));
}

function extractUidFromCookie(cookie) {
  const uid = getCookieValue(cookie, "UID");
  if (uid) return uid;

  const first = String(cookie || "").split(";")[0].trim();
  const idx = first.indexOf("=");
  return idx >= 0 ? first.slice(idx + 1).trim() : "";
}

async function getOfflineSpaceToken(cookie) {
  const url = PAN115_SPACE_URL + "&_=" + Date.now();
  console.log(LOG_PREFIX, "获取 115 离线 token:", url);

  const resp = await Widget.http.get(url, {
    headers: buildPan115Headers(cookie),
    timeout: REQUEST_TIMEOUT
  });
  const json = parseJsonResponse(resp, "115 space");

  if (json.state !== true) {
    throw new Error("115 space 获取失败: " + (json.error_msg || json.error || JSON.stringify(json)));
  }
  if (!json.sign || !json.time) {
    throw new Error("115 space 未返回 sign/time");
  }

  return {
    sign: json.sign,
    time: json.time,
    size: json.size,
    limit: json.limit
  };
}

async function submitOfflineTask(cookie, magnet, tokenObj) {
  const maglink = getText(magnet);
  if (!/^magnet:\?xt=urn:btih:/i.test(maglink)) {
    throw new Error("无效磁力链接");
  }

  const uid = tokenObj.uid || extractUidFromCookie(cookie);
  const body = "url=" + encodeURIComponent(maglink)
    + "&uid=" + encodeURIComponent(uid)
    + "&sign=" + encodeURIComponent(tokenObj.sign)
    + "&time=" + encodeURIComponent(tokenObj.time);

  console.log(LOG_PREFIX, "提交 115 离线任务:", maglink.slice(0, 80));
  const resp = await Widget.http.post(PAN115_ADD_TASK_URL, body, {
    headers: buildPan115Headers(cookie, {
      "Content-Type": "application/x-www-form-urlencoded"
    }),
    timeout: 20000
  });
  const json = parseJsonResponse(resp, "115 add_task_url");

  if (json.state === true) {
    return {
      state: true,
      info_hash: json.info_hash || ""
    };
  }

  return {
    state: false,
    error: json.errcode === "911"
      ? "账号使用异常，请手工验证"
      : (json.error_msg || json.error || "115 返回失败"),
    errcode: json.errcode
  };
}

async function offlineOneClick(cookie, magnet) {
  const token = await getOfflineSpaceToken(cookie);
  return submitOfflineTask(cookie, magnet, {
    sign: token.sign,
    time: token.time
  });
}

function buildOfflineReceipt(link, ok, title, message) {
  return {
    id: "javbus-offline-receipt:" + simpleHash(link),
    type: "url",
    title,
    name: title,
    description: message,
    link,
    mediaType: "movie"
  };
}

async function handleOfflineSubmit(params, link) {
  const info = parseOfflineSubmitLink(link);
  const dvdId = info.dvdId;
  const candidateId = info.candidateId;

  if (!dvdId || !candidateId) {
    return buildOfflineReceipt(link, false, "提交失败", "未找到有效的番号和磁力候选标识。");
  }

  const submittedKey = "offline-submitted:" + dvdId + ":" + candidateId;
  const submitted = storeGetJSON(submittedKey, null);
  if (submitted && submitted.ok) {
    return buildOfflineReceipt(link, true, "此前已提交到115", "这条 JavBus 磁力已经提交过。请返回详情页刷新，等待 115 资源匹配。");
  }

  const pendingKey = "offline-pending:" + dvdId + ":" + candidateId;
  const pending = storeGetJSON(pendingKey, null);
  if (pending && pending.time && Date.now() - pending.time < PAN115_PENDING_TTL) {
    return buildOfflineReceipt(link, true, "任务提交中", "这条磁力正在提交处理中，短时间内不会重复提交。");
  }

  const candidate = findOfflineCandidate(info);
  if (!candidate || !candidate.maglink) {
    storeSetJSON(submittedKey, {
      ok: false,
      time: Date.now(),
      error: "candidate not found"
    });
    return buildOfflineReceipt(link, false, "提交失败", "未找到对应的 JavBus 磁力候选，请返回详情页刷新后重试。");
  }

  const cookie = resolvePan115Cookie(params);
  if (!cookie) {
    storeSetJSON(submittedKey, {
      ok: false,
      time: Date.now(),
      title: candidate.title || info.title || "",
      error: "no 115 cookie"
    });
    return buildOfflineReceipt(link, false, "提交失败", "请先填写 115 Cookie，或先通过 115 模块保存登录 Cookie。");
  }

  storeSetJSON(pendingKey, { time: Date.now() });

  let result;
  try {
    result = await offlineOneClick(cookie, candidate.maglink);
  } catch (error) {
    result = {
      state: false,
      error: error.message || String(error)
    };
  }

  storeSetJSON(submittedKey, {
    ok: result && result.state === true,
    time: Date.now(),
    title: candidate.title || info.title || "",
    sizeText: formatSizeLabel(candidate.sizeBytes) || candidate.size || info.size || "",
    message: result && result.error || "",
    infoHash: result && result.info_hash || ""
  });
  storeSetJSON(pendingKey, { time: 0, done: true });

  if (result && result.state === true) {
    return buildOfflineReceipt(link, true, "已提交到115离线", "任务已提交。请返回详情页刷新，等待 115 资源匹配。");
  }

  return buildOfflineReceipt(link, false, "提交失败", (result && result.error) || "115 返回失败，请稍后重试。");
}

async function loadMagnetLinks(params = {}, options = {}) {
  try {
    const includeStatus = !!(options && options.includeStatus);
    const code = extractCodeFromParams(params);
    if (!code) {
      console.log(LOG_PREFIX, "当前视频信息中未找到番号，跳过 JavBus 匹配");
      return [];
    }

    const cached = storeGetJSON("magnet-candidates:" + normalizePan115DvdId(code), null);
    if (cached && cached.items && Date.now() - cached.time < (cached.ttl || PAN115_MAGNET_CACHE_TTL)) {
      console.log(LOG_PREFIX, "使用缓存 JavBus 磁力候选:", code, cached.items.length);
      return buildEpisodeItems(code, cached.items);
    }

    const cookie = normalizeCookie(params.cookie || storageGet("javbus.cookie"));
    if (!cookie) {
      console.warn(LOG_PREFIX, "未配置 JavBus Cookie，无法通过年龄验证，跳过匹配");
      return includeStatus
        ? [buildStatusEpisodeItem(code, "JavBus磁力｜需要配置 Cookie", "请在本模块填写 JavBus Cookie，或先通过 JavBus 年龄验证后复制 Cookie。")]
        : [];
    }
    cacheJavBusCookie(cookie);
    const requestParams = Object.assign({}, params, { cookie });

    console.log(LOG_PREFIX, "提取到番号:", code);

    const found = await findDetailByCode(code, requestParams);
    if (found.blocked) {
      return includeStatus
        ? [buildStatusEpisodeItem(code, "JavBus磁力｜年龄验证未通过", "JavBus 返回年龄验证页面，请更新 JavBus Cookie。")]
        : [];
    }
    if (!found.detail) {
      console.log(LOG_PREFIX, "未找到 JavBus 精确匹配:", code);
      return includeStatus
        ? [buildStatusEpisodeItem(code, "JavBus磁力｜未找到详情", "未在 JavBus 找到 " + code + " 的精确匹配。")]
        : [];
    }

    const magnets = await fetchMagnets(found.detail, requestParams);
    console.log(LOG_PREFIX, "磁力资源数量:", magnets.length);
    return magnets.length || !includeStatus
      ? magnets
      : [buildStatusEpisodeItem(code, "JavBus磁力｜暂无候选", "JavBus 暂未返回 " + code + " 的磁力候选。")];
  } catch (error) {
    console.error(LOG_PREFIX, "loadResource 失败:", error.message || error);
    if (options && options.includeStatus) {
      const code = extractCodeFromParams(params);
      return [buildStatusEpisodeItem(code, "JavBus磁力｜加载失败", String(error.message || error || "未知错误"))];
    }
    return [];
  }
}

async function loadResource(params = {}) {
  const runtime = rememberRuntimeParams(params);
  resolvePan115Cookie(runtime);
  const link = getText(params.link);
  if (link.indexOf("offline-submit://") === 0) {
    console.log(LOG_PREFIX, "检测到离线提交路由:", link.slice(0, 120));
    const receipt = await handleOfflineSubmit(runtime, link);
    return [receipt];
  }

  return loadMagnetLinks(runtime);
}

async function loadDetail(link, params = {}) {
  const target = getText(link);
  const runtime = rememberRuntimeParams(Object.assign({}, getRuntimeParams(), params, target ? { link: target } : {}));

  if (target.indexOf("offline-submit://") === 0) {
    return handleOfflineSubmit(runtime, target);
  }

  if (target.indexOf("magnet-status://") === 0) {
    return buildOfflineReceipt(target, false, "JavBus磁力", "这是一条状态提示。请按提示配置 Cookie 或刷新详情页。");
  }

  const code = extractCodeFromParams(runtime);
  if (!code) {
    console.log(LOG_PREFIX, "loadDetail 未找到番号，无法构建 episodeItems");
    return buildMagnetDetailItem(runtime, "unknown", [
      buildStatusEpisodeItem(
        "unknown",
        "JavBus磁力｜未识别番号",
        "当前详情数据中没有可识别的番号，无法搜索 JavBus 磁力。"
      )
    ]);
  }

  const episodeItems = await loadMagnetLinks(runtime, { includeStatus: true });
  return buildMagnetDetailItem(runtime, code, episodeItems);
}
