// 事件发生频次数据
export const eventFrequency = {
  "CHN": 450,  // 中国
  "USA": 380,  // 美国
  "RUS": 320,  // 俄罗斯
  "JPN": 280,  // 日本
  "IND": 350,  // 印度
  "KOR": 150,  // 韩国
  "PRK": 120,  // 朝鲜
  "VNM": 80,   // 越南
  "PHL": 60,   // 菲律宾
  "TWN": 450,  // 台湾（属于中国）
  "MYS": 40,   // 马来西亚
  "IDN": 90,   // 印度尼西亚
  "THA": 50,   // 泰国
  "MMR": 70,   // 缅甸
  "PAK": 180,  // 巴基斯坦
  "AFG": 200,  // 阿富汗
  "IRN": 160,  // 伊朗
  "IRQ": 140,  // 伊拉克
  "SAU": 100,  // 沙特
  "TUR": 110,  // 土耳其
  "SYR": 130,  // 叙利亚
  "ISR": 170,  // 以色列
  "EGY": 60,   // 埃及
  "GBR": 90,   // 英国
  "FRA": 85,   // 法国
  "DEU": 75,   // 德国
  "UKR": 250,  // 乌克兰
  "POL": 45,   // 波兰
  "AUS": 55,   // 澳大利亚
  "CAN": 40,   // 加拿大
  "BRA": 65,   // 巴西
  "MEX": 50,   // 墨西哥
  "ARG": 30,   // 阿根廷
  "ZAF": 35,   // 南非
  "NGA": 45,   // 尼日利亚
  "KEN": 25,   // 肯尼亚
  "ETH": 55,   // 埃塞俄比亚
};

// 频次对应的颜色
export const frequencyColors = {
  level7: "#67000d",  // >400次 深红
  level6: "#a50f15",  // 31-400次 红
  level5: "#cb181d",  // 21-300次 橙红
  level4: "#ef3b2c",  // 11-200次 橙
  level3: "#fb6a4a",  // 6-100次 浅橙
  level2: "#fc9272",  // 1-5次 浅粉
  level1: "#fee0d2"   // 0次 最浅
};

// 获取国家事件频次
export function getEventFrequency(countryCode) {
  return eventFrequency[countryCode] ?? 0;
}

// 根据频次获取颜色
export function getFrequencyColor(count) {
  if (count > 400) return frequencyColors.level7;
  if (count > 300) return frequencyColors.level6;
  if (count > 200) return frequencyColors.level5;
  if (count > 100) return frequencyColors.level4;
  if (count > 50) return frequencyColors.level3;
  if (count > 0) return frequencyColors.level2;
  return frequencyColors.level1;
}

// 获取国家事件频次颜色
export function getCountryFrequencyColor(countryCode) {
  const count = getEventFrequency(countryCode);
  return getFrequencyColor(count);
}
