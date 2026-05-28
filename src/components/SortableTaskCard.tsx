import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { Project, Task } from '../types';
import { TaskItem } from './TaskItem';
import { cn } from '../lib/utils';

interface SortableTaskCardProps {
  task: Task;
  project: Project;
  isHighlighted: boolean;
  toggleTask: (task: Task) => void | Promise<void>;
  setEditingTask: (task: Task) => void;
  onDelete: () => void;
}

export function SortableTaskCard({
  task,
  project,
  isHighlighted,
  toggleTask,
  setEditingTask,
  onDelete,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 40 : undefined,
      }}
      className={cn(
        'relative h-full',
        isDragging && 'opacity-80 shadow-2xl ring-2 ring-orange-500/20 rounded-xl bg-white dark:bg-slate-900',
      )}
    >
      <TaskItem
        task={task}
        dragHandleProps={{ ...attributes, ...listeners }}
        isHighlighted={isHighlighted}
        isDragging={isDragging}
        toggleTask={toggleTask}
        setEditingTask={setEditingTask}
        onDelete={onDelete}
        project={project}
      />
    </div>
  );
}
