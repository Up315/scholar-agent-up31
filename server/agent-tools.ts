/**
 * AI Agent Tools Definition
 * Defines all available tools that the ReAct agent can call
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const CITY_CODES: Record<string, string> = {
  "北京": "110000",
  "上海": "310000",
  "天津": "120000",
  "重庆": "500000",
  "广州": "440100",
  "深圳": "440300",
  "杭州": "330100",
  "南京": "320100",
  "苏州": "320500",
  "成都": "510100",
  "武汉": "420100",
  "西安": "610100",
  "郑州": "410100",
  "长沙": "430100",
  "济南": "370100",
  "青岛": "370200",
  "大连": "210200",
  "沈阳": "210100",
  "哈尔滨": "230100",
  "长春": "220100",
  "石家庄": "130100",
  "太原": "140100",
  "合肥": "340100",
  "福州": "350100",
  "厦门": "350200",
  "南昌": "360100",
  "昆明": "530100",
  "贵阳": "520100",
  "南宁": "450100",
  "海口": "460100",
  "三亚": "460200",
  "兰州": "620100",
  "西宁": "630100",
  "银川": "640100",
  "乌鲁木齐": "650100",
  "拉萨": "540100",
  "呼和浩特": "150100",
  "宁波": "330200",
  "无锡": "320200",
  "东莞": "441900",
  "佛山": "440600",
  "珠海": "440400",
  "中山": "442000",
  "惠州": "441300",
  "温州": "330300",
  "常州": "320400",
  "南通": "320600",
  "徐州": "320300",
  "烟台": "370600",
  "潍坊": "370700",
  "临沂": "371300",
  "淄博": "370300",
  "唐山": "130200",
  "保定": "130600",
  "邯郸": "130400",
  "洛阳": "410300",
  "开封": "410200",
  "株洲": "430200",
  "湘潭": "430300",
  "岳阳": "430600",
  "绵阳": "510700",
  "泸州": "510500",
  "宜昌": "420500",
  "襄阳": "420600",
  "荆州": "421000",
  "桂林": "450300",
  "柳州": "450200",
  "大理": "532900",
  "丽江": "530700",
  "西双版纳": "532800",
  "九寨沟": "513225",
  "张家界": "430800",
  "黄山": "341000",
  "景德镇": "360200",
  "九江": "360400",
  "承德": "130800",
  "秦皇岛": "130300",
  "大同": "140200",
  "平遥": "140728",
  "敦煌": "620982",
  "喀什": "653101",
  "克拉玛依": "650200",
  "伊犁": "654000",
  "延吉": "222401",
  "牡丹江": "231000",
  "齐齐哈尔": "230200",
  "大庆": "230600",
  "连云港": "320700",
  "盐城": "320900",
  "扬州": "321000",
  "镇江": "321100",
  "泰州": "321200",
  "淮安": "320800",
  "宿迁": "321300",
  "嘉兴": "330400",
  "湖州": "330500",
  "绍兴": "330600",
  "金华": "330700",
  "衢州": "330800",
  "舟山": "330900",
  "台州": "331000",
  "丽水": "331100",
  "马鞍山": "340500",
  "芜湖": "340200",
  "蚌埠": "340300",
  "淮南": "340400",
  "安庆": "340800",
  "阜阳": "341200",
  "泉州": "350500",
  "漳州": "350600",
  "莆田": "350300",
  "龙岩": "350800",
  "三明": "350400",
  "南平": "350700",
  "宁德": "350900",
  "赣州": "360700",
  "吉安": "360800",
  "上饶": "361100",
  "抚州": "361000",
  "宜春": "360900",
  "新余": "360500",
  "萍乡": "360300",
  "鹰潭": "360600",
  "济宁": "370800",
  "泰安": "370900",
  "威海": "371000",
  "日照": "371100",
  "德州": "371400",
  "聊城": "371500",
  "滨州": "371600",
  "菏泽": "371700",
  "枣庄": "370400",
  "东营": "370500",
  "新乡": "410700",
  "焦作": "410800",
  "安阳": "410500",
  "濮阳": "410900",
  "许昌": "411000",
  "漯河": "411100",
  "三门峡": "411200",
  "南阳": "411300",
  "商丘": "411400",
  "信阳": "411500",
  "周口": "411600",
  "驻马店": "411700",
  "平顶山": "410400",
  "鹤壁": "410600",
  "鄂州": "420700",
  "荆门": "420800",
  "孝感": "420900",
  "黄冈": "421100",
  "咸宁": "421200",
  "随州": "421300",
  "恩施": "422800",
  "仙桃": "429004",
  "潜江": "429005",
  "天门": "429006",
  "神农架": "429021",
  "衡阳": "430400",
  "邵阳": "430500",
  "常德": "430700",
  "益阳": "430900",
  "郴州": "431000",
  "永州": "431100",
  "怀化": "431200",
  "娄底": "431300",
  "湘西": "433100",
  "韶关": "440200",
  "汕头": "440500",
  "江门": "440700",
  "湛江": "440800",
  "茂名": "440900",
  "肇庆": "441200",
  "清远": "441800",
  "潮州": "445100",
  "揭阳": "445200",
  "云浮": "445300",
  "汕尾": "441500",
  "河源": "441600",
  "阳江": "441700",
  "梅州": "441400",
  "北海": "450500",
  "防城港": "450600",
  "钦州": "450700",
  "贵港": "450800",
  "玉林": "450900",
  "百色": "451000",
  "贺州": "451100",
  "河池": "451200",
  "来宾": "451300",
  "崇左": "451400",
  "梧州": "450400",
  "自贡": "510300",
  "攀枝花": "510400",
  "德阳": "510600",
  "广元": "510800",
  "遂宁": "510900",
  "内江": "511000",
  "乐山": "511100",
  "南充": "511300",
  "眉山": "511400",
  "宜宾": "511500",
  "广安": "511600",
  "达州": "511700",
  "雅安": "511800",
  "巴中": "511900",
  "资阳": "512000",
  "阿坝": "513200",
  "甘孜": "513300",
  "凉山": "513400",
  "遵义": "520300",
  "六盘水": "520200",
  "安顺": "520400",
  "毕节": "520500",
  "铜仁": "520600",
  "黔西南": "522300",
  "黔东南": "522600",
  "黔南": "522700",
  "曲靖": "530300",
  "玉溪": "530400",
  "保山": "530500",
  "昭通": "530600",
  "普洱": "530800",
  "临沧": "530900",
  "楚雄": "532300",
  "红河": "532500",
  "文山": "532600",
  "德宏": "533100",
  "怒江": "533300",
  "迪庆": "533400",
  "昌都": "540300",
  "山南": "540500",
  "日喀则": "540200",
  "那曲": "540600",
  "阿里": "542500",
  "林芝": "540400",
  "咸阳": "610400",
  "铜川": "610200",
  "宝鸡": "610300",
  "渭南": "610500",
  "延安": "610600",
  "汉中": "610700",
  "榆林": "610800",
  "安康": "610900",
  "商洛": "611000",
  "嘉峪关": "620200",
  "金昌": "620300",
  "白银": "620400",
  "天水": "620500",
  "武威": "620600",
  "张掖": "620700",
  "平凉": "620800",
  "酒泉": "620900",
  "庆阳": "621000",
  "定西": "621100",
  "陇南": "621200",
  "临夏": "622900",
  "甘南": "623000",
  "海东": "630200",
  "海北": "632200",
  "黄南": "632300",
  "海南": "632500",
  "果洛": "632600",
  "玉树": "632700",
  "海西": "632800",
  "石嘴山": "640200",
  "吴忠": "640300",
  "固原": "640400",
  "中卫": "640500",
  "吐鲁番": "650400",
  "哈密": "650500",
  "昌吉": "652300",
  "博尔塔拉": "652700",
  "巴音郭楞": "652800",
  "阿克苏": "652900",
  "克孜勒苏": "653000",
  "和田": "653200",
  "阿勒泰": "654300",
  "塔城": "654200",
  "伊宁": "654000",
  "阿拉尔": "659001",
  "图木舒克": "659002",
  "五家渠": "659003",
  "北屯": "659004",
  "铁门关": "659006",
  "双河": "659007",
  "可克达拉": "659008",
  "昆玉": "659009",
  "胡杨河": "659010",
};

function getCityCode(cityName: string): string | null {
  const normalizedCity = cityName.replace(/[省市县区旗]/g, "").trim();
  
  if (CITY_CODES[normalizedCity]) {
    return CITY_CODES[normalizedCity];
  }
  
  for (const [name, code] of Object.entries(CITY_CODES)) {
    if (name.includes(normalizedCity) || normalizedCity.includes(name)) {
      return code;
    }
  }
  
  return null;
}

/**
 * Calculator Tool: Performs mathematical calculations
 */
export const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    try {
      let processed = expression.trim();
      
      processed = processed.replace(/√\s*\(/g, '((');
      processed = processed.replace(/√\s*(\d+\.?\d*)/g, '($1)**0.5');
      processed = processed.replace(/√\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '($1)**0.5');
      processed = processed.replace(/\)\*\*0\.5\(/g, ')**0.5)(');
      
      processed = processed.replace(/\^/g, '**');
      
      console.log(`[Calculator] Original: ${expression}, Processed: ${processed}`);
      
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${processed})`)();
      
      if (typeof result !== "number" || isNaN(result)) {
        return "错误: 计算结果无效";
      }
      
      if (!isFinite(result)) {
        return "错误: 计算结果超出范围（可能是除以零）";
      }
      
      const formattedResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));
      return `计算结果: ${formattedResult}`;
    } catch (error) {
      console.error(`[Calculator] Error processing "${expression}":`, error);
      return `错误: 无法计算 "${expression}"，请检查表达式格式`;
    }
  },
  {
    name: "calculator",
    description: "执行数学计算。支持 +, -, *, /, 括号，以及特殊符号：√(开方)、^(乘方)。示例: '√144', '2^10', '3.14 * 5 + 2'",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式"),
    }),
  }
);

/**
 * Current Time Tool: Returns current date and time
 * Supports local time and world time zone queries
 */
export const currentTimeTool = tool(
  async ({ location }: { location?: string }) => {
    const now = new Date();
    const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    
    const timezoneMap: Record<string, { timezone: string; name: string }> = {
      "中国": { timezone: "Asia/Shanghai", name: "中国" },
      "北京": { timezone: "Asia/Shanghai", name: "北京" },
      "上海": { timezone: "Asia/Shanghai", name: "上海" },
      "日本": { timezone: "Asia/Tokyo", name: "日本" },
      "东京": { timezone: "Asia/Tokyo", name: "东京" },
      "韩国": { timezone: "Asia/Seoul", name: "韩国" },
      "首尔": { timezone: "Asia/Seoul", name: "首尔" },
      "新加坡": { timezone: "Asia/Singapore", name: "新加坡" },
      "香港": { timezone: "Asia/Hong_Kong", name: "香港" },
      "台湾": { timezone: "Asia/Taipei", name: "台湾" },
      "台北": { timezone: "Asia/Taipei", name: "台北" },
      "泰国": { timezone: "Asia/Bangkok", name: "泰国" },
      "曼谷": { timezone: "Asia/Bangkok", name: "曼谷" },
      "印度": { timezone: "Asia/Kolkata", name: "印度" },
      "迪拜": { timezone: "Asia/Dubai", name: "迪拜" },
      "美国": { timezone: "America/New_York", name: "美国东部" },
      "纽约": { timezone: "America/New_York", name: "纽约" },
      "洛杉矶": { timezone: "America/Los_Angeles", name: "洛杉矶" },
      "旧金山": { timezone: "America/Los_Angeles", name: "旧金山" },
      "芝加哥": { timezone: "America/Chicago", name: "芝加哥" },
      "西雅图": { timezone: "America/Los_Angeles", name: "西雅图" },
      "英国": { timezone: "Europe/London", name: "英国" },
      "伦敦": { timezone: "Europe/London", name: "伦敦" },
      "法国": { timezone: "Europe/Paris", name: "法国" },
      "巴黎": { timezone: "Europe/Paris", name: "巴黎" },
      "德国": { timezone: "Europe/Berlin", name: "德国" },
      "柏林": { timezone: "Europe/Berlin", name: "柏林" },
      "意大利": { timezone: "Europe/Rome", name: "意大利" },
      "罗马": { timezone: "Europe/Rome", name: "罗马" },
      "西班牙": { timezone: "Europe/Madrid", name: "西班牙" },
      "马德里": { timezone: "Europe/Madrid", name: "马德里" },
      "俄罗斯": { timezone: "Europe/Moscow", name: "俄罗斯" },
      "莫斯科": { timezone: "Europe/Moscow", name: "莫斯科" },
      "澳大利亚": { timezone: "Australia/Sydney", name: "澳大利亚" },
      "悉尼": { timezone: "Australia/Sydney", name: "悉尼" },
      "墨尔本": { timezone: "Australia/Melbourne", name: "墨尔本" },
      "新西兰": { timezone: "Pacific/Auckland", name: "新西兰" },
      "奥克兰": { timezone: "Pacific/Auckland", name: "奥克兰" },
      "加拿大": { timezone: "America/Toronto", name: "加拿大" },
      "多伦多": { timezone: "America/Toronto", name: "多伦多" },
      "温哥华": { timezone: "America/Vancouver", name: "温哥华" },
      "巴西": { timezone: "America/Sao_Paulo", name: "巴西" },
      "圣保罗": { timezone: "America/Sao_Paulo", name: "圣保罗" },
      "墨西哥": { timezone: "America/Mexico_City", name: "墨西哥" },
      "埃及": { timezone: "Africa/Cairo", name: "埃及" },
      "开罗": { timezone: "Africa/Cairo", name: "开罗" },
      "南非": { timezone: "Africa/Johannesburg", name: "南非" },
    };
    
    if (location) {
      const normalizedLocation = location.replace(/[市省区县]/g, "").trim();
      
      let foundLocation = timezoneMap[normalizedLocation];
      
      if (!foundLocation) {
        for (const [key, value] of Object.entries(timezoneMap)) {
          if (key.includes(normalizedLocation) || normalizedLocation.includes(key)) {
            foundLocation = value;
            break;
          }
        }
      }
      
      if (foundLocation) {
        try {
          const targetTime = new Date(now.toLocaleString("en-US", { timeZone: foundLocation.timezone }));
          const localTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
          const diffHours = Math.round((targetTime.getTime() - localTime.getTime()) / (1000 * 60 * 60));
          
          const timeStr = targetTime.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
          const weekDay = weekDays[targetTime.getDay()];
          
          let diffStr = "";
          if (diffHours > 0) {
            diffStr = `（比北京时间快${diffHours}小时）`;
          } else if (diffHours < 0) {
            diffStr = `（比北京时间慢${Math.abs(diffHours)}小时）`;
          }
          
          return `${foundLocation.name}现在时间：${timeStr} ${weekDay} ${diffStr}`;
        } catch (error) {
          return `抱歉，无法获取"${location}"的时间信息。`;
        }
      } else {
        const localTimeStr = now.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        
        return `抱歉，暂时不支持查询"${location}"的时间。\n\n目前支持的国家和城市包括：日本、美国、英国、法国、德国、澳大利亚、韩国、新加坡、香港、台湾、泰国、印度、迪拜、加拿大、巴西、俄罗斯、意大利、西班牙、新西兰、埃及、南非等。\n\n当前北京时间：${localTimeStr} ${weekDays[now.getDay()]}`;
      }
    }
    
    const localTimeStr = now.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const weekDay = weekDays[now.getDay()];
    
    return `当前北京时间：${localTimeStr} ${weekDay}\n\n如需查询其他国家时间，请告诉我城市或国家名称，例如："日本现在几点"、"美国纽约时间"、"伦敦时间"等。`;
  },
  {
    name: "get_current_time",
    description: "获取当前时间或查询世界各地的时间。可以查询中国、日本、美国、英国、法国、德国、澳大利亚、韩国、新加坡等国家或城市的时间。当用户询问其他国家/城市时间时，location参数填写对应的国家或城市名称。",
    schema: z.object({
      location: z.string().optional().describe("要查询时间的国家或城市名称（如：日本、美国、纽约、伦敦、东京等），不填则返回北京时间"),
    }),
  }
);

/**
 * Weather Query Tool: Queries real weather data from Amap API
 * Supports both current weather and weather forecast
 * Returns weather data with caring suggestions
 */
export const weatherTool = tool(
  async ({ city, dateType }: { city: string; dateType?: string }) => {
    const apiKey = process.env.AMAP_API_KEY;
    
    if (!apiKey) {
      return "天气查询功能暂未配置，请联系管理员设置高德地图 API Key。";
    }
    
    const cityCode = getCityCode(city);
    
    if (!cityCode) {
      return `抱歉，暂时无法识别城市"${city}"。请尝试输入其他主要城市名称，如：北京、上海、广州、深圳等。`;
    }
    
    const isFuture = dateType === "tomorrow" || dateType === "未来";
    
    try {
      const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityCode}&key=${apiKey}&extensions=all`;
      
      const response = await fetch(url);
      const data = await response.json() as any;
      
      if (data.status !== "1") {
        return `抱歉，暂时无法获取"${city}"的天气信息，请稍后再试。`;
      }
      
      if (!data.forecasts || !data.forecasts[0]?.casts || data.forecasts[0].casts.length === 0) {
        return `抱歉，暂时无法获取"${city}"的天气预报信息。`;
      }
      
      const forecast = data.forecasts[0];
      const today = forecast.casts[0];
      const tomorrow = forecast.casts[1];
      
      const generateSuggestions = (dayWeather: string, nightWeather: string, dayTemp: number, nightTemp: number): string[] => {
        const suggestions: string[] = [];
        const tempDiff = Math.abs(dayTemp - nightTemp);
        const avgTemp = Math.round((dayTemp + nightTemp) / 2);
        const mainWeather = dayWeather.includes("雨") || dayWeather.includes("雪") ? dayWeather : nightWeather;
        
        if (tempDiff >= 10) {
          suggestions.push("早晚温差比较大，记得适时增减衣物哦");
        }
        
        if (mainWeather.includes("雨")) {
          if (mainWeather.includes("大雨") || mainWeather.includes("暴雨")) {
            suggestions.push("今天雨势较大，出门一定要带伞，注意防雨");
          } else {
            suggestions.push("今天有雨，出门别忘了带把伞");
          }
        }
        
        if (mainWeather.includes("雪")) {
          suggestions.push("有雪天气，路面可能结冰，走路开车都要小心");
        }
        
        if (mainWeather.includes("雾") || mainWeather.includes("霾")) {
          suggestions.push("能见度比较低，开车或出行要注意安全");
        }
        
        if (mainWeather.includes("晴") || mainWeather.includes("多云")) {
          suggestions.push("紫外线比较强，出门记得涂防晒或戴帽子");
        }
        
        if (avgTemp <= 0) {
          suggestions.push("天气很冷，一定要穿羽绒服或棉衣，注意保暖");
        } else if (avgTemp <= 10) {
          suggestions.push("气温较低，建议穿厚外套、毛衣或羽绒服");
        } else if (avgTemp <= 20) {
          suggestions.push("天气微凉，适合穿风衣、薄外套或长袖");
        } else if (avgTemp <= 28) {
          suggestions.push("气温舒适，穿短袖、薄衫就可以了");
        } else {
          suggestions.push("天气比较热，穿轻薄透气的衣服，注意防暑");
        }
        
        return suggestions;
      };
      
      if (isFuture) {
        if (!tomorrow) {
          return `抱歉，暂时无法获取"${city}"明天的天气预报。`;
        }
        
        const dayWeather = tomorrow.dayweather || "未知";
        const nightWeather = tomorrow.nightweather || "未知";
        const dayTemp = parseInt(tomorrow.daytemp) || 0;
        const nightTemp = parseInt(tomorrow.nighttemp) || 0;
        const dayWind = tomorrow.daywind || "无";
        const nightWind = tomorrow.nightwind || "无";
        const dayPower = tomorrow.daypower || "0";
        const nightPower = tomorrow.nightpower || "0";
        const tempDiff = Math.abs(dayTemp - nightTemp);
        const weekDay = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][new Date(tomorrow.date).getDay()];
        
        const suggestions = generateSuggestions(dayWeather, nightWeather, dayTemp, nightTemp);
        
        let result = `${forecast.city}明天（${tomorrow.date} ${weekDay}）天气：\n`;
        result += `白天${dayWeather}，最高${dayTemp}°C；夜间${nightWeather}，最低${nightTemp}°C。\n`;
        result += `温差${tempDiff}°C。\n\n`;
        result += `温馨提示：\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        
        return result;
      } else {
        if (!today) {
          return `抱歉，暂时无法获取"${city}"今天的天气预报。`;
        }
        
        const dayWeather = today.dayweather || "未知";
        const nightWeather = today.nightweather || "未知";
        const dayTemp = parseInt(today.daytemp) || 0;
        const nightTemp = parseInt(today.nighttemp) || 0;
        const dayWind = today.daywind || "无";
        const nightWind = today.nightwind || "无";
        const dayPower = today.daypower || "0";
        const nightPower = today.nightpower || "0";
        const tempDiff = Math.abs(dayTemp - nightTemp);
        const weekDay = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][new Date(today.date).getDay()];
        
        const liveUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityCode}&key=${apiKey}&extensions=base`;
        const liveResponse = await fetch(liveUrl);
        const liveData = await liveResponse.json() as any;
        
        let currentTemp = "";
        let humidity = "";
        if (liveData.status === "1" && liveData.lives && liveData.lives.length > 0) {
          currentTemp = liveData.lives[0].temperature;
          humidity = liveData.lives[0].humidity;
        }
        
        const suggestions = generateSuggestions(dayWeather, nightWeather, dayTemp, nightTemp);
        
        let result = `${forecast.city}今天（${today.date} ${weekDay}）天气：\n`;
        result += `白天${dayWeather}，最高${dayTemp}°C；夜间${nightWeather}，最低${nightTemp}°C。`;
        if (currentTemp) {
          result += ` 当前温度${currentTemp}°C。`;
        }
        result += `\n温差${tempDiff}°C。\n\n`;
        result += `温馨提示：\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        
        return result;
      }
    } catch (error) {
      console.error("[Weather Tool] Error:", error);
      return `抱歉，查询"${city}"天气时遇到问题，请稍后再试。`;
    }
  },
  {
    name: "weather_query",
    description: "查询指定城市的天气信息，返回天气数据和贴心生活建议。支持今天和明天天气。当用户询问'明天天气'时，dateType参数设为'tomorrow'。",
    schema: z.object({
      city: z.string().describe("要查询天气的城市名称（如：北京、上海、广州）"),
      dateType: z.enum(["today", "tomorrow"]).optional().describe("查询类型：today表示今天，tomorrow表示明天"),
    }),
  }
);

/**
 * In-memory storage for memos and reminders
 */
const memoStore: Map<string, { content: string; createdAt: Date }> = new Map();
const reminderStore: Map<string, { content: string; remindAt: Date; createdAt: Date; triggered: boolean }> = new Map();

/**
 * Memo Tool: Create and manage memos/notes
 */
export const memoTool = tool(
  async ({ action, content, memoId }: { action: "create" | "list" | "delete"; content?: string; memoId?: string }) => {
    switch (action) {
      case "create": {
        if (!content) {
          return "错误：创建备忘录需要提供内容";
        }
        const id = `memo_${Date.now()}`;
        memoStore.set(id, { content, createdAt: new Date() });
        return `备忘录创建成功！\nID: ${id}\n内容: ${content}\n创建时间: ${new Date().toLocaleString("zh-CN")}`;
      }
      
      case "list": {
        if (memoStore.size === 0) {
          return "当前没有备忘录";
        }
        const memoList = Array.from(memoStore.entries())
          .map(([id, memo]) => `📝 ${id}\n   内容: ${memo.content}\n   创建时间: ${memo.createdAt.toLocaleString("zh-CN")}`)
          .join("\n\n");
        return `当前备忘录列表（共${memoStore.size}条）：\n\n${memoList}`;
      }
      
      case "delete": {
        if (!memoId) {
          return "错误：删除备忘录需要提供备忘录ID";
        }
        if (!memoStore.has(memoId)) {
          return `错误：找不到ID为 ${memoId} 的备忘录`;
        }
        memoStore.delete(memoId);
        return `备忘录 ${memoId} 已删除`;
      }
      
      default:
        return "错误：未知操作。支持的操作：create（创建）、list（列出）、delete（删除）";
    }
  },
  {
    name: "create_memo",
    description: "创建、查看或删除备忘录。action参数：create创建新备忘录，list列出所有备忘录，delete删除指定备忘录。",
    schema: z.object({
      action: z.enum(["create", "list", "delete"]).describe("操作类型"),
      content: z.string().optional().describe("备忘录内容（创建时需要）"),
      memoId: z.string().optional().describe("备忘录ID（删除时需要）"),
    }),
  }
);

/**
 * Reminder Tool: Set and manage reminders
 */
export const reminderTool = tool(
  async ({ action, content, remindAt, reminderId }: { action: "create" | "list" | "delete"; content?: string; remindAt?: string; reminderId?: string }) => {
    switch (action) {
      case "create": {
        if (!content || !remindAt) {
          return "错误：创建提醒需要提供内容和提醒时间";
        }
        
        let remindDate: Date;
        try {
          if (remindAt.includes("分钟后")) {
            const minutes = parseInt(remindAt);
            remindDate = new Date(Date.now() + minutes * 60 * 1000);
          } else if (remindAt.includes("小时后")) {
            const hours = parseInt(remindAt);
            remindDate = new Date(Date.now() + hours * 60 * 60 * 1000);
          } else if (remindAt.includes("明天")) {
            remindDate = new Date();
            remindDate.setDate(remindDate.getDate() + 1);
            remindDate.setHours(9, 0, 0, 0);
          } else {
            remindDate = new Date(remindAt);
          }
          
          if (isNaN(remindDate.getTime())) {
            return "错误：无法解析提醒时间，请使用格式如'30分钟后'、'1小时后'、'明天'或具体时间";
          }
        } catch {
          return "错误：时间格式无效";
        }
        
        const id = `reminder_${Date.now()}`;
        reminderStore.set(id, { content, remindAt: remindDate, createdAt: new Date(), triggered: false });
        
        return `提醒设置成功！\nID: ${id}\n内容: ${content}\n提醒时间: ${remindDate.toLocaleString("zh-CN")}`;
      }
      
      case "list": {
        if (reminderStore.size === 0) {
          return "当前没有提醒事项";
        }
        const now = new Date();
        const reminderList = Array.from(reminderStore.entries())
          .filter(([, r]) => !r.triggered)
          .map(([id, reminder]) => {
            const timeLeft = Math.round((reminder.remindAt.getTime() - now.getTime()) / 60000);
            const timeLeftStr = timeLeft > 0 ? `（还有${timeLeft}分钟）` : "（已到期）";
            return `⏰ ${id}\n   内容: ${reminder.content}\n   提醒时间: ${reminder.remindAt.toLocaleString("zh-CN")} ${timeLeftStr}`;
          })
          .join("\n\n");
        return `当前提醒列表（共${reminderStore.size}条）：\n\n${reminderList}`;
      }
      
      case "delete": {
        if (!reminderId) {
          return "错误：删除提醒需要提供提醒ID";
        }
        if (!reminderStore.has(reminderId)) {
          return `错误：找不到ID为 ${reminderId} 的提醒`;
        }
        reminderStore.delete(reminderId);
        return `提醒 ${reminderId} 已删除`;
      }
      
      default:
        return "错误：未知操作。支持的操作：create（创建）、list（列出）、delete（删除）";
    }
  },
  {
    name: "set_reminder",
    description: "创建、查看或删除提醒事项。remindAt支持相对时间如'30分钟后'、'1小时后'、'明天'，或具体时间。",
    schema: z.object({
      action: z.enum(["create", "list", "delete"]).describe("操作类型"),
      content: z.string().optional().describe("提醒内容（创建时需要）"),
      remindAt: z.string().optional().describe("提醒时间，如'30分钟后'、'1小时后'、'明天'（创建时需要）"),
      reminderId: z.string().optional().describe("提醒ID（删除时需要）"),
    }),
  }
);

/**
 * Generate Response Tool: AI generates content for tasks without specific tools
 */
export const generateResponseTool = tool(
  async ({ task, context }: { task: string; context?: string }) => {
    const suggestions: Record<string, string> = {
      "规划行程": `根据天气情况，建议的出行安排：
上午：适合户外活动，可以去公园散步或参观景点
中午：建议在室内用餐，避开紫外线最强的时段
下午：可以安排购物或参观博物馆等室内活动
傍晚：适合在户外散步，欣赏日落
温馨提示：记得带好防晒用品和足够的水`,
      "给出建议": `基于当前情况，我的建议是：
1. 提前做好准备，查看相关资讯
2. 合理安排时间，避免高峰期
3. 注意安全，做好防护措施
4. 保持灵活，根据实际情况调整计划`,
      "分析问题": `针对您的问题，我的分析如下：
关键点：需要综合考虑多方面因素
建议方向：从实际出发，循序渐进
注意事项：保持耐心，逐步解决`,
    };

    for (const [key, value] of Object.entries(suggestions)) {
      if (task.includes(key)) {
        return value;
      }
    }

    return `针对"${task}"的建议：
${context ? `基于上下文：${context}\n` : ""}
建议您根据实际情况，合理安排时间和资源。如有需要，可以提供更多细节，我会给出更具体的建议。`;
  },
  {
    name: "generate_response",
    description: "当任务需要AI生成内容（如规划行程、给出建议、分析问题、总结信息）但没有对应工具时使用。context参数可传入之前步骤的结果。",
    schema: z.object({
      task: z.string().describe("需要AI完成的任务描述"),
      context: z.string().optional().describe("之前步骤的上下文信息"),
    }),
  }
);

/**
 * All available tools for the agent
 */
export const agentTools = [calculatorTool, currentTimeTool, weatherTool, memoTool, reminderTool, generateResponseTool];
