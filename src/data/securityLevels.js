// 国家安全等级数据
// 等级: -3(友好) 到 +3(威胁), 0为无关

export const securityLevels = {
  // 友好国家 (-3 到 -1)
  "RUS": -2,  // 俄罗斯
  "PAK": -2,  // 巴基斯坦
  "PRK": -1,  // 朝鲜
  "SRB": -1,  // 塞尔维亚
  "BLR": -1,  // 白俄罗斯
  "KHM": -1,  // 柬埔寨
  "LAO": -1,  // 老挝
  "MMR": -1,  // 缅甸
  
  // 威胁国家 (+1 到 +3)
  "USA": 2,   // 美国
  "JPN": 2,   // 日本
  "GBR": 1,   // 英国
  "AUS": 1,   // 澳大利亚
  "IND": 1,   // 印度
  "PHL": 1,   // 菲律宾
  "VNM": 1,   // 越南
  
  // 其他国家默认为 0 (无关)
};

// 安全等级对应的颜色
export const securityColors = {
  3: "#8B0000",   // 极度危险 +3 深红
  2: "#E53935",   // 很危险 +2 红
  1: "#FF5722",   // 较危险 +1 橙红
  0: "#FFD700",   // 中性 0 金黄色（更明显）
  "-1": "#8BC34A", // 较安全 -1 浅绿
  "-2": "#4CAF50", // 很安全 -2 绿
  "-3": "#2E7D32"  // 非常安全 -3 深绿
};

// 获取国家安全等级
export function getSecurityLevel(countryCode) {
  return securityLevels[countryCode] ?? 0;
}

// 获取安全等级对应颜色
export function getSecurityColor(level) {
  return securityColors[level] ?? securityColors[0];
}

// 获取国家安全等级颜色
export function getCountrySecurityColor(countryCode) {
  const level = getSecurityLevel(countryCode);
  return getSecurityColor(level);
}
