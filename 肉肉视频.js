// @name rouvideotv
// @version 1.0.0
// @description 肉肉视频插件：使用 axios + cheerio 解析分类、列表、详情和播放地址

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const BASE_URL = "https://rou.video";

// 分类（固定写死）
async function home(params, context) {
  const cats = [
    { type_id: "/v?order=createdAt&page=1", type_name: "最新" },
    { type_id: "/t/OnlyFans?order=createdAt&page=1", type_name: "Only" },
    { type_id: "/t/自拍流出?order=createdAt&page=1", type_name: "自拍" },
    { type_id: "/t/國產AV?order=createdAt&page=1", type_name: "国产" },
    { type_id: "/t/探花?order=createdAt&page=1", type_name: "探花" },
    { type_id: "/t/抖陰?order=createdAt&page=1", type_name: "抖阴" },
    { type_id: "/t/韓國?order=createdAt&page=1", type_name: "韩国" },
    { type_id: "/t/日本?order=createdAt&page=1", type_name: "日本" }
  ];
  return { class: cats };
}

// 分类列表
async function category(params, context) {
  let cate = String(params.categoryId || "/v?order=createdAt&page=1");
  const page = Number(params.page || 1);

  if (page > 1) {
    if (cate.includes("page=")) {
      cate = cate.replace(/page=\d+/, `page=${page}`);
    } else {
      cate += `&page=${page}`;
    }
  }

  const url = `${BASE_URL}${cate}`;
  const resp = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
  const html = resp.data || "";
  const $ = cheerio.load(html);

  const items = [];
  $("div[data-slot='card']").each((i, el) => {
    const href = $(el).find("a").first().attr("href");
    if (!href) return;
    const title = $(el).find("h3").text().trim();
    const cover = $(el).find("img").last().attr("src") || "";
    const remark = $(el).find("span[data-slot='badge']").map((i, e) => $(e).text().trim()).get().join(" ");
    items.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_remarks: remark
    });
  });

  return { page, pagecount: 10, total: items.length, list: items };
}

// 详情
async function detail(params, context) {
  const id = String(params.videoId || "");
  if (!id) return { list: [] };

  const url = `${BASE_URL}${id}`;
  const resp = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
  const html = resp.data || "";
  const $ = cheerio.load(html);

  const title = $("h1").text().trim() || $("title").text().trim() || $("h3").first().text().trim();
  const cover = $("img").first().attr("src") || "";
  const desc = $("h3:contains('簡介')").next("p").text().trim() || "";
  const tags = $("div.hidden").text().trim();

  const episodes = [{ name: "播放", playId: url }];

  return {
    list: [{
      vod_id: url,
      vod_name: title,
      vod_pic: cover,
      vod_content: desc,
      vod_tag: tags,
      vod_play_sources: [{ name: "在线播放", episodes }]
    }]
  };
}

// 搜索
async function search(params, context) {
  const wd = String(params.keyword || "");
  const page = Number(params.page || 1);
  if (!wd) return { list: [] };

  const url = `${BASE_URL}/search?q=${encodeURIComponent(wd)}&page=${page}`;
  const resp = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
  const html = resp.data || "";
  const $ = cheerio.load(html);

  const items = [];
  $("div[data-slot='card']").each((i, el) => {
    const href = $(el).find("a").first().attr("href");
    if (!href) return;
    const title = $(el).find("h3").text().trim();
    const cover = $(el).find("img").last().attr("src") || "";
    const remark = $(el).find("span[data-slot='badge']").map((i, e) => $(e).text().trim()).get().join(" ");
    items.push({
      vod_id: href,
      vod_name: title,
      vod_pic: cover,
      vod_remarks: remark
    });
  });

  return { page, pagecount: 5, total: items.length, list: items };
}

// 播放（嗅探版）
async function play(params, context) {
  const playId = params.playId;
  if (!playId) throw new Error("playId 不能为空");

  // 请求头，带上 UA 和 Referer
  const headers = { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL };

  // 使用 OmniBox.sniffVideo 来嗅探真实地址
  const { url, header } = await OmniBox.sniffVideo(playId, headers);

  return {
    urls: [{ name: "播放", url }], // 嗅探到的真实播放地址
    flag: "play",
    header,   // 嗅探过程中捕获到的请求头
    parse: 0  // 表示已经拿到直链，不需要再解析
  };
}
