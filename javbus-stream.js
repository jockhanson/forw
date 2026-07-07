WidgetMetadata = {
  id: "javbus.stream",
  title: "JavBus Magnet",
  description: "通过番号匹配 JavBus 磁力资源，作为独立磁力链接区块展示",
  author: "EL",
  site: "https://www.javbus.com",
  version: "1.2.0",
  requiredVersion: "0.0.1",
  globalParams: [
    {
      name: "cookie",
      title: "JavBus Cookie",
      type: "input",
      description: "在浏览器通过 JavBus 年龄验证后，复制整段 Cookie 填入（含名）。"
    }
  ],
  modules: [
    {
      id: "loadMagnetLinks",
      title: "磁力链接",
      description: "根据当前视频信息匹配 JavBus 磁力链接，点击提交到 115 离线下载",
      functionName: "loadMagnetLinks",
      cacheDuration: 120,
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
  const items = [];
  const pan115Candidates = [];

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
      const title = (tags.join("") + code + (size ? " " + size : "")).trim();
      const offlineLink = buildPan115OfflineLink(code, candidateId, magnet, title, size);

      pan115Candidates.push({
        title: title,
        maglink: magnet,
        size: size || "",
        sizeBytes: parseSizeBytes(size),
        infoHash: candidateId,
        source: "javbus",
        tags: pan115Tags
      });

      items.push({
        id: "javbus-magnet:" + normalizePan115DvdId(code) + ":" + candidateId,
        type: "url",
        title: title,
        name: title,
        description:
          "来源：JavBus\n" +
          "类型：Magnet\n" +
          "番号：" + (code || "未知") + "\n" +
          "大小：" + (size || "未知") + "\n" +
          "日期：" + (date || "未知") + "\n" +
          "字幕：" + (hasSubtitle ? "是" : "未知") + "\n" +
          "高清：" + (hasHd ? "是" : "未知") + "\n" +
          "详情页：" + detailUrl + "\n" +
          "操作：点击提交到 115 离线下载",
        link: offlineLink,
        magnetUrl: magnet
      });
    }
  }

  storePan115MagnetCandidates(code, pan115Candidates);
  return items;
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

async function loadMagnetLinks(params = {}) {
  try {
    const cookie = normalizeCookie(params.cookie);
    if (!cookie) {
      console.warn(LOG_PREFIX, "未配置 JavBus Cookie，无法通过年龄验证，跳过匹配");
      return [];
    }

    const code = extractCodeFromParams(params);
    if (!code) {
      console.log(LOG_PREFIX, "当前视频信息中未找到番号，跳过 JavBus 匹配");
      return [];
    }

    console.log(LOG_PREFIX, "提取到番号:", code);

    const found = await findDetailByCode(code, params);
    if (found.blocked) return [];
    if (!found.detail) {
      console.log(LOG_PREFIX, "未找到 JavBus 精确匹配:", code);
      return [];
    }

    const magnets = await fetchMagnets(found.detail, params);
    console.log(LOG_PREFIX, "磁力资源数量:", magnets.length);
    return magnets;
  } catch (error) {
    console.error(LOG_PREFIX, "loadResource 失败:", error.message || error);
    return [];
  }
}

async function loadResource(params = {}) {
  const link = getText(params.link);
  if (link.indexOf("offline-submit://") === 0) {
    console.log(LOG_PREFIX, "检测到离线提交路由，等待 pan115 处理:", link.slice(0, 120));
    return [];
  }

  return loadMagnetLinks(params);
}
