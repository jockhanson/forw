WidgetMetadata = {
    id: "MissAV_Module",
    title: "MissAV",
    author: "自制",
    description: "MissAV 模块",
    version: "2.9.33",
    requiredVersion: "0.0.1",
    site: "https://missav.ai",
    detailCacheDuration: 600,
    modules: [
        {
            id: "loadRecentUpdates",
            title: "最近更新",
            functionName: "loadRecentUpdates",
            cacheDuration: 3600,
            params: [
                { name: "page", title: "页码", type: "page", value: "1" }
            ]
        },
        {
            id: "loadList",
            title: "MissAV",
            functionName: "loadList",
            cacheDuration: 3600,
            params: [
                { name: "primary_category", title: "分类", type: "enumeration", value: "dm278/cn/chinese-subtitle", enumOptions: getPrimaryCategoryOptions() },
                { name: "endpoint", title: "素人", type: "enumeration", value: "dm36/cn/siro", belongTo: { paramName: "primary_category", value: ["amateur"] }, enumOptions: filterCategoryOptions("amateur") },
                { name: "endpoint", title: "无码影片", type: "enumeration", value: "dm814/cn/uncensored-leak", belongTo: { paramName: "primary_category", value: ["uncensored"] }, enumOptions: filterCategoryOptions("uncensored") },
                { name: "endpoint", title: "亚洲AV", type: "enumeration", value: "dm63/cn/madou", belongTo: { paramName: "primary_category", value: ["asia"] }, enumOptions: filterCategoryOptions("asia") },
                { name: "endpoint", title: "女优", type: "enumeration", value: "dm179/cn/actresses/%E7%80%AC%E6%88%B8%E7%92%B0%E5%A5%88", belongTo: { paramName: "primary_category", value: ["actress"] }, enumOptions: filterCategoryOptions("actress") },
                { name: "endpoint", title: "类型", type: "enumeration", value: "dm96/cn/genres/%E9%AB%98%E6%B8%85", belongTo: { paramName: "primary_category", value: ["genre"] }, enumOptions: filterCategoryOptions("genre") },
                { name: "endpoint", title: "发行商", type: "enumeration", value: "dm825/cn/makers/Moody%27s", belongTo: { paramName: "primary_category", value: ["maker"] }, enumOptions: filterCategoryOptions("maker") },
                { name: "filters", title: "中文字幕筛选", type: "enumeration", value: "", belongTo: { paramName: "primary_category", value: ["dm278/cn/chinese-subtitle"] }, enumOptions: [
                    { title: "所有", value: "" },
                    { title: "单人作品", value: "individual" },
                    { title: "多人作品", value: "multiple" },
                    { title: "中文字幕", value: "chinese-subtitle" }
                ] },
                { name: "sort_by", title: "排序", type: "enumeration", value: "released_at", belongTo: { paramName: "primary_category", value: getDirectListEndpoints() }, enumOptions: getSortOptions() },
                { name: "sort_by", title: "排序", type: "enumeration", value: "released_at", belongTo: { paramName: "primary_category", value: getSortableCategoryGroups() }, enumOptions: getSortOptions() },
                { name: "keyword", title: "关键词", type: "input", value: "", belongTo: { paramName: "primary_category", value: ["search"] } },
                { name: "page", title: "页码", type: "page", value: "1" }
            ]
        },
        {
            id: "loadResource",
            title: "MissAV资源模块",
            description: "按番号在 MissAV 匹配中文字幕和 1080P 播放源",
            functionName: "loadResource",
            type: "stream",
            params: []
        }
    ],
    search: {
        title: "🌐 全局搜索",
        functionName: "searchGlobal",
        params: [
            { name: "keyword", title: "关键词", type: "input", description: "搜索的关键词", value: "" },
            { name: "page", title: "页码", type: "page", value: "1" }
        ]
    }
};

const BASE_URL = "https://missav.ai";
const AVATAR_BASE_URL = "https://missav.live";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://missav.ai/",
    "Connection": "keep-alive"
};

const MISSAV_RESOURCE_SEARCH_TIMEOUT_MS = 3000;
const MISSAV_RESOURCE_DETAIL_TIMEOUT_MS = 3000;
const JAVTRAILERS_SEARCH_TIMEOUT_MS = 2500;
const JAVTRAILERS_DETAIL_TIMEOUT_MS = 2500;
const HIGH_QUALITY_BACKDROP_TIMEOUT_MS = 1500;
const MISSAV_STREAM_VERIFY_TIMEOUT_MS = 2000;

function getActressEndpoints() {
    if (getActressEndpoints.cache) return getActressEndpoints.cache;
    getActressEndpoints.cache = [
    { title: "瀬户环奈", value: "dm179/cn/actresses/%E7%80%AC%E6%88%B8%E7%92%B0%E5%A5%88" },
    { title: "逢泽みゆ", value: "dm179/cn/actresses/%E9%80%A2%E6%B2%A2%E3%81%BF%E3%82%86" },
    { title: "河北彩花", value: "dm179/cn/actresses/%E6%B2%B3%E5%8C%97%E5%BD%A9%E8%8A%B1" },
    { title: "松本一香", value: "dm179/cn/actresses/%E6%9D%BE%E6%9C%AC%E4%B8%80%E9%A6%99" },
    { title: "美园和花", value: "dm179/cn/actresses/%E7%BE%8E%E5%9B%AD%E5%92%8C%E8%8A%B1" },
    { title: "北冈果林", value: "dm179/cn/actresses/%E5%8C%97%E5%B2%A1%E6%9E%9C%E6%9E%97" },
    { title: "柏木こなつ", value: "dm179/cn/actresses/%E6%9F%8F%E6%9C%A8%E3%81%93%E3%81%AA%E3%81%A4" },
    { title: "浅野こころ", value: "dm179/cn/actresses/%E6%B5%85%E9%87%8E%E3%81%93%E3%81%93%E3%82%8D" },
    { title: "北野未奈", value: "dm179/cn/actresses/%E5%8C%97%E9%87%8E%E6%9C%AA%E5%A5%88" },
    { title: "清原みゆう", value: "dm179/cn/actresses/%E6%B8%85%E5%8E%9F%E3%81%BF%E3%82%86%E3%81%86" },
    { title: "沙月惠奈", value: "dm179/cn/actresses/%E6%B2%99%E6%9C%88%E6%83%A0%E5%A5%88" },
    { title: "miru", value: "dm179/cn/actresses/miru" },
    { title: "七森莉莉", value: "dm179/cn/actresses/%E4%B8%83%E6%A3%AE%E8%8E%89%E8%8E%89" },
    { title: "七濑爱丽丝", value: "dm179/cn/actresses/%E4%B8%83%E6%BF%91%E7%88%B1%E4%B8%BD%E4%B8%9D" },
    { title: "鹫尾芽衣", value: "dm179/cn/actresses/%E9%B9%AB%E5%B0%BE%E8%8A%BD%E8%A1%A3" },
    { title: "博多彩叶", value: "dm179/cn/actresses/%E5%8D%9A%E5%A4%9A%E5%BD%A9%E5%8F%B6" },
    { title: "石川澪", value: "dm179/cn/actresses/%E7%9F%B3%E5%B7%9D%E6%BE%AA" },
    { title: "白上咲花", value: "dm179/cn/actresses/%E7%99%BD%E4%B8%8A%E5%92%B2%E8%8A%B1" },
    { title: "田野忧", value: "dm179/cn/actresses/%E7%94%B0%E9%87%8E%E5%BF%A7" },
    { title: "未步なな", value: "dm179/cn/actresses/%E6%9C%AA%E6%AD%A5%E3%81%AA%E3%81%AA" },
    { title: "村上悠华", value: "dm179/cn/actresses/%E6%9D%91%E4%B8%8A%E6%82%A0%E5%8D%8E" },
    { title: "三田真铃", value: "dm179/cn/actresses/%E4%B8%89%E7%94%B0%E7%9C%9F%E9%93%83" },
    { title: "八挂うみ", value: "dm179/cn/actresses/%E5%85%AB%E6%8E%9B%E3%81%86%E3%81%BF" },
    { title: "初美なのか", value: "dm179/cn/actresses/%E5%88%9D%E7%BE%8E%E3%81%AA%E3%81%AE%E3%81%8B" },
    { title: "宫下玲奈", value: "dm179/cn/actresses/%E5%AE%AE%E4%B8%8B%E7%8E%B2%E5%A5%88" },
    { title: "新有菜", value: "dm58/cn/actresses/%E6%A9%8B%E6%9C%AC%E6%9C%89%E8%8F%9C%20%28%E6%96%B0%E6%9C%89%E8%8F%9C%29" },
    { title: "新木希空", value: "dm179/cn/actresses/%E6%96%B0%E6%9C%A8%E5%B8%8C%E7%A9%BA" },
    { title: "明里つむぎ", value: "dm179/cn/actresses/%E6%98%8E%E9%87%8C%E3%81%A4%E3%82%80%E3%81%8E" },
    { title: "小野六花", value: "dm179/cn/actresses/%E5%B0%8F%E9%87%8E%E5%85%AD%E8%8A%B1" },
    { title: "宇都宫紫苑", value: "dm179/cn/actresses/%E5%AE%87%E9%83%BD%E5%AE%AE%E7%B4%AB%E8%8B%91" },
    { title: "小宵こなん", value: "dm179/cn/actresses/%E5%B0%8F%E5%AE%B5%E3%81%93%E3%81%AA%E3%82%93" },
    { title: "本庄鈴", value: "dm179/cn/actresses/%E6%9C%AC%E5%BA%84%E9%88%B4" },
    { title: "桃乃木かな", value: "dm179/cn/actresses/%E6%A1%83%E4%B9%83%E6%9C%A8%E3%81%8B%E3%81%AA" },
    { title: "桜空もも", value: "dm179/cn/actresses/%E6%A1%9C%E7%A9%BA%E3%82%82%E3%82%82" },
    { title: "楓ふうあ", value: "dm179/cn/actresses/%E6%A1%AB%E3%81%B5%E3%81%86%E3%81%82" },
    { title: "楓カレン", value: "dm179/cn/actresses/%E6%A5%93%E3%82%AB%E3%83%AC%E3%83%B3" },
    { title: "涼森れむ", value: "dm179/cn/actresses/%E6%B6%BC%E6%A3%AE%E3%82%8C%E3%82%80" },
    { title: "瀧本雫葉", value: "dm179/cn/actresses/%E7%80%A7%E6%9C%AC%E9%9B%AB%E8%91%89" },
    { title: "田中レモン", value: "dm179/cn/actresses/%E7%94%B0%E4%B8%AD%E3%83%AC%E3%83%A2%E3%83%B3" },
    { title: "相沢みなみ", value: "dm179/cn/actresses/%E7%9B%B8%E6%B2%A2%E3%81%BF%E3%81%AA%E3%81%BF" },
    { title: "神木麗", value: "dm179/cn/actresses/%E7%A5%9E%E6%9C%A8%E9%BA%97" },
    { title: "美ノ嶋めぐり", value: "dm179/cn/actresses/%E7%BE%8E%E3%83%8E%E5%B6%8B%E3%82%81%E3%81%90%E3%82%8A" },
    { title: "野々浦暖", value: "dm179/cn/actresses/%E9%87%8E%E3%80%85%E6%B5%A6%E6%9A%96" },
    { title: "青空ひかり", value: "dm179/cn/actresses/%E9%9D%92%E7%A9%BA%E3%81%B2%E3%81%8B%E3%82%8A" },
    { title: "三上悠亚", value: "dm179/cn/actresses/%E4%B8%89%E4%B8%8A%E6%82%A0%E4%BA%9A" },
    { title: "榊原萌", value: "dm179/cn/actresses/%E6%A6%8A%E5%8E%9F%E8%90%8C" },
    { title: "彩月七绪", value: "dm179/cn/actresses/%E5%BD%A9%E6%9C%88%E4%B8%83%E7%BB%AA" },
    { title: "神宫寺奈绪", value: "dm179/cn/actresses/%E7%A5%9E%E5%AE%AB%E5%AF%BA%E5%A5%88%E7%BB%AA" },
    { title: "有村のぞみ", value: "dm179/cn/actresses/%E6%9C%89%E6%9D%91%E3%81%AE%E3%81%9E%E3%81%BF" }
    ];
    return getActressEndpoints.cache;
}

function getGenreEndpoints() {
    return [
    { title: "高清", value: "dm96/cn/genres/%E9%AB%98%E6%B8%85" },
    { title: "独家", value: "dm139/cn/genres/%E7%8B%AC%E5%AE%B6" },
    { title: "中出", value: "dm130/cn/genres/%E4%B8%AD%E5%87%BA" },
    { title: "单体作品", value: "dm122/cn/genres/%E5%8D%95%E4%BD%93%E4%BD%9C%E5%93%81" },
    { title: "巨乳", value: "dm120/cn/genres/%E5%B7%A8%E4%B9%B3" },
    { title: "人妻", value: "dm77/cn/genres/%E4%BA%BA%E5%A6%BB" },
    { title: "熟女", value: "dm118/cn/genres/%E7%86%9F%E5%A5%B3" },
    { title: "素人", value: "dm123/cn/genres/%E7%B4%A0%E4%BA%BA" },
    { title: "美少女", value: "dm437/cn/genres/%E7%BE%8E%E5%B0%91%E5%A5%B3" },
    { title: "口交", value: "dm1301/cn/genres/%E5%8F%A3%E4%BA%A4" },
    { title: "多人运动", value: "dm321/cn/genres/%E5%A4%9A%E4%BA%BA%E8%BF%90%E5%8A%A8" },
    { title: "薄格", value: "dm76/cn/genres/%E8%96%84%E6%A0%BC" },
    { title: "骑乘", value: "dm486/cn/genres/%E9%AA%91%E4%B9%98" },
    { title: "痴女", value: "dm313/cn/genres/%E7%97%B4%E5%A5%B3" },
    { title: "4小时以上", value: "dm738/cn/genres/4%E5%B0%8F%E6%97%B6%E4%BB%A5%E4%B8%8A" },
    { title: "女高中生", value: "dm4448/cn/genres/%E5%A5%B3%E9%AB%98%E4%B8%AD%E7%94%9F" },
    { title: "潮吹", value: "dm161/cn/genres/%E6%BD%AE%E5%90%B9" },
    { title: "苗条", value: "dm757/cn/genres/%E8%8B%97%E6%9D%A1" },
    { title: "自拍", value: "dm978/cn/genres/%E8%87%AA%E6%8B%8D" },
    { title: "合集", value: "dm784/cn/genres/%E5%90%88%E9%9B%86" },
    { title: "乳交", value: "dm594/cn/genres/%E4%B9%B3%E4%BA%A4" },
    { title: "恋物癖", value: "dm117/cn/genres/%E6%81%8B%E7%89%A9%E7%99%96" },
    { title: "美乳", value: "dm215/cn/genres/%E7%BE%8E%E4%B9%B3" },
    { title: "NTR", value: "dm736/cn/genres/NTR" },
    { title: "企划", value: "dm341/cn/genres/%E4%BC%81%E5%88%92" },
    { title: "乱伦", value: "dm56/cn/genres/%E4%B9%B1%E4%BC%A6" },
    { title: "搭讪", value: "dm292/cn/genres/%E6%90%AD%E8%AE%AA" },
    { title: "颜射", value: "dm319/cn/genres/%E9%A2%9C%E5%B0%84" },
    { title: "淫乱", value: "dm903/cn/genres/%E6%B7%AB%E4%B9%B1" },
    { title: "偷拍", value: "dm516/cn/genres/%E5%81%B7%E6%8B%8D" },
    { title: "剧情", value: "dm98/cn/genres/%E5%89%A7%E6%83%85" },
    { title: "自慰", value: "dm7606/cn/genres/%E8%87%AA%E6%85%B0" },
    { title: "4K", value: "dm55/cn/genres/4K" },
    { title: "手淫", value: "dm94/cn/genres/%E6%89%8B%E6%B7%AB" },
    { title: "姐姐", value: "dm793/cn/genres/%E5%A7%90%E5%A7%90" },
    { title: "羞辱", value: "dm161/cn/genres/%E7%BE%9E%E8%BE%B1" }
    ];
}

function getMakerEndpoints() {
    return [
    { title: "Moody's", value: "dm825/cn/makers/Moody%27s" },
    { title: "Prestige", value: "dm825/cn/makers/Prestige" },
    { title: "Madonna", value: "dm825/cn/makers/Madonna" },
    { title: "S1", value: "dm825/cn/makers/S1" },
    { title: "SOD", value: "dm825/cn/makers/SOD" },
    { title: "IdeaPocket", value: "dm825/cn/makers/IdeaPocket" },
    { title: "Attackers", value: "dm825/cn/makers/Attackers" },
    { title: "Glory Quest", value: "dm825/cn/makers/Glory%20Quest" },
    { title: "ビッグモーカル", value: "dm825/cn/makers/%E3%83%93%E3%83%83%E3%82%B0%E3%83%A2%E3%83%BC%E3%82%AB%E3%83%AB" },
    { title: "NATURAL HIGH", value: "dm825/cn/makers/NATURAL%20HIGH" },
    { title: "Wanz Factory", value: "dm825/cn/makers/Wanz%20Factory" },
    { title: "Takara Visual", value: "dm825/cn/makers/Takara%20Visual" },
    { title: "Fc2", value: "dm825/cn/makers/Fc2" },
    { title: "Premium", value: "dm825/cn/makers/Premium" },
    { title: "Fitch", value: "dm825/cn/makers/Fitch" },
    { title: "VENUS", value: "dm825/cn/makers/VENUS" },
    { title: "DEEP'S", value: "dm825/cn/makers/DEEP%27S" },
    { title: "本中", value: "dm825/cn/makers/%E6%9C%AC%E4%B8%AD" },
    { title: "Hunter", value: "dm825/cn/makers/Hunter" },
    { title: "溜池ゴロー", value: "dm825/cn/makers/%E6%BA%9C%E6%B1%A0%E3%82%B4%E3%83%AD%E3%83%BC" },
    { title: "TMA", value: "dm825/cn/makers/TMA" },
    { title: "センタービレッジ", value: "dm825/cn/makers/%E3%82%BB%E3%83%B3%E3%82%BF%E3%83%BC%E3%83%93%E3%83%AC%E3%83%83%E3%82%B8" },
    { title: "Das", value: "dm825/cn/makers/Das" },
    { title: "Waap Entertainment", value: "dm825/cn/makers/Waap%20Entertainment" },
    { title: "Crystal-Eizou", value: "dm825/cn/makers/Crystal-Eizou" },
    { title: "kawaii", value: "dm825/cn/makers/kawaii" },
    { title: "ゴーゴーズ", value: "dm825/cn/makers/%E3%82%B4%E3%83%BC%E3%82%B4%E3%83%BC%E3%82%BA" },
    { title: "プラネットプラス", value: "dm825/cn/makers/%E3%83%97%E3%83%A9%E3%83%8D%E3%83%83%E3%83%88%E3%83%97%E3%83%A9%E3%82%B9" },
    { title: "OPPAI", value: "dm825/cn/makers/OPPAI" },
    { title: "STAR PARADISE", value: "dm825/cn/makers/STAR%20PARADISE" },
    { title: "E-BODY", value: "dm825/cn/makers/E-BODY" },
    { title: "セレブの友", value: "dm825/cn/makers/%E3%82%BB%E3%83%AC%E3%83%96%E3%81%AE%E5%8F%8B" },
    { title: "ドグマ", value: "dm825/cn/makers/%E3%83%89%E3%82%B0%E3%83%9E" },
    { title: "Alice Japan", value: "dm825/cn/makers/Alice%20Japan" },
    { title: "KM Produce", value: "dm825/cn/makers/KM%20Produce" },
    { title: "桃太郎映像出版", value: "dm825/cn/makers/%E6%A1%83%E5%A4%AA%E9%83%8E%E6%98%A0%E5%83%8F%E5%87%BA%E7%89%88" }
    ];
}

function getSortOptions() {
    return [
    { title: "发行日期", value: "released_at" },
    { title: "最近更新", value: "published_at" },
    { title: "收藏数", value: "saved" },
    { title: "今日浏览数", value: "today_views" },
    { title: "本周浏览数", value: "weekly_views" },
    { title: "本月浏览数", value: "monthly_views" },
    { title: "总浏览数", value: "views" }
    ];
}

function getPrimaryCategoryOptions() {
    return [
    { title: "中文字幕", value: "dm278/cn/chinese-subtitle" },
    { title: "日本AV", value: "dm632/cn/release" },
    { title: "素人", value: "amateur" },
    { title: "无码影片", value: "uncensored" },
    { title: "亚洲AV", value: "asia" },
    { title: "女优", value: "actress" },
    { title: "类型", value: "genre" },
    { title: "发行商", value: "maker" },
    { title: "🔍 搜索视频", value: "search" }
    ];
}

function getCategoryOptions() {
    if (getCategoryOptions.cache) return getCategoryOptions.cache;
    const ACTRESS_ENDPOINTS = getActressEndpoints();
    const GENRES_ENDPOINTS = getGenreEndpoints();
    const MAKERS_ENDPOINTS = getMakerEndpoints();
    getCategoryOptions.cache = [
    { title: "SIRO", value: "dm36/cn/siro", group: "amateur" },
    { title: "LUXU", value: "dm34/cn/luxu", group: "amateur" },
    { title: "GANA", value: "dm32/cn/gana", group: "amateur" },
    { title: "PRESTIGE PREMIUM", value: "dm999/cn/maan", group: "amateur" },
    { title: "S-CUTE", value: "dm38/cn/scute", group: "amateur" },
    { title: "ARA", value: "dm34/cn/ara", group: "amateur" },
    { title: "无码流出", value: "dm814/cn/uncensored-leak", group: "uncensored" },
    { title: "东京热", value: "dm42/cn/tokyohot", group: "uncensored" },
    { title: "麻豆传媒", value: "dm63/cn/madou", group: "asia" },
    { title: "TWAV", value: "dm31/cn/twav", group: "asia" },
    { title: "Furuke", value: "dm15/cn/furuke", group: "asia" },
    { title: "韩国直播", value: "cn/klive", group: "asia" },
    { title: "中国直播", value: "cn/clive", group: "asia" },
    ...ACTRESS_ENDPOINTS.map((item) => ({ title: item.title, value: item.value, group: "actress" })),
    ...GENRES_ENDPOINTS.map((item) => ({ title: item.title, value: item.value, group: "genre" })),
    ...MAKERS_ENDPOINTS.map((item) => ({ title: item.title, value: item.value, group: "maker" }))
    ];
    return getCategoryOptions.cache;
}

function filterCategoryOptions(group) {
    return getCategoryOptions()
        .filter((item) => item.group === group)
        .map(({ title, value }) => ({ title, value }));
}

function getDirectListEndpoints() {
    return ["dm278/cn/chinese-subtitle", "dm632/cn/release"];
}

function getSortableCategoryGroups() {
    return ["amateur", "uncensored", "asia", "actress", "genre", "maker"];
}

const MISSAV_CATEGORY_OPTIONS = getCategoryOptions();
const MISSAV_DIRECT_LIST_ENDPOINTS = getDirectListEndpoints();

const PEOPLE_AVATAR_CACHE = {};
const IMAGE_AVAILABILITY_CACHE = {};
const MISSAV_STREAM_RESOURCE_CACHE = {};
const RECENT_UPDATES_CATEGORY = "recent_updates";
const RECENT_UPDATES_ENDPOINT = "dm539/cn/new";

function isRecentUpdatesCategory(primaryCategory) {
    return primaryCategory === RECENT_UPDATES_CATEGORY || primaryCategory === RECENT_UPDATES_ENDPOINT;
}

function resolveEndpointByPrimaryCategory(primaryCategory, endpoint) {
    if (isRecentUpdatesCategory(primaryCategory)) return RECENT_UPDATES_ENDPOINT;
    if (MISSAV_DIRECT_LIST_ENDPOINTS.includes(primaryCategory)) return primaryCategory;

    const options = MISSAV_CATEGORY_OPTIONS.filter((item) => item.group === primaryCategory);
    if (!options.length) return endpoint || primaryCategory || RECENT_UPDATES_ENDPOINT;
    if (options.some((item) => item.value === endpoint)) return endpoint;
    return options[0].value;
}

function buildListUrl(endpoint, page = 1, filters = "", sort = "") {
    const params = [];
    if (filters) params.push(`filters=${encodeURIComponent(filters)}`);
    if (sort) params.push(`sort=${encodeURIComponent(sort)}`);
    if (page > 1) params.push(`page=${page}`);
    return `${BASE_URL}/${endpoint}${params.length ? `?${params.join("&")}` : ""}`;
}

function buildEmptyListMessage(title, descriptionText = "") {
    const messageId = `message:${encodeURIComponent(title)}`;
    return [{
        id: messageId,
        type: "url",
        title,
        description: descriptionText,
        link: messageId
    }];
}

function extractPeopleParamValue(value, allowNameFallback = false) {
    if (!value) return "";

    if (typeof value === "string" || typeof value === "number") {
        const text = String(value).trim();
        if (!text) return "";
        if (looksLikePeopleId(text)) return text;
        if (allowNameFallback && !extractSearchCode(text, { allowPureNumeric: true })) return `actress:${text}`;
        return "";
    }

    if (typeof value !== "object") return "";

    const idKeys = ["id", "peopleId", "actorId", "actressId", "personId", "value", "link", "href", "url"];
    for (const key of idKeys) {
        const matched = extractPeopleParamValue(value[key], false);
        if (matched) return matched;
    }

    if (allowNameFallback) {
        const nameKeys = ["title", "name"];
        for (const key of nameKeys) {
            const matched = extractPeopleParamValue(value[key], true);
            if (matched) return matched;
        }
    }

    return "";
}

function getPeopleIdFromParams(params = {}) {
    const aliases = ["peopleId", "actorId", "actressId", "personId", "people_id", "actor_id", "actress_id", "person_id"];
    for (const key of aliases) {
        const matched = extractPeopleParamValue(params[key], true);
        if (matched) return matched;
    }

    const objectAliases = ["people", "actor", "actress", "person", "cast", "team", "peopleItem", "actorItem", "actressItem"];
    for (const key of objectAliases) {
        const matched = extractPeopleParamValue(params[key], true);
        if (matched) return matched;
    }

    const genericId = params.id || params.value || "";
    if (looksLikePeopleId(genericId)) return genericId;

    return "";
}

function getGenreIdFromParams(params = {}) {
    return params.genreId || "";
}

function extractVideoId(href) {
    const slug = href.split('/').pop() || "";
    return slug
        .replace(/-chinese-subtitle$/i, "")
        .replace(/-uncensored-leak$/i, "")
        .toUpperCase();
}

function getText(value) {
    return String(value || "").trim();
}

function extractSearchCode(text, options = {}) {
    const allowPureNumeric = options.allowPureNumeric !== false;
    const normalized = getText(text).toUpperCase()
        .replace(/\./g, " ")
        .replace(/_/g, "-")
        .replace(/\s+/g, " ")
        .trim();
    if (!normalized) return "";

    const patterns = [
        /\bFC2(?:[- ]?PPV)?[- ]?\d{5,8}\b/,
        /\bCARIB[- ]?\d{6,8}\b/,
        /\b1PONDO[- ]?\d{6,8}\b/,
        /\bHEYZO[- ]?\d{3,6}\b/,
        /\bT28[- ]?\d{6,8}\b/,
        /\b(?:S2M|MIAA|SSNI|SNIS|IPX|IPZZ|SSIS|JUQ|MIDE|MIDV|STARS|ABW|RKI|DVAJ|WANZ|LULU|DLDSS|VRTM|SDMU|SDDE|MKMP|HMN|MUDR|ADN|CAWD|PPPE|PRED|MGR|SHKD|MXGS|FSDSS|JUL|KTB|MIAB|GVH|MIMK|JUY|JUTA|IDBD|HND|DASD|CLO|BF|HONB|ROE|CEMD|MIUM|NITR|RCTD|RCT|IPVR|MIBD|JUR|JURD|SOE|ORE|PYO|START|NSFS|JUFE|KDMN)\s*[-_ ]?\d{2,6}[A-Z]?(?:[-_ ]?[A-Z]{0,4})?\b/,
        /\b[A-Z]{2,10}\s*[-_ ]?\d{2,8}[A-Z]?\b/
    ];
    if (allowPureNumeric) patterns.push(/\b\d{6,8}\b/);

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match && match[0]) {
            return match[0].replace(/\s+/g, "").replace(/_/g, "-").replace(/-+/g, "-").toUpperCase();
        }
    }
    return "";
}

function collectStringValues(value, depth = 0, out = [], visited = []) {
    if (value === null || value === undefined || depth > 5) return out;
    const valueType = typeof value;
    if (valueType === "string" || valueType === "number") {
        const text = String(value).trim();
        if (text) out.push(text);
        return out;
    }
    if (valueType !== "object" || visited.indexOf(value) >= 0) return out;
    visited.push(value);
    if (Array.isArray(value)) {
        value.forEach((item) => collectStringValues(item, depth + 1, out, visited));
        return out;
    }
    Object.keys(value).forEach((key) => collectStringValues(value[key], depth + 1, out, visited));
    return out;
}

function extractCodeFromParams(params = {}) {
    const priorityCandidates = [
        params.code, params.videoId, params.number, params.fileName, params.filename, params.file_name,
        params.name, params.path, params.filePath, params.file_path, params.id, params.title, params.seriesName
    ];
    if (params.tmdbInfo) priorityCandidates.push(params.tmdbInfo.title, params.tmdbInfo.name, params.tmdbInfo.originalTitle);
    if (params.mediaSource) priorityCandidates.push(params.mediaSource.name, params.mediaSource.fileName, params.mediaSource.path);

    for (const value of priorityCandidates) {
        const code = extractSearchCode(value, { allowPureNumeric: true });
        if (code) return code;
    }

    const allStrings = collectStringValues(params);
    for (const value of allStrings) {
        const code = extractSearchCode(value, { allowPureNumeric: false });
        if (code) return code;
    }

    return "";
}

function normalizeCode(value) {
    return getText(value).toUpperCase().replace(/[\s_\-]+/g, "");
}

function isChineseSubtitleLink(link) {
    return /chinese-subtitle/i.test(link || "");
}

function detectChineseSubtitle(html = "") {
    if (!html) return false;
    const keywordMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    if (keywordMatch && keywordMatch[1]) {
        const firstKeyword = keywordMatch[1].split(/[,，]/)[0].trim();
        if (firstKeyword === "中文字幕") return true;
    }

    const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descriptionMatch && descriptionMatch[1] && descriptionMatch[1].includes("中文字幕")) return true;

    const lowerHtml = html.toLowerCase();
    return lowerHtml.includes("chinese-subtitle") || lowerHtml.includes("chinese subtitle");
}

function extractMissavVideoUrl(html = "") {
    let videoUrl = "";
    const $ = Widget.html.load(html);

    $("script").each((i, el) => {
        const scriptContent = $(el).html() || "";

        if (scriptContent.includes("surrit.com") && scriptContent.includes(".m3u8")) {
            const matches = scriptContent.match(/https:\/\/surrit\.com\/[a-f0-9\-]+\/[^"'\s]*\.m3u8/g);
            if (matches && matches.length > 0) {
                videoUrl = matches[0];
                return false;
            }
        }

        if (!videoUrl && scriptContent.includes("eval(function")) {
            const uuidMatches = scriptContent.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g);
            if (uuidMatches && uuidMatches.length > 0) {
                videoUrl = `https://surrit.com/${uuidMatches[0]}/playlist.m3u8`;
                return false;
            }
        }
    });

    if (!videoUrl) {
        const simpleMatch = html.match(/source\s*=\s*['"]([^'"]+)['"]/);
        if (simpleMatch) videoUrl = simpleMatch[1];
    }

    return videoUrl;
}

function isMissavDetailPage($) {
    return $("#videodetails").length > 0 || $('meta[property="og:type"]').attr("content") === "video.movie";
}

function findMatchingDetailLinks(html, code, searchUrl) {
    const $ = Widget.html.load(html);
    if (isMissavDetailPage($)) {
        return [$('meta[property="og:url"]').attr("content") || searchUrl];
    }

    const targetCode = normalizeCode(code);
    const exactMatches = [];

    $("div.group").each((i, el) => {
        const $el = $(el);
        const href = $el.find("a.text-secondary").attr("href") || "";
        if (!href) return;
        const videoId = extractVideoId(href);
        if (normalizeCode(videoId) === targetCode) exactMatches.push(resolveUrl(href));
    });

    const seen = [];
    const chineseMatches = exactMatches.filter(isChineseSubtitleLink);
    chineseMatches.concat(exactMatches).forEach((link) => {
        if (link && seen.indexOf(link) < 0) seen.push(link);
    });
    return seen;
}

function appendDerivedNonSubtitleLinks(links) {
    const results = links.slice();
    links.forEach((link) => {
        if (!isChineseSubtitleLink(link)) return;
        [
            link.replace(/-chinese-subtitle(?=\/?$|\?)/i, ""),
            link.replace(/-uncensored-leak-chinese-subtitle(?=\/?$|\?)/i, ""),
            link.replace(/-chinese-subtitle(?=\/?$|\?)/i, "").replace(/-uncensored-leak(?=\/?$|\?)/i, "")
        ].forEach((derivedLink) => {
            if (derivedLink && derivedLink !== link && results.indexOf(derivedLink) < 0) results.push(derivedLink);
        });
    });
    return results;
}

function buildForced1080pUrl(videoUrl) {
    if (!/playlist\.m3u8(?:\?|$)/i.test(videoUrl || "")) return "";
    return videoUrl.replace(/playlist\.m3u8(?=\?|$)/i, "1080p/video.m3u8");
}

function isM3u8Response(response) {
    if (!response) return false;
    const statusCode = Number(response.status || response.statusCode || response.code || 200);
    if (statusCode >= 400) return false;

    const contentType = getResponseHeader(response, "content-type").toLowerCase();
    if (contentType && /mpegurl|m3u8|application\/vnd\.apple\.mpegurl/i.test(contentType)) return true;

    const data = typeof response.data === "string" ? response.data : "";
    return data.trim().startsWith("#EXTM3U");
}

function m3u8Contains1080p(response) {
    const data = typeof response.data === "string" ? response.data : "";
    return /1920x1080|(?:^|[^\d])1080p?(?:[^\d]|$)/i.test(data);
}

async function getPlayableM3u8Response(url) {
    if (!url) return null;

    try {
        const response = await Widget.http.get(url, {
            headers: {
                "Referer": "https://missav.ai/",
                "User-Agent": HEADERS["User-Agent"],
                "Origin": "https://missav.ai"
            },
            timeout: MISSAV_STREAM_VERIFY_TIMEOUT_MS
        });
        return isM3u8Response(response) ? response : null;
    } catch (e) {
        return null;
    }
}

async function resolvePreferred1080pUrl(videoUrl) {
    if (!/\.m3u8(?:\?|$)/i.test(videoUrl || "")) {
        return isLikely1080pUrl(videoUrl) ? videoUrl : "";
    }

    const forced1080pUrl = buildForced1080pUrl(videoUrl);
    if (forced1080pUrl) {
        const forcedResponse = await getPlayableM3u8Response(forced1080pUrl);
        if (forcedResponse) return forced1080pUrl;
    }

    const masterResponse = await getPlayableM3u8Response(videoUrl);
    return masterResponse && m3u8Contains1080p(masterResponse) ? videoUrl : "";
}

function resolveUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveDetailLink(href) {
    return resolveUrl(href);
}

function resolveAvatarPageUrl(peopleId) {
    if (!peopleId) return "";
    const normalized = normalizePeopleId(peopleId);
    if (!normalized || !normalized.includes("/actresses/")) return "";
    return `${AVATAR_BASE_URL}/${normalized}`;
}

function resolveAvatarImageUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${AVATAR_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizePeopleId(value) {
    if (!value) return "";
    let id = String(value).trim();
    id = id.replace(BASE_URL, "").replace(/^https?:\/\/[^/]+\//, "");
    id = id.replace(/^\/+/, "").split("?")[0].replace(/\/$/, "");
    return id;
}

function looksLikePeopleId(value) {
    const id = normalizePeopleId(value);
    return id.startsWith("actress:") || id.includes("/actresses/");
}

function encodeActressSlug(value) {
    if (!value) return "";
    try {
        return encodeURIComponent(decodeURIComponent(value));
    } catch (e) {
        return encodeURIComponent(value);
    }
}

function resolvePeopleEndpoint(value) {
    const rawPeopleId = normalizePeopleId(value);
    if (!rawPeopleId) return "";
    if (rawPeopleId.startsWith("actress:")) {
        const slug = rawPeopleId.replace(/^actress:/, "");
        return slug.includes("/actresses/") ? normalizePeopleId(slug) : `cn/actresses/${encodeActressSlug(slug)}`;
    }
    if (rawPeopleId.startsWith("actresses/")) return `cn/${rawPeopleId}`;
    if (/^dm\d+\/actresses\//i.test(rawPeopleId)) {
        return rawPeopleId.replace(/^(dm\d+)\/actresses\//i, "$1/cn/actresses/");
    }
    if (rawPeopleId.includes("/actresses/")) return rawPeopleId;
    if (!rawPeopleId.includes("/")) return `cn/actresses/${encodeActressSlug(rawPeopleId)}`;
    return "";
}

function buildPeopleItem(name, avatar, href) {
    const title = (name || "").replace(/\s+/g, " ").trim();
    if (!title) return null;
    const peopleId = normalizePeopleId(href) || `cn/actresses/${encodeURIComponent(title)}`;
    const avatarUrl = avatar && !isInvalidAvatarUrl(avatar) ? resolveAvatarImageUrl(avatar) : "";
    return {
        id: peopleId,
        title,
        avatar: avatarUrl,
        role: "主演"
    };
}

function normalizeGenreId(value) {
    if (!value) return "";
    let id = String(value).trim();
    id = id.replace(BASE_URL, "").replace(/^https?:\/\/[^/]+\//, "");
    id = id.replace(/^\/+/, "").split("?")[0].replace(/\/$/, "");
    return id;
}

function buildGenreItem(name, href) {
    const title = (name || "").replace(/\s+/g, " ").trim();
    const genreId = normalizeGenreId(href);
    if (!title || !genreId || !genreId.includes("/genres/")) return null;
    return { id: genreId, title };
}

function normalizePeopleTitle(title) {
    return (title || "").replace(/\s+/g, "").toLowerCase();
}

function normalizeDetailLabel(label) {
    return (label || "").replace(/\s+/g, "").replace(/：/g, ":").toLowerCase();
}

function isActressLabel(label) {
    return ["女优:", "女優:", "actress:", "actresses:"].includes(label);
}

function isGenreLabel(label) {
    return ["类型:", "類型:", "分类:", "分類:", "genre:", "genres:", "category:", "categories:"].includes(label);
}

function getImageFromElement($, $el) {
    return $el.find("img").attr("data-src") ||
        $el.find("img").attr("src") ||
        "";
}

function isInvalidAvatarUrl(url) {
    if (!url) return true;
    return /fourhoi\.com\/[^/]+\/(cover|preview|thumbnail)[^/]*\.(jpg|jpeg|png|webp)(?:\?.*)?$/i.test(url);
}

function getExplicitActressAvatar($) {
    const selectors = [
        '.avatar img',
        '[class*="avatar"] img',
        '.rounded-full img',
        '[class*="rounded-full"] img',
        'img[alt*="女优"]',
        'img[alt*="女優"]',
        'img[alt*="Actress"]',
        'img[alt*="actress"]',
        'img.avatar',
        'img.rounded-full',
        'img[class*="rounded-full"]'
    ];

    for (const selector of selectors) {
        const $img = $(selector).first();
        const avatar = $img.attr("data-src") || $img.attr("src") || "";
        if (!isInvalidAvatarUrl(avatar)) return avatar;
    }

    return "";
}

async function resolvePeopleAvatar(peopleId) {
    if (!peopleId || !peopleId.includes("/actresses/")) return "";
    if (Object.prototype.hasOwnProperty.call(PEOPLE_AVATAR_CACHE, peopleId)) return PEOPLE_AVATAR_CACHE[peopleId];

    try {
        const avatarPageUrl = resolveAvatarPageUrl(peopleId);
        if (!avatarPageUrl) return "";
        const res = await Widget.http.get(avatarPageUrl, { headers: HEADERS });
        if (!res.data || res.data.includes("Just a moment")) {
            return "";
        }
        const $ = Widget.html.load(res.data);
        const canonical = $('link[rel="canonical"]').attr("href") || $('meta[property="og:url"]').attr("content") || "";
        if (!canonical.includes("/actresses/")) {
            PEOPLE_AVATAR_CACHE[peopleId] = "";
            return "";
        }
        const avatar = getExplicitActressAvatar($);
        if (!avatar) {
            PEOPLE_AVATAR_CACHE[peopleId] = "";
            return "";
        }
        PEOPLE_AVATAR_CACHE[peopleId] = resolveAvatarImageUrl(avatar);
        return PEOPLE_AVATAR_CACHE[peopleId];
    } catch (e) {
        return "";
    }
}

const JAVTRAILERS_BASE_URL = "https://javtrailers.com";
const JAVTRAILERS_HEADERS = {
    "User-Agent": HEADERS["User-Agent"],
    "Accept": HEADERS["Accept"],
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://javtrailers.com/",
    "Connection": "keep-alive"
};

function resolveJavTrailersUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${JAVTRAILERS_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function cleanDvdId(raw) {
    return getText(raw)
        .replace(/-UNCENSORED-LEAK$/i, "")
        .replace(/-CHINESE-SUBTITLE$/i, "")
        .replace(/_UNCENSORED_LEAK$/i, "")
        .replace(/_CHINESE_SUBTITLE$/i, "")
        .replace(/\s+/g, "")
        .trim();
}

function normalizeDvdIdForSearch(dvdId) {
    const clean = cleanDvdId(dvdId).toUpperCase();
    const match = clean.match(/^([A-Z]+)[-_ ]*0*(\d+)$/);
    if (match) return `${match[1].toLowerCase()}-${parseInt(match[2], 10)}`;
    return clean.replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase();
}

function parseJavCodeParts(dvdId) {
    const clean = cleanDvdId(dvdId).toUpperCase();
    const delimitedMatch = clean.match(/^([A-Z0-9]+)[-_ ]+0*(\d{2,6})$/);
    const compactMatch = clean.match(/^([A-Z]+)0*(\d{2,6})$/);
    const match = delimitedMatch || compactMatch;
    if (!match) return null;

    const prefix = match[1];
    const number = String(parseInt(match[2], 10));
    if (!prefix || !number || number === "NaN") return null;

    const numericContentPrefixMap = { WSA: "2" };
    const prefixLower = prefix.toLowerCase();
    const number3 = number.padStart(3, "0");
    const number5 = number.padStart(5, "0");
    const numericContentPrefix = numericContentPrefixMap[prefix] || "";

    return {
        prefix,
        prefixLower,
        number,
        number3,
        number5,
        code: `${numericContentPrefix}${prefixLower}${number5}`
    };
}

function normalizeDvdIdForCompare(dvdId) {
    const clean = cleanDvdId(dvdId).toUpperCase();
    const match = clean.match(/([A-Z]+)[-_ ]*0*(\d+)/);
    if (match) return `${match[1]}${parseInt(match[2], 10)}`;
    return clean.replace(/[^A-Z0-9]/g, "");
}

function extractCompareIdsFromText(text) {
    const raw = String(text || "");
    const ids = [];
    const seen = new Set();
    const patterns = [
        /([a-z]{2,12})[-_\s/]*0*(\d{2,6})/gi,
        /(\d+)([a-z]{2,12})0*(\d{2,6})/gi
    ];

    patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(raw)) !== null) {
            const prefix = match.length === 3 ? match[1] : match[2];
            const number = match.length === 3 ? match[2] : match[3];
            if (!prefix || !number) continue;
            const id = `${prefix.toUpperCase()}${parseInt(number, 10)}`;
            if (!seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        }
    });

    return ids;
}

function imageUrlMatchesDvd(url, dvdId, contentId) {
    const target = normalizeDvdIdForCompare(dvdId);
    const contentCompare = normalizeDvdIdForCompare(contentId);
    const candidates = extractCompareIdsFromText(url);
    if (!target && !contentCompare) return true;

    return candidates.some((candidate) => (
        candidate === target ||
        candidate === contentCompare ||
        (target && (target.includes(candidate) || candidate.includes(target))) ||
        (contentCompare && (contentCompare.includes(candidate) || candidate.includes(contentCompare)))
    ));
}

function normalizeImageUrl(url) {
    if (!url) return "";
    let clean = String(url)
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&")
        .replace(/\\u002F/g, "/")
        .trim();
    if (!clean || clean.startsWith("data:")) return "";
    if (clean.startsWith("//")) clean = `https:${clean}`;
    return resolveJavTrailersUrl(clean);
}

function isPlaceholderGalleryImage(url) {
    return /now[-_ ]?printing|no[-_ ]?(image|photo|picture)|placeholder|notfound/i.test(String(url || ""));
}

function sortGalleryUrls(urls) {
    return urls.sort((a, b) => {
        const getIndex = (url) => {
            const patterns = [
                /jp-(\d+)\./i,
                /cap_e_(\d+)_/i,
                /cap_e_(\d+)\./i,
                /cap_(\d+)_/i,
                /-(\d+)\.(?:jpg|jpeg|webp|png)/i
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) return parseInt(match[1], 10);
            }
            return 9999;
        };
        return getIndex(a) - getIndex(b);
    });
}

function extractGalleryImagesFromSwiper($, dvdId, contentId) {
    const urls = [];
    const seen = new Set();
    const pushUrl = (url) => {
        const clean = normalizeImageUrl(url);
        if (!clean || isPlaceholderGalleryImage(clean) || seen.has(clean) || !imageUrlMatchesDvd(clean, dvdId, contentId)) return;
        seen.add(clean);
        urls.push(clean);
    };

    $(".swiper-wrapper .swiper-slide.image-container img, .swiper-wrapper .swiper-slide img").each((_, el) => {
        const $img = $(el);
        pushUrl($img.attr("src") || "");
        pushUrl($img.attr("data-src") || "");
        pushUrl($img.attr("data-original") || "");
        pushUrl($img.attr("data-lazy") || "");
    });

    return sortGalleryUrls(urls);
}

function extractGalleryImagesFromRawHtml(html, dvdId, contentId) {
    const normalized = String(html || "")
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&")
        .replace(/\\u002F/g, "/");
    const urls = [];
    const seen = new Set();
    const pushUrl = (url) => {
        const clean = normalizeImageUrl(url);
        if (!clean || isPlaceholderGalleryImage(clean) || seen.has(clean) || !imageUrlMatchesDvd(clean, dvdId, contentId)) return;
        seen.add(clean);
        urls.push(clean);
    };
    const patterns = [
        /https?:\/\/pics\.dmm\.co\.jp\/digital\/video\/[^"'\\\s<>]+?\/[^"'\\\s<>]+?jp-\d+\.(?:jpg|jpeg|webp|png)/gi,
        /https?:\/\/image\.mgstage\.com\/images\/[^"'\\\s<>]+?\/cap_e_\d+_[^"'\\\s<>]+?\.(?:jpg|jpeg|webp|png)/gi,
        /https?:\/\/image\.mgstage\.com\/images\/[^"'\\\s<>]+?\/pf_o\d+_[^"'\\\s<>]+?\.(?:jpg|jpeg|webp|png)/gi,
        /src=["']([^"']*cap_e_\d+_[^"']+\.(?:jpg|jpeg|webp|png))["']/gi,
        /src=["']([^"']*pf_o\d+_[^"']+\.(?:jpg|jpeg|webp|png))["']/gi,
        /src=["']([^"']*jp-\d+\.(?:jpg|jpeg|webp|png))["']/gi
    ];

    patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(normalized)) !== null) {
            pushUrl(match[1] || match[0]);
        }
    });

    return sortGalleryUrls(urls);
}

function buildDmmGallery(contentId, count = 10) {
    const id = String(contentId || "").toLowerCase().trim();
    if (!id) return [];
    const results = [];
    for (let i = 1; i <= count; i++) {
        results.push(`https://pics.dmm.co.jp/digital/video/${id}/${id}jp-${i}.jpg`);
    }
    return results.filter((url) => !isPlaceholderGalleryImage(url));
}

function buildHighQualityBackdropUrl(dvdId) {
    const parts = parseJavCodeParts(dvdId);
    if (!parts) return "";

    const mgstageCoverPrefixes = new Set(["ABF", "ABW", "IPX", "JUFE", "MEYD", "SSNI", "STARS", "PPPD", "WANZ", "EBOD", "JUL", "SHKD", "MIDE", "S1", "SQTE", "SNOS", "OFJE"]);
    if (mgstageCoverPrefixes.has(parts.prefix)) {
        return `https://image.mgstage.com/images/prestige/${parts.prefixLower}/${parts.number3}/pb_e_${parts.prefixLower}-${parts.number3}.jpg`;
    }

    return `https://pics.dmm.co.jp/digital/video/${parts.code}/${parts.code}pl.jpg`;
}

function resolveMissavImageUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("//")) return `https:${path}`;
    return resolveUrl(path);
}

function buildDetailHeroImageUrl($) {
    const sitePoster = $('meta[property="og:image"]').attr("content") || $("video").attr("poster") || "";
    return sitePoster ? resolveMissavImageUrl(sitePoster) : "";
}

function buildDetailBackdropCandidates(dvdId) {
    return [
        buildHighQualityBackdropUrl(dvdId)
    ];
}

function getResponseHeader(response, name) {
    const headers = (response && response.headers) || {};
    const target = String(name || "").toLowerCase();
    const key = Object.keys(headers).find((item) => item.toLowerCase() === target);
    return key ? String(headers[key] || "") : "";
}

function hasImageSignature(data) {
    if (!data) return false;

    if (typeof data === "string") {
        const head = data.slice(0, 16);
        return head.startsWith("\xFF\xD8") ||
            head.startsWith("\x89PNG") ||
            head.startsWith("GIF8") ||
            head.startsWith("RIFF");
    }

    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    if (!bytes || typeof bytes.length !== "number" || bytes.length < 4) return false;
    return (bytes[0] === 0xFF && bytes[1] === 0xD8) ||
        (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) ||
        (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) ||
        (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46);
}

function isValidImageResponse(response) {
    if (!response) return false;

    const statusCode = Number(response.status || response.statusCode || response.code || 200);
    if (statusCode >= 400) return false;

    const contentType = getResponseHeader(response, "content-type").toLowerCase();
    if (contentType && !contentType.includes("image/")) return false;
    if (contentType.includes("image/")) return true;

    const data = response.data;
    if (hasImageSignature(data)) return true;
    if (typeof data !== "string") return false;

    const text = data.slice(0, 512).trim().toLowerCase();
    if (!text) return false;
    if (/^(<!doctype|<html|<head|<body)/i.test(text)) return false;
    if (/just a moment|cloudflare|not found|forbidden|access denied|now[-_ ]?printing|placeholder/i.test(text)) return false;

    return /[\x00-\x08\x0E-\x1F\x7F-\x9F]/.test(data.slice(0, 64));
}

async function filterAvailableImageUrls(urls = []) {
    const results = [];

    for (const url of urls) {
        const clean = normalizeImageUrl(url);
        if (!clean || isPlaceholderGalleryImage(clean)) continue;

        if (!Object.prototype.hasOwnProperty.call(IMAGE_AVAILABILITY_CACHE, clean)) {
            IMAGE_AVAILABILITY_CACHE[clean] = (async () => {
                try {
                    const response = await Widget.http.get(clean, {
                        headers: {
                            "User-Agent": HEADERS["User-Agent"],
                            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
                        },
                        timeout: HIGH_QUALITY_BACKDROP_TIMEOUT_MS
                    });
                    return isValidImageResponse(response) ? clean : "";
                } catch (e) {
                    return "";
                }
            })();
        }

        const availableUrl = await IMAGE_AVAILABILITY_CACHE[clean];
        if (availableUrl) {
            results.push(availableUrl);
        } else {
            delete IMAGE_AVAILABILITY_CACHE[clean];
        }
    }

    return results;
}

function mergeBackdropPaths(primaryUrls = [], paths = []) {
    const results = [];
    const seen = new Set();
    const getDedupeKey = (url) => {
        const clean = String(url || "").toLowerCase().split("?")[0];
        const isCoverLike = /\/cover|cover-t|pb_e_|pf_o|pl\.(?:jpg|jpeg|webp|png)$/i.test(clean);
        if (isCoverLike) {
            const ids = extractCompareIdsFromText(clean);
            if (ids.length) return `cover:${ids[0]}`;
        }
        const fourhoiMatch = clean.match(/fourhoi\.com\/([^/]+)\//i);
        if (fourhoiMatch && fourhoiMatch[1]) return `cover:${fourhoiMatch[1]}`;
        const missavMatch = clean.match(/\/([a-z0-9]+-\d{2,6}(?:-[a-z-]+)?)\/cover/i);
        if (missavMatch && missavMatch[1]) return `missav:${missavMatch[1]}`;
        const dmmMatch = clean.match(/\/digital\/video\/([^/]+)\//i);
        if (dmmMatch && dmmMatch[1] && /pl\.(?:jpg|jpeg|webp|png)$/i.test(clean)) return `cover:${dmmMatch[1]}`;
        const mgstageMatch = clean.match(/\/([^/]+)\/(?:pb_e_|pf_o|cover)/i);
        if (mgstageMatch && mgstageMatch[1]) return `cover:${mgstageMatch[1]}`;
        return clean;
    };
    const pushUrl = (url) => {
        const clean = normalizeImageUrl(url);
        const key = getDedupeKey(clean);
        if (!clean || isPlaceholderGalleryImage(clean) || seen.has(key)) return;
        seen.add(key);
        results.push(clean);
    };

    (Array.isArray(primaryUrls) ? primaryUrls : [primaryUrls]).forEach(pushUrl);
    (paths || []).forEach(pushUrl);
    return results;
}

function isDmmSourceHtml(html) {
    const raw = String(html || "").toLowerCase();
    return raw.includes("pics.dmm.co.jp") || raw.includes("al.fanza.co.jp") || raw.includes("fanza");
}

function isLikelyDmmContentId(contentId) {
    return /^(?:\d+)?[a-z]+0\d{4,5}$/i.test(String(contentId || "").toLowerCase().trim());
}

function isMgstageSourceHtml(html) {
    const raw = String(html || "").toLowerCase();
    return raw.includes("image.mgstage.com") || raw.includes("mgstage.nihonjav.com") || raw.includes("mgstage");
}

function extractJavTrailersContentId($, html, detailUrl) {
    const urlMatch = String(detailUrl || "").match(/\/video\/([a-z0-9_]+)/i);
    if (urlMatch && urlMatch[1]) return urlMatch[1].toLowerCase();
    const bodyText = $("body").text().replace(/\s+/g, " ");
    const contentIdMatch = bodyText.match(/Content\s*ID\s*:?\s*([a-z0-9_]+)/i);
    if (contentIdMatch && contentIdMatch[1]) return contentIdMatch[1].toLowerCase();
    const imageMatch = String(html || "").match(/pics\.dmm\.co\.jp\/digital\/video\/([a-z0-9_]+)\//i);
    return imageMatch && imageMatch[1] ? imageMatch[1].toLowerCase() : "";
}

function extractJavTrailersGallery(html, contentId, dvdId) {
    const $ = Widget.html.load(html);
    const swiperImages = extractGalleryImagesFromSwiper($, dvdId, contentId);
    if (swiperImages.length) return swiperImages;

    const rawImages = extractGalleryImagesFromRawHtml(html, dvdId, contentId);
    const isMgstage = isMgstageSourceHtml(html);
    if (isMgstage) return [];
    if (rawImages.length) return rawImages;

    const finalId = String(contentId || "").toLowerCase().trim();
    if (isDmmSourceHtml(html) && isLikelyDmmContentId(finalId)) return buildDmmGallery(finalId, 10);
    return [];
}

function scoreJavTrailersSearchResult($, $a, targetCompareId) {
    const href = resolveJavTrailersUrl($a.attr("href") || "");
    const text = `${$a.text()} ${$a.closest("div,li,article,section").text()} ${href.split("/").filter(Boolean).pop() || ""}`;
    const candidates = extractCompareIdsFromText(`${text} ${href}`);
    const score = candidates.reduce((best, candidate) => {
        if (candidate === targetCompareId) return Math.max(best, 100);
        if (candidate.includes(targetCompareId) || targetCompareId.includes(candidate)) return Math.max(best, 60);
        return best;
    }, href.includes("/video/") ? 10 : 0);
    return { href, score };
}

async function findJavTrailersDetailUrl(dvdId) {
    const searchKeyword = normalizeDvdIdForSearch(dvdId);
    const targetCompareId = normalizeDvdIdForCompare(dvdId);
    if (!searchKeyword || !targetCompareId) return "";

    try {
        const res = await Widget.http.get(`${JAVTRAILERS_BASE_URL}/search/${encodeURIComponent(searchKeyword)}`, {
            headers: JAVTRAILERS_HEADERS,
            timeout: JAVTRAILERS_SEARCH_TIMEOUT_MS
        });
        const $ = Widget.html.load(res.data || "");
        const candidates = [];
        $('a[href*="/video/"]').each((_, el) => {
            const result = scoreJavTrailersSearchResult($, $(el), targetCompareId);
            if (result.href) candidates.push(result);
        });
        candidates.sort((a, b) => b.score - a.score);
        return candidates.length && candidates[0].score >= 60 ? candidates[0].href : "";
    } catch (e) {
        return "";
    }
}

async function fetchJavTrailersBackdropPaths(dvdId) {
    if (!dvdId) return [];

    try {
        const detailUrl = await findJavTrailersDetailUrl(dvdId);
        if (!detailUrl) return [];
        const res = await Widget.http.get(detailUrl, {
            headers: { ...JAVTRAILERS_HEADERS, "Referer": `${JAVTRAILERS_BASE_URL}/` },
            timeout: JAVTRAILERS_DETAIL_TIMEOUT_MS
        });
        const html = res.data || "";
        const $ = Widget.html.load(html);
        const contentId = extractJavTrailersContentId($, html, detailUrl);
        return extractJavTrailersGallery(html, contentId, dvdId);
    } catch (e) {
        return [];
    }
}

function parseVideoList(html, options = {}) {
    const { currentPeople = null, currentGenre = null } = options;

    if (!html || html.includes("Just a moment")) {
        return buildEmptyListMessage("被 Cloudflare 拦截", "请稍后重试");
    }

    const $ = Widget.html.load(html);
    const results = [];

    $("div.group").each((i, el) => {
        const $el = $(el);
        const $link = $el.find("a.text-secondary");
        const href = $link.attr("href");

        if (href) {
            const title = $link.text().trim();
            const $img = $el.find("img");
            const imgSrc = $img.attr("data-src") || $img.attr("src") || "";
            const duration = $el.find(".absolute.bottom-1.right-1").text().trim();
            const videoId = extractVideoId(href);
            const derivedPoster = videoId ? `https://fourhoi.com/${videoId.toLowerCase()}/cover-t.jpg` : imgSrc;
            const finalCover = derivedPoster || imgSrc;

            const detailLink = resolveDetailLink(href);
            const item = {
                id: detailLink,
                type: "url",
                title,
                backdropPath: finalCover,
                link: detailLink,
                description: `时长: ${duration}${videoId ? ` | 番号: ${videoId}` : ""}`,
                customHeaders: HEADERS
            };

            const peopleItems = [];
            if (currentPeople) peopleItems.push(currentPeople);

            $el.find('a[href*="/actresses/"], a[href*="actresses"]').each((_, peopleEl) => {
                const $people = $(peopleEl);
                const people = buildPeopleItem(
                    $people.text(),
                    getImageFromElement($, $people),
                    $people.attr("href") || ""
                );
                if (people && !peopleItems.some((item) => item.id === people.id)) peopleItems.push(people);
            });

            if (peopleItems.length) item.peoples = peopleItems;
            if (currentGenre) item.genreItems = [currentGenre];

            results.push(item);
        }
    });

    return results.length > 0 ? results : buildEmptyListMessage("没有找到相关视频");
}

async function loadList(params = {}) {
    const { primary_category = "", endpoint = "", page = 1, sort = "", sort_by = "", filters = "", keyword = "", peopleTitle = "", genreTitle = "" } = params;
    const peopleId = getPeopleIdFromParams(params);
    const genreId = getGenreIdFromParams(params);

    if (primary_category === "search" && !peopleId && !genreId) {
        return searchList({ keyword, page });
    }

    const matchedPeopleId = resolvePeopleEndpoint(peopleId);
    const rawGenreId = normalizeGenreId(genreId);
    const matchedGenreId = rawGenreId.includes("/genres/") ? rawGenreId : "";
    const resolvedEndpoint = resolveEndpointByPrimaryCategory(primary_category, endpoint);
    const targetEndpoint = matchedPeopleId || matchedGenreId || resolvedEndpoint;
    const effectiveSort = matchedPeopleId || matchedGenreId
        ? sort_by || sort
        : isRecentUpdatesCategory(primary_category) ? "published_at" : sort_by || sort;
    const url = buildListUrl(targetEndpoint, page, filters, effectiveSort);
    const currentPeople = matchedPeopleId ? {
        id: matchedPeopleId,
        title: peopleTitle || decodeURIComponent(matchedPeopleId.split("/").pop() || "主演"),
        avatar: "",
        role: "主演"
    } : null;
    const currentGenre = matchedGenreId ? {
        id: matchedGenreId,
        title: genreTitle || decodeURIComponent(matchedGenreId.split("/").pop() || "分类")
    } : null;

    try {
        const res = await Widget.http.get(url, { headers: HEADERS });
        if (currentPeople) {
            const $peoplePage = Widget.html.load(res.data);
            const pageAvatar = resolveAvatarImageUrl(getExplicitActressAvatar($peoplePage));
            const avatar = PEOPLE_AVATAR_CACHE[matchedPeopleId] || pageAvatar || await resolvePeopleAvatar(matchedPeopleId);
            if (avatar) {
                PEOPLE_AVATAR_CACHE[matchedPeopleId] = avatar;
                currentPeople.avatar = avatar;
            }
        }
        return parseVideoList(res.data, { currentPeople, currentGenre });
    } catch (e) {
        return buildEmptyListMessage("加载失败", e.message);
    }
}

async function loadRecentUpdates(params = {}) {
    return loadList({
        ...params,
        primary_category: RECENT_UPDATES_CATEGORY
    });
}

async function searchList(params = {}) {
    const { page = 1, keyword } = params;

    if (getPeopleIdFromParams(params) || getGenreIdFromParams(params)) {
        return loadList(params);
    }

    if (!keyword) {
        return buildEmptyListMessage("请输入关键词开始搜索");
    }

    let url = `${BASE_URL}/cn/search/${encodeURIComponent(keyword)}`;
    if (page > 1) url += `?page=${page}`;

    try {
        const res = await Widget.http.get(url, { headers: HEADERS });
        return parseVideoList(res.data);
    } catch (e) {
        return buildEmptyListMessage("搜索失败", e.message);
    }
}

async function searchGlobal(params = {}) {
    const { page = 1, keyword } = params;

    if (getPeopleIdFromParams(params) || getGenreIdFromParams(params)) {
        return loadList(params);
    }

    if (!keyword) {
        return buildEmptyListMessage("请输入关键词开始全局搜索");
    }

    const query = encodeURIComponent(keyword);
    let url = `${BASE_URL}/cn/search/${query}`;
    if (page > 1) url += `?page=${page}`;

    try {
        const res = await Widget.http.get(url, { headers: HEADERS });
        return parseVideoList(res.data);
    } catch (e) {
        return buildEmptyListMessage("全局搜索失败", e.message);
    }
}

function isLikely1080pUrl(url) {
    return /(?:^|[^\d])1080(?:[^\d]|$)|1920x1080/i.test(url || "");
}

async function buildResolvedStreamResource(code, detailLink, videoUrl, isChinese) {
    const preferredUrl = await resolvePreferred1080pUrl(videoUrl);
    if (!preferredUrl) return null;

    return {
        name: "MissAV 1080P",
        description: `番号：${code}\n来源：MissAV\n画质：1080P\n链接：${detailLink}`,
        url: preferredUrl,
        isChinese,
        is1080p: true,
        customHeaders: {
            "Referer": "https://missav.ai/",
            "User-Agent": HEADERS["User-Agent"],
            "Origin": "https://missav.ai"
        }
    };
}

function hasResourceUrl(resources, url) {
    return resources.some((item) => item.url === url);
}

async function collectMissavStreamResources(code) {
    try {
        const searchUrl = `${BASE_URL}/cn/search/${encodeURIComponent(code)}`;
        const searchRes = await Widget.http.get(searchUrl, {
            headers: HEADERS,
            timeout: MISSAV_RESOURCE_SEARCH_TIMEOUT_MS
        });
        const detailLinks = appendDerivedNonSubtitleLinks(findMatchingDetailLinks(searchRes.data, code, searchUrl));
        if (!detailLinks.length) return [];

        const fetchResource = async (detailLink, isExpectedChinese) => {
            const detailRes = await Widget.http.get(detailLink, {
                headers: HEADERS,
                timeout: MISSAV_RESOURCE_DETAIL_TIMEOUT_MS
            });
            const detailHtml = detailRes.data || "";
            const videoUrl = extractMissavVideoUrl(detailHtml);
            if (!videoUrl) return null;

            const isChinese = isExpectedChinese || isChineseSubtitleLink(detailLink) || detectChineseSubtitle(detailHtml);
            return buildResolvedStreamResource(code, detailLink, videoUrl, isChinese);
        };

        const subtitleLinks = detailLinks.filter(isChineseSubtitleLink);
        const normalLinks = detailLinks.filter((link) => !isChineseSubtitleLink(link));
        const subtitleResources = [];
        let fallback1080pResource = null;

        for (const detailLink of subtitleLinks) {
            try {
                const subtitleResource = await fetchResource(detailLink, true);
                if (!subtitleResource || hasResourceUrl(subtitleResources, subtitleResource.url)) continue;
                if (subtitleResource.is1080p) return [subtitleResource];
                subtitleResources.push(subtitleResource);
            } catch (e) {
                continue;
            }
        }

        for (const detailLink of normalLinks) {
            try {
                const resource = await fetchResource(detailLink, false);
                if (!resource) continue;
                if (resource.isChinese) {
                    if (resource.is1080p) return [resource];
                    if (!hasResourceUrl(subtitleResources, resource.url)) subtitleResources.push(resource);
                    continue;
                }
                if (resource.is1080p) {
                    fallback1080pResource = resource;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        const resources = [];
        if (fallback1080pResource) resources.push(fallback1080pResource);
        subtitleResources.slice(0, 1).forEach((resource) => {
            if (!hasResourceUrl(resources, resource.url)) resources.push(resource);
        });
        return resources;
    } catch (e) {
        return [];
    }
}

function cloneStreamResources(resources = []) {
    return resources.map((resource) => ({
        ...resource,
        customHeaders: resource.customHeaders ? { ...resource.customHeaders } : resource.customHeaders
    }));
}

async function getCachedMissavStreamResources(code) {
    const cacheKey = normalizeCode(code);
    if (!cacheKey) return [];

    if (!Object.prototype.hasOwnProperty.call(MISSAV_STREAM_RESOURCE_CACHE, cacheKey)) {
        MISSAV_STREAM_RESOURCE_CACHE[cacheKey] = collectMissavStreamResources(code)
            .then((resources) => {
                const finalResources = Array.isArray(resources) ? resources : [];
                if (!finalResources.length) delete MISSAV_STREAM_RESOURCE_CACHE[cacheKey];
                return finalResources;
            })
            .catch(() => {
                delete MISSAV_STREAM_RESOURCE_CACHE[cacheKey];
                return [];
            });
    }

    return cloneStreamResources(await MISSAV_STREAM_RESOURCE_CACHE[cacheKey]);
}

async function loadResource(params = {}) {
    const code = extractCodeFromParams(params);
    if (!code) return [];
    return (await getCachedMissavStreamResources(code)).map(({ name, description, url, customHeaders }) => ({
        name,
        description,
        url,
        customHeaders
    }));
}

function buildEpisodeItemsFromResources(resources = []) {
    return resources.map((resource, index) => ({
        id: `source:${index}:${resource.name}`,
        type: "url",
        title: resource.name,
        description: resource.description,
        videoUrl: resource.url,
        playerType: "system",
        customHeaders: resource.customHeaders
    }));
}

async function loadDetail(link) {
    if (!link || String(link).startsWith("message:")) return null;

    try {
        const res = await Widget.http.get(link, { headers: HEADERS });
        const html = res.data;
        const $ = Widget.html.load(html);

        const title = $('meta[property="og:title"]').attr('content') || $('h1').text().trim();
        const detailCode = extractSearchCode(title) || extractVideoId(link);
        let videoUrl = "";
        const peoples = [];
        const genreItems = [];
        const seenGenres = new Set();

        const pushPeople = (name, avatar, href) => {
            const cleanName = (name || "").trim();
            const cleanKey = normalizePeopleTitle(cleanName);
            if (!cleanName) return;
            const people = buildPeopleItem(cleanName, avatar, href);
            if (!people) return;
            const existingIndex = peoples.findIndex((item) => {
                const itemKey = normalizePeopleTitle(item.title);
                return itemKey === cleanKey || itemKey.includes(cleanKey) || cleanKey.includes(itemKey);
            });

            if (existingIndex >= 0) {
                const existingKey = normalizePeopleTitle(peoples[existingIndex].title);
                const shouldReplace = cleanKey.length > existingKey.length ||
                    (!peoples[existingIndex].avatar && people.avatar);
                if (shouldReplace) {
                    peoples[existingIndex] = people;
                }
                return;
            }

            peoples.push(people);
        };

        const metaActressNames = [];
        $('meta[property="og:video:actor"], meta[property="video:actor"], meta[name="video:actor"]').each((_, el) => {
            const content = $(el).attr("content") || "";
            content.split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => metaActressNames.push(name));
        });

        $(".text-secondary").each((_, el) => {
            const $row = $(el);
            const label = normalizeDetailLabel($row.find("span").first().text());

            if (isActressLabel(label)) {
                $row.find('a[href*="/actresses/"], a[href*="actresses"]').each((_, actressEl) => {
                    const $actress = $(actressEl);
                    const href = resolveUrl($actress.attr("href") || "");
                    const rawName = $actress.text().replace(/\s+/g, " ").trim();
                    const matchedMetaName = metaActressNames.find((name) => normalizePeopleTitle(rawName).includes(normalizePeopleTitle(name)));
                    pushPeople(matchedMetaName || rawName, getImageFromElement($, $actress), href);
                });
            }

            if (isGenreLabel(label)) {
                $row.find('a[href*="/genres/"], a[href*="genres"]').each((_, genreEl) => {
                    const $genre = $(genreEl);
                    const genre = buildGenreItem($genre.text(), $genre.attr("href") || "");
                    if (genre && !seenGenres.has(genre.id)) {
                        seenGenres.add(genre.id);
                        genreItems.push(genre);
                    }
                });
            }
        });

        $('script').each((i, el) => {
            const scriptContent = $(el).html() || "";

            if (scriptContent.includes('surrit.com') && scriptContent.includes('.m3u8')) {
                const matches = scriptContent.match(/https:\/\/surrit\.com\/[a-f0-9\-]+\/[^"'\s]*\.m3u8/g);
                if (matches && matches.length > 0) {
                    videoUrl = matches[0];
                    return false;
                }
            }

            if (!videoUrl && scriptContent.includes('eval(function')) {
                const uuidMatches = scriptContent.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g);
                if (uuidMatches && uuidMatches.length > 0) {
                    videoUrl = `https://surrit.com/${uuidMatches[0]}/playlist.m3u8`;
                    return false;
                }
            }
        });

        if (!videoUrl) {
            const matchSimple = html.match(/source\s*=\s*['"]([^'"]+)['"]/);
            if (matchSimple) videoUrl = matchSimple[1];
        }

        if (videoUrl) {
            const item = {
                id: link,
                type: "url",
                title: title,
                link: link,
                videoUrl: videoUrl,
                playerType: "system",
                customHeaders: {
                    "Referer": "https://missav.ai/",
                    "User-Agent": HEADERS["User-Agent"],
                    "Origin": "https://missav.ai"
                }
            };

            if (peoples.length) item.peoples = peoples;
            if (genreItems.length) item.genreItems = genreItems;

            const avatarPromise = item.peoples
                ? Promise.all(item.peoples.map((people) => {
                    if (people.avatar) return people.avatar;
                    return resolvePeopleAvatar(people.id);
                }))
                : Promise.resolve([]);
            const heroImageUrl = buildDetailHeroImageUrl($);
            const backdropCandidateUrls = buildDetailBackdropCandidates(detailCode || title);
            const [avatars, availableCoverUrls, streamResources, matchedBackdropPaths] = await Promise.all([
                avatarPromise,
                filterAvailableImageUrls(backdropCandidateUrls),
                detailCode ? getCachedMissavStreamResources(detailCode) : Promise.resolve([]),
                detailCode ? fetchJavTrailersBackdropPaths(detailCode) : Promise.resolve([])
            ]);

            if (item.peoples) {
                for (let i = 0; i < avatars.length; i++) {
                    const avatar = avatars[i];
                    if (!avatar) continue;
                    item.peoples[i].avatar = avatar;
                }
            }

            const coverPaths = mergeBackdropPaths(availableCoverUrls);
            const backdropPaths = mergeBackdropPaths(coverPaths, matchedBackdropPaths);
            if (streamResources.length) item.episodeItems = buildEpisodeItemsFromResources(streamResources);
            if (coverPaths.length) item.posterPath = coverPaths[0];
            if (backdropPaths.length) {
                item.backdropPaths = backdropPaths;
                item.backdropPath = heroImageUrl || backdropPaths[0];
            } else if (heroImageUrl) {
                item.backdropPath = heroImageUrl;
            }

            return [item];
        } else {
            return buildEmptyListMessage("解析失败", "未找到播放地址");
        }

    } catch (e) {
        return buildEmptyListMessage("请求错误", e.message);
    }
}
