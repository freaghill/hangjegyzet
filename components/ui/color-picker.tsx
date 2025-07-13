'use client'

import { useState } from 'react'
import { Input } from './input'
import { Label } from './label'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'
import { Palette } from 'lucide-react'

export interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

const presetColors = [
  '#2563eb', // blue-600
  '#3b82f6', // blue-500
  '#60a5fa', // blue-400
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#64748b', // slate-500
]

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  const handleColorChange = (color: string) => {
    setInputValue(color)
    onChange(color)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
      onChange(newValue)
    }
  }

  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2 mt-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-10 h-10 p-0 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Szín választása</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <div>
                <Label>Előre beállított színek</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded border-2 border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="custom-color">Egyéni szín</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="custom-color"
                    type="color"
                    value={inputValue}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#2563eb"
          className="flex-1"
        />
      </div>
    </div>
  )
}