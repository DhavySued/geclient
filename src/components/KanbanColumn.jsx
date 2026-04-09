import { Droppable } from '@hello-pangea/dnd'

export default function KanbanColumn({ column, children, colorConfig }) {
  const { bg, border, text, dot, headerBg } = colorConfig

  return (
    <div className={`kanban-column`}>
      {/* Column Header */}
      <div className={`rounded-xl px-4 py-3 ${headerBg} border ${border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <span className={`text-sm font-semibold ${text}`}>{column.label}</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bg} ${text} border ${border}`}>
            {column.clients.length}
          </span>
        </div>
        {column.description && (
          <p className="text-xs text-gray-500 mt-1 ml-4">{column.description}</p>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 min-h-[120px] rounded-xl p-2 transition-colors duration-150 ${
              snapshot.isDraggingOver
                ? `${bg} border-2 ${border} border-dashed`
                : 'border-2 border-transparent'
            }`}
          >
            {children}
            {provided.placeholder}
            {column.clients.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-700">
                <p className="text-xs text-gray-600">Sem clientes</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
