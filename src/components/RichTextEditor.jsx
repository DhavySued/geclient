import { useRef, useEffect } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, RotateCcw,
} from 'lucide-react'

const TEXT_COLORS = [
  { label: 'Branco',   value: '#f9fafb' },
  { label: 'Cinza',    value: '#9ca3af' },
  { label: 'Amarelo',  value: '#fbbf24' },
  { label: 'Verde',    value: '#34d399' },
  { label: 'Azul',     value: '#60a5fa' },
  { label: 'Vermelho', value: '#f87171' },
  { label: 'Rosa',     value: '#f472b6' },
  { label: 'Roxo',     value: '#a78bfa' },
]

function ToolbarBtn({ onMouseDown, title, active, children }) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className={`p-1.5 rounded transition-all ${
        active
          ? 'bg-brand-500/20 text-brand-300'
          : 'text-gray-400 hover:text-gray-900 hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-4 bg-gray-700 mx-0.5 flex-shrink-0" />
}

export default function RichTextEditor({ value, onChange, placeholder = 'Digite aqui…', minHeight = 80 }) {
  const editorRef   = useRef(null)
  const initialized = useRef(false)

  // Set initial HTML once — don't track as controlled to avoid cursor jumps
  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = value || ''
      initialized.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function exec(cmd, val = null) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    onChange(editorRef.current?.innerHTML || '')
  }

  function handleMouseDown(cmd, val = null) {
    return (e) => {
      e.preventDefault() // keep editor focused
      exec(cmd, val)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-brand-500/40 transition-colors bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-white/90 flex-wrap">
        <ToolbarBtn onMouseDown={handleMouseDown('bold')}      title="Negrito (Ctrl+B)"><Bold size={13} /></ToolbarBtn>
        <ToolbarBtn onMouseDown={handleMouseDown('italic')}    title="Itálico (Ctrl+I)"><Italic size={13} /></ToolbarBtn>
        <ToolbarBtn onMouseDown={handleMouseDown('underline')} title="Sublinhado (Ctrl+U)"><Underline size={13} /></ToolbarBtn>

        <Sep />

        <ToolbarBtn onMouseDown={handleMouseDown('insertUnorderedList')} title="Lista com marcadores"><List size={13} /></ToolbarBtn>
        <ToolbarBtn onMouseDown={handleMouseDown('insertOrderedList')}   title="Lista numerada"><ListOrdered size={13} /></ToolbarBtn>

        <Sep />

        <ToolbarBtn onMouseDown={handleMouseDown('justifyLeft')}   title="Alinhar à esquerda"><AlignLeft size={13} /></ToolbarBtn>
        <ToolbarBtn onMouseDown={handleMouseDown('justifyCenter')} title="Centralizar"><AlignCenter size={13} /></ToolbarBtn>

        <Sep />

        {/* Color swatches */}
        <div className="flex items-center gap-1">
          {TEXT_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              title={`Cor: ${c.label}`}
              onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c.value) }}
              style={{ backgroundColor: c.value }}
              className="w-3.5 h-3.5 rounded-sm border border-black/30 hover:scale-125 transition-transform flex-shrink-0"
            />
          ))}
        </div>

        <Sep />

        {/* Remove formatting */}
        <ToolbarBtn onMouseDown={handleMouseDown('removeFormat')} title="Remover formatação">
          <RotateCcw size={12} />
        </ToolbarBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder}
        className="rich-editor p-3 text-sm text-gray-700 focus:outline-none overflow-y-auto scrollbar-thin"
        style={{ minHeight: `${minHeight}px`, maxHeight: '240px' }}
      />
    </div>
  )
}
