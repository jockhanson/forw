WidgetMetadata = {
  id: "forward.18av",
  title: "18AV",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "18AV 视频列表、搜索、详情与播放源模块",
  author: "Forward",
  site: "https://18av.mm-cg.com/",
  detailCacheDuration: 60,
  globalParams: [
    {
      name: "baseUrl",
      title: "站点地址",
      type: "input",
      value: "https://18av.mm-cg.com",
      placeholders: [{ title: "18AV", value: "https://18av.mm-cg.com" }],
    },
    {
      name: "userAgent",
      title: "User-Agent",
      type: "input",
      value: "",
      placeholders: [{ title: "留空使用默认浏览器 UA", value: "" }],
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
          value: "chinese",
          enumOptions: [
            { title: "中文字幕", value: "chinese" },
            { title: "有码", value: "censored" },
            { title: "无码", value: "uncensored" },
            { title: "无码破解", value: "reducing-mosaic" },
            { title: "素人", value: "amateurjav" },
            { title: "H动画", value: "animation" },
          ],
        },
        { name: "genreId", title: "分类ID", type: "constant", value: "" },
        { name: "peopleId", title: "演员ID", type: "constant", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "loadResource",
      title: "18AV 播放源",
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

const DEFAULT_BASE_URL = "https://18av.mm-cg.com";
const DEFAULT_LANG = "zh";
const VIDEO_PLAYER_TYPE = "ijk";
const RUNTIME_KEY = "18av.runtimeParams";

async function loadList(params = {}) {
  try {
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const routedUrl = params.peopleId || params.genreId;
    const url = routedUrl
      ? pagedAbsoluteUrl(routedUrl, page, runtimeParams.baseUrl)
      : categoryPageUrl(runtimeParams.baseUrl, params.category || "chinese", page);
    const html = await fetchPage(url, runtimeParams);
    return parseVideoList(html, runtimeParams.baseUrl);
  } catch (error) {
    console.error("[18av][loadList] 失败:", error.message || error);
    throw error;
  }
}

async function search(params = {}) {
  try {
    const keyword = String(params.keyword || "").trim();
    if (!keyword) return [];
    const runtimeParams = rememberRuntimeParams(params);
    const page = safePage(params.page);
    const url = `${runtimeParams.baseUrl}/${DEFAULT_LANG}/fc_search/all/${encodePathSegment(keyword)}/${page}.html`;
    const html = await fetchPage(url, runtimeParams);
    return parseVideoList(html, runtimeParams.baseUrl);
  } catch (error) {
    console.error("[18av][search] 失败:", error.message || error);
    throw error;
  }
}

async function loadDetail(link) {
  try {
    const runtimeParams = getRuntimeParams();
    const href = normalize18AvUrl(decodeDetailLink(link), runtimeParams.baseUrl);
    if (!href) return null;
    const baseUrl = getOrigin(href) || runtimeParams.baseUrl;
    const html = await fetchPage(href, runtimeParams);
    return await parseVideoDetail(html, href, baseUrl, runtimeParams);
  } catch (error) {
    console.error("[18av][loadDetail] 失败:", error.message || error);
    throw error;
  }
}

async function loadResource(params = {}) {
  try {
    const saved = getRuntimeParams();
    const runtimeParams = rememberRuntimeParams({
      baseUrl: params.baseUrl || saved.baseUrl,
      userAgent: params.userAgent || saved.userAgent,
    });
    const href = inferDetailHref(params, runtimeParams.baseUrl);
    if (!href) return [];
    const html = await fetchPage(href, runtimeParams);
    const sources = await collectPlayableSources(html, href, getOrigin(href) || runtimeParams.baseUrl, runtimeParams);
    return sources.map((source, index) => ({
      name: source.name || playbackName(source.url, index),
      description: source.source || "18AV",
      url: source.url,
      playerType: VIDEO_PLAYER_TYPE,
      customHeaders: mediaHeaders(runtimeParams, source.referer || href),
    }));
  } catch (error) {
    console.error("[18av][loadResource] 失败:", error.message || error);
    return [];
  }
}

async function fetchPage(url, params = {}, referer) {
  const res = await Widget.http.get(url, { headers: buildHeaders(params, referer) });
  const html = String((res && res.data) || "");
  if (!html) throw new Error("空响应: " + url);
  if (/not\s+support|access\s+denied|forbidden|blocked/i.test(html) && html.length < 5000) {
    throw new Error("目标站点拒绝访问或地区受限: " + url);
  }
  return html;
}

function parseVideoList(html, baseUrl) {
  const rows = splitVideoRows(html);
  const items = [];
  const seen = {};
  for (const row of rows) {
    const href = normalize18AvUrl(
      firstByRe(row, /<a\b[^>]*href=(["'])([^"']*_[a-z]*content\/[^"']+\.html)["'][^>]*>/i, 2) ||
      firstByRe(row, /<a\b[^>]*href=(["'])([^"']*_content\/[^"']+\.html)["'][^>]*>/i, 2),
      baseUrl
    );
    if (!href || seen[href] || isComicUrl(href)) continue;
    seen[href] = true;

    const title = cleanText(
      firstByRe(row, /<h3\b[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i) ||
      imgAttr(row, "alt") ||
      attr(row, "title")
    );
    if (!title) continue;

    const poster = absolutize(firstImage(row), baseUrl);
    const preview = absolutize(firstByRe(row, /<video\b[^>]*\bdata-src=(["'])(.*?)\1/i, 2), baseUrl);
    const releaseDate = cleanText(firstByRe(row, /<div\b[^>]*class=(["'])[^"']*\bmeta\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i, 2));

    items.push({
      id: stableId(href),
      type: "url",
      mediaType: "movie",
      title,
      posterPath: poster,
      backdropPath: poster,
      previewUrl: preview,
      releaseDate,
      link: encodeDetailLink(href),
      playerType: VIDEO_PLAYER_TYPE,
    });
  }
  return items;
}

async function parseVideoDetail(html, href, baseUrl, params = {}) {
  const title = cleanText(
    firstByRe(html, /<h1\b[^>]*>[\s\S]*?<b\b[^>]*>([\s\S]*?)<\/b>[\s\S]*?<\/h1>/i) ||
    firstByRe(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:title\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)
  );
  const poster = absolutize(
    firstByRe(html, /<div\b[^>]*id=(["'])player-wrap\1[^>]*>[\s\S]*?<img\b[^>]*src=(["'])(.*?)\2/i, 3) ||
    firstByRe(html, /<meta\b[^>]*property=(["'])og:image\1[^>]*content=(["'])(.*?)\2/i, 3) ||
    firstImage(html),
    baseUrl
  );
  const code = detailValue(html, ["ID", "番号", "識別碼", "识别码"]);
  const durationText = detailValue(html, ["Length", "片長", "时长", "長度"]);
  const director = detailLinkItems(html, ["_director/"])[0];
  const label = detailValue(html, ["Label", "レーベル", "厂牌", "發行商"]);
  const studio = detailValue(html, ["Studio", "メーカー", "片商", "工作室"]);
  const releaseDate = detailValue(html, ["網站發佈", "网站发布", "Release Date"]) ||
    firstByRe(html, /"uploadDate"\s*:\s*(["'])(.*?)\1/i, 2);
  const genreItems = parseTaxonomy(html, baseUrl, ["_category/"]);
  const peoples = parsePeople(html, baseUrl);
  const relatedItems = parseVideoList(html, baseUrl)
    .filter((item) => decodeDetailLink(item.link).split("#")[0] !== href.split("#")[0])
    .slice(0, 24);
  const backdropPaths = unique([poster].concat(extractBackdropImages(html, baseUrl))).filter(Boolean);
  const sources = await collectPlayableSources(html, href, baseUrl, params);
  const descriptionParts = [];
  if (code) descriptionParts.push("ID: " + code);
  if (durationText) descriptionParts.push("Length: " + durationText);
  if (director && director.title) descriptionParts.push("Director: " + director.title);
  if (label) descriptionParts.push("Label: " + label);
  if (studio) descriptionParts.push("Studio: " + studio);
  if (genreItems.length) descriptionParts.push("Genre: " + genreItems.map((item) => item.title).join(", "));

  return {
    id: stableId(href),
    type: "url",
    mediaType: "movie",
    title: title || code || stableId(href),
    posterPath: poster,
    backdropPath: poster,
    backdropPaths,
    releaseDate,
    description: descriptionParts.join("\n"),
    videoUrl: sources[0] ? sources[0].url : "",
    previewUrl: poster,
    durationText,
    link: encodeDetailLink(href),
    playerType: VIDEO_PLAYER_TYPE,
    customHeaders: mediaHeaders(params, sources[0] ? (sources[0].referer || href) : href),
    genreItems,
    peoples,
    relatedItems,
    trailers: sources[0] ? [{ coverUrl: poster, url: sources[0].url }] : [],
  };
}

async function collectPlayableSources(html, referer, baseUrl, params = {}) {
  const candidates = [];
  const direct = extractMediaCandidates(html, baseUrl, referer);
  for (const item of direct) candidates.push(item);

  const playerUrls = extractPlayerFrameUrls(html, baseUrl);
  for (const playerUrl of playerUrls) {
    try {
      const resolved = await resolvePlayerPage(playerUrl.url, params, referer, 0);
      for (const item of resolved) {
        candidates.push({
          url: item.url,
          source: playerUrl.name || item.source,
          name: playerUrl.name || item.name,
          referer: item.referer || playerUrl.url,
          score: numericScore(playerUrl.score) + numericScore(item.score),
        });
      }
    } catch (error) {
      console.log("[18av][stream] 播放源解析失败:", playerUrl.url, error.message || error);
    }
  }

  return uniqueCandidates(candidates)
    .filter((candidate) => isPlayableCandidate(candidate.url) && !isPreviewUrl(candidate.url))
    .sort((a, b) => candidateScore(b) - candidateScore(a));
}

async function resolvePlayerPage(url, params = {}, referer, depth) {
  if (!url || depth > 2) return [];
  const html = await fetchPage(url, params, referer);
  const candidates = extractMediaCandidates(html, url, url);
  const iframes = extractIframeUrls(html, url);
  for (const iframeUrl of iframes) {
    if (isPreviewUrl(iframeUrl)) continue;
    try {
      const nested = await resolvePlayerPage(iframeUrl, params, url, depth + 1);
      for (const item of nested) candidates.push(item);
    } catch (error) {
      console.log("[18av][stream] iframe 解析失败:", iframeUrl, error.message || error);
    }
  }
  return uniqueCandidates(candidates);
}

function extractPlayerFrameUrls(html, baseUrl) {
  const config = extractCipherConfig(html);
  const frames = [];
  const re = /mvarr\s*\[\s*(["'])([^"']+)\1\s*\]\s*=\s*\[\s*\[([\s\S]*?)\]\s*,?\s*\]\s*;/g;
  let match;
  while ((match = re.exec(html || ""))) {
    const values = quotedValues(match[3]);
    if (values.length < 5) continue;
    const encrypted = values[1] || "";
    const prefix = values[3] || "";
    const suffix = values[4] || "";
    const decrypted = decodePlayerToken(encrypted, config);
    if (!decrypted) continue;
    const url = absolutize(prefix + decrypted + suffix, baseUrl);
    if (!url) continue;
    const resolutionText = firstByRe(url, /[?&]numresolution=(\d+)/i);
    const resolution = Number(resolutionText);
    frames.push({
      name: resolution > 0 ? resolution + "P" : match[2],
      url,
      score: resolution > 0 ? resolution * 10000 : 0,
    });
  }
  return frames.sort((a, b) => numericScore(b.score) - numericScore(a.score));
}

function extractCipherConfig(html) {
  return {
    radix: numberVar(html, ["hcdeedg252", "hcdeedf252", "hadeedd252"], 17),
    xor: numberVar(html, ["hadeedg252", "hadeedf252", "hcdeedd252"], 30),
    key: stringVar(html, ["argdeqweqweqwe", "hdddedd252", "argdeqweqweqwz"], "1f17795b5936e9fd"),
    iv: stringVar(html, ["hdddedg252", "argdeqweqweqww", "hdddedf252"], "9b0ff9bef9feb8e9"),
  };
}

function decodePlayerToken(encrypted, config = {}) {
  const radix = Number(config.radix || 17);
  const xor = Number(config.xor || 30);
  const separator = String.fromCharCode(radix + 97);
  const parts = String(encrypted || "").split(separator);
  if (parts.length < 2) return "";
  let base64 = "";
  for (const part of parts) {
    const value = parseInt(part, radix);
    if (!Number.isFinite(value)) return "";
    base64 += String.fromCharCode((value ^ xor) & 255);
  }
  try {
    return bytesToUtf8(aesCbcDecrypt(base64ToBytes(base64), asciiBytes(config.key), asciiBytes(config.iv))).trim();
  } catch (error) {
    console.log("[18av][decode] 播放器 token 解密失败:", error.message || error);
    return "";
  }
}

function aesCbcDecrypt(cipherBytes, keyBytes, ivBytes) {
  if (!cipherBytes.length || cipherBytes.length % 16 !== 0) throw new Error("AES ciphertext length invalid");
  if (keyBytes.length !== 16 || ivBytes.length !== 16) throw new Error("AES key/iv length invalid");
  const roundKey = aesExpandKey(keyBytes);
  let previous = ivBytes.slice();
  const out = [];
  for (let offset = 0; offset < cipherBytes.length; offset += 16) {
    const block = cipherBytes.slice(offset, offset + 16);
    const decrypted = aesDecryptBlock(block, roundKey);
    for (let i = 0; i < 16; i++) out.push(decrypted[i] ^ previous[i]);
    previous = block;
  }
  const pad = out[out.length - 1];
  if (pad < 1 || pad > 16) throw new Error("AES padding invalid");
  for (let i = out.length - pad; i < out.length; i++) {
    if (out[i] !== pad) throw new Error("AES padding mismatch");
  }
  return out.slice(0, out.length - pad);
}

function aesDecryptBlock(input, roundKey) {
  const state = input.slice();
  aesAddRoundKey(state, roundKey, 10);
  for (let round = 9; round >= 1; round--) {
    aesInvShiftRows(state);
    aesInvSubBytes(state);
    aesAddRoundKey(state, roundKey, round);
    aesInvMixColumns(state);
  }
  aesInvShiftRows(state);
  aesInvSubBytes(state);
  aesAddRoundKey(state, roundKey, 0);
  return state;
}

function aesExpandKey(key) {
  const roundKey = key.slice();
  let bytesGenerated = 16;
  let rconIteration = 1;
  const temp = [0, 0, 0, 0];
  while (bytesGenerated < 176) {
    for (let i = 0; i < 4; i++) temp[i] = roundKey[bytesGenerated - 4 + i];
    if (bytesGenerated % 16 === 0) {
      const first = temp.shift();
      temp.push(first);
      for (let i = 0; i < 4; i++) temp[i] = AES_SBOX[temp[i]];
      temp[0] ^= AES_RCON[rconIteration++];
    }
    for (let i = 0; i < 4; i++) {
      roundKey[bytesGenerated] = roundKey[bytesGenerated - 16] ^ temp[i];
      bytesGenerated++;
    }
  }
  return roundKey;
}

function aesAddRoundKey(state, roundKey, round) {
  const start = round * 16;
  for (let i = 0; i < 16; i++) state[i] ^= roundKey[start + i];
}

function aesInvSubBytes(state) {
  for (let i = 0; i < 16; i++) state[i] = AES_INV_SBOX[state[i]];
}

function aesInvShiftRows(state) {
  let temp = state[13];
  state[13] = state[9];
  state[9] = state[5];
  state[5] = state[1];
  state[1] = temp;

  temp = state[2];
  state[2] = state[10];
  state[10] = temp;
  temp = state[6];
  state[6] = state[14];
  state[14] = temp;

  temp = state[3];
  state[3] = state[7];
  state[7] = state[11];
  state[11] = state[15];
  state[15] = temp;
}

function aesInvMixColumns(state) {
  for (let i = 0; i < 4; i++) {
    const offset = i * 4;
    const a0 = state[offset];
    const a1 = state[offset + 1];
    const a2 = state[offset + 2];
    const a3 = state[offset + 3];
    state[offset] = aesMul(a0, 14) ^ aesMul(a1, 11) ^ aesMul(a2, 13) ^ aesMul(a3, 9);
    state[offset + 1] = aesMul(a0, 9) ^ aesMul(a1, 14) ^ aesMul(a2, 11) ^ aesMul(a3, 13);
    state[offset + 2] = aesMul(a0, 13) ^ aesMul(a1, 9) ^ aesMul(a2, 14) ^ aesMul(a3, 11);
    state[offset + 3] = aesMul(a0, 11) ^ aesMul(a1, 13) ^ aesMul(a2, 9) ^ aesMul(a3, 14);
  }
}

function aesMul(a, b) {
  let result = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) result ^= a;
    const high = a & 128;
    a = (a << 1) & 255;
    if (high) a ^= 27;
    b >>= 1;
  }
  return result;
}

const AES_SBOX = [
  99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,
  202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,
  183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,
  4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,
  9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,
  83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,
  208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,
  81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,
  205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,
  96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,
  224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,
  231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,
  186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,
  112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,
  225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,
  140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22,
];

const AES_INV_SBOX = [
  82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,
  124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,
  84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,
  8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,
  114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,
  108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,
  144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,
  208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,
  58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,
  150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,
  71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,
  252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,
  31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,
  96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,
  160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,
  23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125,
];

const AES_RCON = [0,1,2,4,8,16,32,64,128,27,54];

function splitVideoRows(html) {
  const text = String(html || "");
  const starts = [];
  const re = /<div\b[^>]*class=(["'])[^"']*\bpost\b[^"']*\bvideo_9s\b[^"']*\1[^>]*>/gi;
  let match;
  while ((match = re.exec(text))) starts.push(match.index);
  const rows = [];
  for (let i = 0; i < starts.length; i++) {
    rows.push(text.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : text.length));
  }
  return rows;
}

function detailValue(html, labels) {
  for (const label of labels || []) {
    const re = new RegExp("<li\\b[^>]*class=([\"'])[^\"']*\\bposts-headline\\b[^\"']*\\1[^>]*>\\s*" + escapeRegExp(label) + "\\s*:?\\s*<\\/li>\\s*<li\\b[^>]*class=([\"'])[^\"']*\\bposts-message\\b[^\"']*\\2[^>]*>([\\s\\S]*?)<\\/li>", "i");
    const match = String(html || "").match(re);
    if (match) return cleanText(match[3]);
  }
  return "";
}

function detailLinkItems(html, prefixes) {
  return parseTaxonomy(html, DEFAULT_BASE_URL, prefixes);
}

function parseTaxonomy(html, baseUrl, prefixes) {
  const out = [];
  const seen = {};
  const anchorRe = /<a\b[^>]*href=(["'])([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html || ""))) {
    const href = normalize18AvUrl(match[2], baseUrl);
    if (!href || !prefixes.some((prefix) => href.includes(prefix))) continue;
    const title = cleanText(match[3]);
    if (!title || seen[href]) continue;
    seen[href] = true;
    out.push({ id: href, title });
  }
  return out;
}

function parsePeople(html, baseUrl) {
  const out = [];
  const seen = {};
  const blockRe = /<div\b[^>]*class=(["'])[^"']*\bactor-right-images-part\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/gi;
  let blockMatch;
  while ((blockMatch = blockRe.exec(html || ""))) {
    const block = blockMatch[2];
    const href = normalize18AvUrl(firstByRe(block, /<a\b[^>]*href=(["'])([^"']*_avperformer\/[^"']+)["']/i, 2), baseUrl);
    const title = cleanText(firstByRe(block, /<p\b[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/p>/i));
    if (!href || !title || seen[href]) continue;
    seen[href] = true;
    out.push({ id: href, title, avatar: absolutize(firstImage(block), baseUrl), role: "actor" });
  }
  const anchors = parseTaxonomy(html, baseUrl, ["_avperformer/"]);
  for (const item of anchors) {
    if (seen[item.id]) continue;
    seen[item.id] = true;
    out.push({ id: item.id, title: item.title, role: "actor" });
  }
  return out;
}

function extractBackdropImages(html, baseUrl) {
  const out = [];
  const blockRe = /<div\b[^>]*class=(["'])[^"']*\but1_img_content_smallcg\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/gi;
  let blockMatch;
  while ((blockMatch = blockRe.exec(html || ""))) {
    const img = absolutize(firstImage(blockMatch[2]), baseUrl);
    if (img && !/\/(?:adcg|A_PH)\//i.test(img)) out.push(img);
  }
  return out;
}

function extractMediaCandidates(html, baseUrl, referer) {
  const text = normalizeEscapedText(html);
  const candidates = [];
  collectMediaMatches(candidates, text, /<(?:source|video)\b[^>]*src=(["'])(.*?)\1/gi, baseUrl, "source", 2, referer);
  collectMediaMatches(candidates, text, /\b(?:file|src|url|source|hls|video|video_url|videoUrl)\s*[:=]\s*(["'])([^"']+)\1/gi, baseUrl, "script", 2, referer);
  collectMediaMatches(candidates, text, /(https?:\/\/[^"'<>\s\\]+\.(?:m3u8|mp4|webm)(?:\?[^"'<>\s\\]*)?)/gi, baseUrl, "url", 1, referer);
  collectMediaMatches(candidates, text, /(["'])((?:\/\/|\/)[^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)\1/gi, baseUrl, "relative", 2, referer);
  return uniqueCandidates(candidates).filter((candidate) => isPlayableCandidate(candidate.url) && !isPreviewUrl(candidate.url));
}

function extractIframeUrls(html, baseUrl) {
  const out = [];
  const patterns = [
    /<iframe\b[^>]*src=(["'])(.*?)\1/gi,
    /<iframe\b[^>]*data-src=(["'])(.*?)\1/gi,
    /<iframe\b[^>]*data-url=(["'])(.*?)\1/gi,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(html || ""))) {
      const url = absolutize(match[2], baseUrl);
      if (url && !isPreviewUrl(url)) out.push(url);
    }
  }
  return unique(out);
}

function collectMediaMatches(out, text, re, baseUrl, source, group, referer) {
  let match;
  while ((match = re.exec(text || ""))) collectMediaUrl(out, match[group], baseUrl, source, referer);
}

function collectMediaUrl(out, rawUrl, baseUrl, source, referer) {
  const url = absolutize(rawUrl, baseUrl);
  if (isPlayableCandidate(url) && !isPreviewUrl(url)) out.push({ url, source, referer });
}

function quotedValues(text) {
  const out = [];
  const re = /(["'])((?:\\\1|\\.|(?!\1)[\s\S])*)\1/g;
  let match;
  while ((match = re.exec(text || ""))) out.push(unescapeJsString(match[2]));
  return out;
}

function numberVar(html, names, fallback) {
  for (const name of names || []) {
    const re = new RegExp("\\b" + escapeRegExp(name) + "\\s*=\\s*(\\d+)", "i");
    const match = String(html || "").match(re);
    if (match) return Number(match[1]);
  }
  return fallback;
}

function stringVar(html, names, fallback) {
  for (const name of names || []) {
    const re = new RegExp("\\b(?:var\\s+)?" + escapeRegExp(name) + "\\s*=\\s*([\"'])(.*?)\\1", "i");
    const match = String(html || "").match(re);
    if (match) return decodeHtml(match[2]);
  }
  return fallback;
}

function asciiBytes(value) {
  const out = [];
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 255);
  return out;
}

function base64ToBytes(value) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let buffer = 0;
  let bits = 0;
  const out = [];
  const text = String(value || "").replace(/\s+/g, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === "=") break;
    const index = chars.indexOf(ch);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 255);
    }
  }
  return out;
}

function bytesToUtf8(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  try {
    let escaped = "";
    for (let i = 0; i < binary.length; i++) {
      const hex = binary.charCodeAt(i).toString(16);
      escaped += "%" + (hex.length === 1 ? "0" + hex : hex);
    }
    return decodeURIComponent(escaped);
  } catch (error) {
    return binary;
  }
}

function categoryPageUrl(baseUrl, category, page) {
  const name = String(category || "chinese").replace(/^\/+|\/+$/g, "");
  const listType = page <= 1 ? "random/all/index" : `list/all/${page}`;
  return `${normalizeBaseUrl(baseUrl)}/${DEFAULT_LANG}/${name}_${listType}.html`;
}

function pagedAbsoluteUrl(url, page, baseUrl) {
  const href = normalize18AvUrl(url, baseUrl);
  if (page <= 1) return href;
  if (/\/(?:index|\d+)\.html(?:[?#].*)?$/i.test(href)) {
    return href.replace(/\/(?:index|\d+)\.html([?#].*)?$/i, `/${page}.html$1`);
  }
  return href.replace(/\/?([?#].*)?$/, `/${page}.html$1`);
}

function inferDetailHref(params = {}, baseUrl) {
  return normalize18AvUrl(decodeDetailLink(params.link || params.detailLink || params.href || params.url || params.id || params.videoUrl), baseUrl);
}

function encodeDetailLink(href) {
  return href ? "detail:" + href : "";
}

function decodeDetailLink(link) {
  const value = String(link || "").trim();
  return value.startsWith("detail:") ? value.slice("detail:".length) : value;
}

function normalize18AvUrl(url, baseUrl) {
  return absolutize(url, normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL));
}

function absolutize(url, baseUrl) {
  let value = decodeHtml(String(url || "").trim()).replace(/&amp;/g, "&");
  if (!value || value === "about:blank" || value.startsWith("javascript:")) return "";
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

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function buildHeaders(params = {}, referer) {
  const userAgent = String(params.userAgent || "").trim() ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  return {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: referer || normalizeBaseUrl(params.baseUrl || DEFAULT_BASE_URL) + "/" + DEFAULT_LANG + "/",
  };
}

function mediaHeaders(params = {}, referer) {
  const headers = buildHeaders(params, referer);
  headers.Origin = getOrigin(referer || params.baseUrl || DEFAULT_BASE_URL);
  return headers;
}

function rememberRuntimeParams(params = {}) {
  const saved = getRuntimeParams();
  const next = {
    baseUrl: normalizeBaseUrl(params.baseUrl || saved.baseUrl || DEFAULT_BASE_URL),
    userAgent: String(params.userAgent || saved.userAgent || "").trim(),
  };
  Widget.storage.set(RUNTIME_KEY, next);
  return next;
}

function getRuntimeParams() {
  return Widget.storage.get(RUNTIME_KEY) || { baseUrl: DEFAULT_BASE_URL, userAgent: "" };
}

function firstByRe(value, re, group = 1) {
  const match = String(value || "").match(re);
  return match ? decodeHtml(match[group] || "") : "";
}

function attr(html, name) {
  const re = new RegExp("\\b" + escapeRegExp(name) + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function imgAttr(html, name) {
  const re = new RegExp("<img\\b[^>]*\\b" + escapeRegExp(name) + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = String(html || "").match(re);
  return match ? decodeHtml(match[2]) : "";
}

function firstImage(html) {
  return imgAttr(html, "data-src") ||
    imgAttr(html, "data-lazy-src") ||
    imgAttr(html, "data-original") ||
    imgAttr(html, "src");
}

function cleanText(value) {
  return decodeHtml(stripTags(value)).replace(/\s+/g, " ").trim();
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    hellip: "...",
    rarr: "->",
  };
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name] !== undefined ? named[name] : all);
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

function unescapeJsString(value) {
  return String(value || "")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\")
    .replace(/\\\//g, "/");
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value || "").trim()).replace(/%20/g, "%20");
}

function safePage(page) {
  const value = Number(page || 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function stableId(text) {
  return String(text || "").toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "18av-item";
}

function isComicUrl(url) {
  return /\/\/18h\.mm-cg\.com\//i.test(String(url || "")) || /\/(?:18H|doujin)_content\//i.test(String(url || ""));
}

function isPreviewUrl(url) {
  const value = String(url || "").toLowerCase();
  return /(?:preview|sample|trailer|teaser|promo|9smv_|\/pv\/)/i.test(value) ||
    /\.(?:jpg|jpeg|png|webp|gif)(?:[?#]|$)/i.test(value);
}

function isPlayableCandidate(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:")) return false;
  if (/\.(?:jpg|jpeg|png|webp|gif|svg|css|js|ico)(?:[?#]|$)/i.test(value)) return false;
  if (/\/(?:ads?|banner|analytics|captcha|cdn-cgi)\b/i.test(value)) return false;
  return /\.(?:m3u8|mp4|webm)(?:[?#]|$)/i.test(value) ||
    /\/(?:get_file|dl|download|stream|video|media|hls|playlist|master|player|embed|source|file)(?:[\/?#]|$)/i.test(value);
}

function uniqueCandidates(candidates) {
  const seen = {};
  const out = [];
  for (const candidate of candidates || []) {
    const url = String((candidate && candidate.url) || "").split("#")[0];
    if (!url) continue;
    const score = numericScore(candidate && candidate.score);
    if (seen[url]) {
      if (score > seen[url].score) {
        seen[url].score = score;
        seen[url].source = candidate.source || seen[url].source;
        seen[url].name = candidate.name || seen[url].name;
        seen[url].referer = candidate.referer || seen[url].referer;
      } else if (!seen[url].referer && candidate.referer) {
        seen[url].referer = candidate.referer;
      }
      continue;
    }
    const record = {
      url,
      source: candidate.source || "18AV",
      name: candidate.name || "",
      referer: candidate.referer || "",
      score,
    };
    seen[url] = record;
    out.push(record);
  }
  return out;
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

function mediaScore(url) {
  const value = String(url || "");
  let score = 0;
  if (/\.m3u8(?:[?#]|$)/i.test(value)) score += 5000000;
  if (/\.mp4(?:[?#]|$)/i.test(value)) score += 500000;
  score += resolutionScore(value) * 1000;
  if (/preview|sample|trailer|teaser|promo/i.test(value)) score -= 10000000;
  return score;
}

function candidateScore(candidate) {
  return mediaScore(candidate && candidate.url) + numericScore(candidate && candidate.score);
}

function numericScore(value) {
  const score = Number(value || 0);
  return Number.isFinite(score) ? score : 0;
}

function resolutionScore(value) {
  const text = String(value || "");
  const fromName = Number(firstByRe(text, /(?:^|[^\d])([1-9]\d{2,3})p(?:[^\d]|$)/i));
  if (Number.isFinite(fromName) && fromName > 0) return fromName;
  const fromResolution = Number(firstByRe(text, /[?&]numresolution=(\d+)/i));
  return Number.isFinite(fromResolution) ? fromResolution : 0;
}

function playbackName(url, index) {
  const res = resolutionScore(url);
  if (res) return `${res}P 正片`;
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return index === 0 ? "HLS 正片" : `HLS 备用 ${index + 1}`;
  if (/\.mp4(?:[?#]|$)/i.test(url)) return index === 0 ? "MP4 正片" : `MP4 备用 ${index + 1}`;
  return index === 0 ? "在线播放" : `播放源 ${index + 1}`;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
