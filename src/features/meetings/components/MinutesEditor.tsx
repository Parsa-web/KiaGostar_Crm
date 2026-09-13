import type { ReactNode } from 'react'
import { Button } from '../../../components/ui'

const TOOLS: readonly { id: string; label: string; block: string }[] = [
  { id: 'heading', label: 'عنوان', block: '### ' },
  { id: 'bold', label: 'پررنگ', block: '**متن**' },
  { id: 'bullet', label: 'نشانه‌دار', block: '- ' },
  { id: 'numbered', label: 'شماره‌دار', block: '1. ' },
  { id: 'quote', label: 'نقل‌قول', block: '> ' },
  { id: 'hr', label: 'خط‌جداکننده', block: '---' },
]

export interface MinutesEditorProps {
  value: string
  onChange(value: string): void
  disabled?: boolean
  canUndo?: boolean
  canRedo?: boolean
  onUndo?(): void
  onRedo?(): void
  saved?: boolean
  footer?: ReactNode
}

/** RTL markdown minutes editor with toolbar, history and save state. */
export function MinutesEditor({ value, onChange, disabled = false, canUndo, canRedo, onUndo, onRedo, saved = true, footer }: MinutesEditorProps) {
  const applyBlock = (block: string) => {
    if (disabled) return
    onChange(value ? `${value}\n${block}` : block)
  }
  const words = value.trim() ? value.trim().split(/\s+/).length : 0
  return <div className="meeting-live__editor">
    <div className="meeting-live__editor-toolbar">
      <span className="meeting-live__editor-tool">{saved ? 'ذخیره شد' : 'ذخیره نشده'}</span>
      <div className="meeting-live__editor-actions">
        <Button size="sm" variant="ghost" disabled={disabled || !canUndo} onClick={onUndo}>بازگشت</Button>
        <Button size="sm" variant="ghost" disabled={disabled || !canRedo} onClick={onRedo}>برگشت</Button>
      </div>
    </div>
    <div className="meeting-live__editor-tools">
      {TOOLS.map((tool) => <Button key={tool.id} size="sm" variant="outline" disabled={disabled} onClick={() => applyBlock(tool.block)}>{tool.label}</Button>)}
    </div>
    <textarea
      dir="rtl"
      className="meeting-live__editor-textarea"
      aria-label="ویرایشگر صورت‌جلسه"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="پیش‌نویس صورت‌جلسه را اینجا بنویسید یا با صدای جلسه پیاده‌سازی کنید…"
      disabled={disabled}
      spellCheck={false}
    />
    <div className="meeting-live__editor-footer">
      <span>{words} واژه</span>
      {footer}
    </div>
  </div>
}