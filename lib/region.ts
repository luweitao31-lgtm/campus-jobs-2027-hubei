export const regionConfig = {
  siteName: '鄂职秋招',
  siteSubtitle: 'Hubei 2027',
  province: '湖北',
  provinceLabel: '湖北全省',
  capital: '武汉',
  nationalLabel: '全国',
  allLocationsLabel: '全部地区',
  pagesBase: '/campus-jobs-2027-hubei/',
  localShareTarget: 0.7,
  localCities: ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施', '仙桃', '潜江', '天门', '神农架'],
} as const;

export type RegionScope = '湖北省内' | '全国可投';

export function detectsHubei(value: string): boolean {
  const normalized = value.normalize('NFKC');
  return normalized.includes('湖北') || regionConfig.localCities.some((city) => normalized.includes(city));
}

export function detectsNational(value: string): boolean {
  return /全国|多地|各地|全国统一|中国区/.test(value.normalize('NFKC'));
}

export function inferRegionScope(value: string): RegionScope | undefined {
  if (detectsHubei(value)) return '湖北省内';
  if (detectsNational(value)) return '全国可投';
  return undefined;
}

export function isAllowedLocationLabel(value: string): boolean {
  return value === regionConfig.provinceLabel
    || value === regionConfig.nationalLabel
    || value === regionConfig.capital
    || regionConfig.localCities.some((city) => value === city || value === `湖北${city}`);
}
