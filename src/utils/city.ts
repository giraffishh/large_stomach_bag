export function normalizeCityName(value: string): string {
  const normalizedValue = value.replace(/\s+/g, '').trim()

  if (!normalizedValue) {
    return ''
  }

  const embeddedCityMatch = normalizedValue.match(/(?:^|省|自治区|特别行政区)([^省市区县旗]+市)/)
  if (embeddedCityMatch?.[1]) {
    return embeddedCityMatch[1].replace(/市$/, '')
  }

  const municipalityMatch = normalizedValue.match(/(北京|上海|天津|重庆|香港|澳门)/)
  if (municipalityMatch?.[1]) {
    return municipalityMatch[1]
  }

  return normalizedValue.replace(/(特别行政区|自治区|自治州|地区|盟|省|市)$/, '')
}

export function isSameCity(cityA: string, cityB: string): boolean {
  const normalizedCityA = normalizeCityName(cityA)
  const normalizedCityB = normalizeCityName(cityB)

  if (!normalizedCityA || !normalizedCityB) {
    return false
  }

  return normalizedCityA === normalizedCityB
}

export function formatCityLabel(value: string): string {
  return normalizeCityName(value) || value.trim()
}
