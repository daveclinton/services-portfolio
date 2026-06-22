import { describe, expect, it } from 'vitest'
import {
  ANDROID_EXPORT_PRESETS,
  IOS_EXPORT_PRESETS,
  buildExportFilename,
  getExportPresetsForPlatform,
  sanitizeProjectName,
} from './exportPresets'

describe('exportPresets', () => {
  it('sanitizes project names for filenames', () => {
    expect(sanitizeProjectName(' My Cool App! ')).toBe('my-cool-app')
    expect(sanitizeProjectName('   ')).toBe('asset')
  })

  it('builds platform-specific filenames', () => {
    expect(buildExportFilename('My App', IOS_EXPORT_PRESETS[0])).toBe(
      'my-app-ios-app-store-1024.png',
    )
    expect(buildExportFilename('My App', ANDROID_EXPORT_PRESETS[0])).toBe(
      'my-app-android-play-store-512.png',
    )
  })

  it('returns presets by platform', () => {
    expect(getExportPresetsForPlatform('ios')).toEqual(IOS_EXPORT_PRESETS)
    expect(getExportPresetsForPlatform('android')).toEqual(ANDROID_EXPORT_PRESETS)
  })
})