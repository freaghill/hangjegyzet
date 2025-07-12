import { Input } from './input'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-20 cursor-pointer"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1"
      />
    </div>
  )
}