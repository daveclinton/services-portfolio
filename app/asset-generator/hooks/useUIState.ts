import { useState } from 'react'

type ColorPickerTarget = 'bg' | 'fg' | 'shapeStroke' | 'shapeFill' | 'splash' | null

export function useUIState() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false)
  const [isTypographyOpen, setIsTypographyOpen] = useState(false)
  const [openColorPicker, setOpenColorPicker] = useState<ColorPickerTarget>(null)
  const [fontSearch, setFontSearch] = useState('')
  const [hoveredFontKey, setHoveredFontKey] = useState<string | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)

  const toggleMainMenu = () => {
    setIsMenuOpen((open) => !open)
    setOpenColorPicker(null)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
  }

  const toggleFontPicker = (currentFontKey: string) => {
    const nextOpen = !isFontPickerOpen
    setIsFontPickerOpen(nextOpen)
    setHoveredFontKey(currentFontKey)
    setOpenColorPicker(null)
    setIsMenuOpen(false)
    setIsTypographyOpen(false)
    if (!nextOpen) setFontSearch('')
  }

  const toggleTypography = () => {
    setIsTypographyOpen((open) => !open)
    setOpenColorPicker(null)
    setIsFontPickerOpen(false)
    setIsMenuOpen(false)
  }

  const toggleColorPicker = (target: ColorPickerTarget) => {
    setOpenColorPicker(openColorPicker === target ? null : target)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setIsMenuOpen(false)
  }

  const closeAllMenus = () => {
    setIsMenuOpen(false)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setOpenColorPicker(null)
  }

  return {
    isMenuOpen,
    setIsMenuOpen,
    isFontPickerOpen,
    isTypographyOpen,
    openColorPicker,
    fontSearch,
    setFontSearch,
    hoveredFontKey,
    setHoveredFontKey,
    isEditingText,
    setIsEditingText,
    toggleMainMenu,
    toggleFontPicker,
    toggleTypography,
    toggleColorPicker,
    closeAllMenus,
  }
}
