export type PreviewPlatform = 'ios' | 'android'

export type ExportPreset = {
  platform: PreviewPlatform
  label: string
  size: number
  suffix: string
}

export const IOS_EXPORT_PRESETS: ExportPreset[] = [
  { platform: 'ios', label: 'App Store', size: 1024, suffix: 'ios-app-store-1024' },
  { platform: 'ios', label: 'iPad', size: 512, suffix: 'ios-ipad-512' },
  { platform: 'ios', label: 'iPhone', size: 180, suffix: 'ios-iphone-180' },
  { platform: 'ios', label: 'Notification', size: 60, suffix: 'ios-notification-60' },
]

export const ANDROID_EXPORT_PRESETS: ExportPreset[] = [
  { platform: 'android', label: 'Play Store', size: 512, suffix: 'android-play-store-512' },
  { platform: 'android', label: 'Adaptive', size: 192, suffix: 'android-adaptive-192' },
  { platform: 'android', label: 'Launcher', size: 96, suffix: 'android-launcher-96' },
  { platform: 'android', label: 'Notification', size: 48, suffix: 'android-notification-48' },
]

export function sanitizeProjectName(projectName: string) {
  const trimmed = projectName.trim().toLowerCase()
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'asset'
}

export function buildExportFilename(projectName: string, preset: ExportPreset) {
  return `${sanitizeProjectName(projectName)}-${preset.suffix}.png`
}

export function getExportPresetsForPlatform(platform: PreviewPlatform) {
  return platform === 'ios' ? IOS_EXPORT_PRESETS : ANDROID_EXPORT_PRESETS
}