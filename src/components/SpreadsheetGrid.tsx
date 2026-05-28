import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  Bold,
  Columns3,
  Italic,
  PaintBucket,
  Palette,
  Rows3,
  Type,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { SpreadsheetCell, SpreadsheetCellAlign, SpreadsheetGridData } from '../types';

const DEFAULT_ROW_COUNT = 20;
const DEFAULT_COLUMN_COUNT = 8;
const MIN_ROW_COUNT = 8;
const MIN_COLUMN_COUNT = 4;
const TEXT_COLORS = ['#0f172a', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#7c3aed'];
const FILL_COLORS = ['#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#e2e8f0'];

function getColumnLabel(index: number) {
  let label = '';
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function getCellId(rowIndex: number, columnIndex: number) {
  return `${getColumnLabel(columnIndex)}${rowIndex + 1}`;
}

function parseCellId(cellId: string) {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { rowIndex: 0, columnIndex: 0 };

  const [, columnLabel, rowNumber] = match;
  const columnIndex = columnLabel.split('').reduce((total, character) => (
    total * 26 + character.charCodeAt(0) - 64
  ), 0) - 1;

  return {
    rowIndex: Math.max(0, Number(rowNumber) - 1),
    columnIndex: Math.max(0, columnIndex),
  };
}

export function createDefaultSpreadsheetData(): SpreadsheetGridData {
  return {
    rowCount: DEFAULT_ROW_COUNT,
    columnCount: DEFAULT_COLUMN_COUNT,
    cells: {},
  };
}

function normalizeGridData(data?: SpreadsheetGridData): SpreadsheetGridData {
  return {
    rowCount: Math.max(data?.rowCount || DEFAULT_ROW_COUNT, MIN_ROW_COUNT),
    columnCount: Math.max(data?.columnCount || DEFAULT_COLUMN_COUNT, MIN_COLUMN_COUNT),
    cells: data?.cells || {},
  };
}

function hasCellData(cell: SpreadsheetCell) {
  return Boolean(
    cell.value ||
    cell.bold ||
    cell.italic ||
    cell.align ||
    cell.textColor ||
    cell.backgroundColor,
  );
}

function cleanCell(cell: SpreadsheetCell) {
  const nextCell: SpreadsheetCell = { value: cell.value };

  if (cell.bold) nextCell.bold = true;
  if (cell.italic) nextCell.italic = true;
  if (cell.align) nextCell.align = cell.align;
  if (cell.textColor) nextCell.textColor = cell.textColor;
  if (cell.backgroundColor) nextCell.backgroundColor = cell.backgroundColor;

  return hasCellData(nextCell) ? nextCell : undefined;
}

interface SpreadsheetGridProps {
  value?: SpreadsheetGridData;
  onChange: (nextData: SpreadsheetGridData) => void;
}

export function SpreadsheetGrid({ value, onChange }: SpreadsheetGridProps) {
  const gridData = normalizeGridData(value);
  const [selectedCellId, setSelectedCellId] = useState(() => getCellId(0, 0));
  const selectedCell = gridData.cells[selectedCellId] || { value: '' };

  const setGridData = (nextData: SpreadsheetGridData) => {
    onChange(normalizeGridData(nextData));
  };

  const updateCell = (cellId: string, updates: Partial<SpreadsheetCell>) => {
    const existingCell = gridData.cells[cellId] || { value: '' };
    const nextCells = { ...gridData.cells };
    const nextCell = cleanCell({ ...existingCell, ...updates, value: updates.value ?? existingCell.value });

    if (nextCell) {
      nextCells[cellId] = nextCell;
    } else {
      delete nextCells[cellId];
    }

    setGridData({ ...gridData, cells: nextCells });
  };

  const updateSelectedCellStyle = (updates: Partial<SpreadsheetCell>) => {
    updateCell(selectedCellId, updates);
  };

  const toggleSelectedCellStyle = (style: 'bold' | 'italic') => {
    updateSelectedCellStyle({ [style]: !selectedCell[style] });
  };

  const updateSelectedCellAlignment = (align: SpreadsheetCellAlign) => {
    updateSelectedCellStyle({ align: selectedCell.align === align ? undefined : align });
  };

  const addRow = () => {
    setGridData({ ...gridData, rowCount: gridData.rowCount + 1 });
  };

  const addColumn = () => {
    setGridData({ ...gridData, columnCount: gridData.columnCount + 1 });
  };

  const focusCell = (rowIndex: number, columnIndex: number) => {
    window.setTimeout(() => {
      const nextCellId = getCellId(rowIndex, columnIndex);
      document.querySelector<HTMLInputElement>(`[data-cell-id="${nextCellId}"]`)?.focus();
    }, 0);
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number,
  ) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const nextRowIndex = rowIndex + 1;

    if (nextRowIndex >= gridData.rowCount) {
      setGridData({ ...gridData, rowCount: gridData.rowCount + 1 });
    }

    focusCell(nextRowIndex, columnIndex);
  };

  const handlePaste = (
    event: ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number,
  ) => {
    const pastedText = event.clipboardData.getData('text/plain');
    if (!pastedText.includes('\t') && !pastedText.includes('\n')) return;

    event.preventDefault();
    const pastedRows = pastedText.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    const nextCells = { ...gridData.cells };
    let maxRowIndex = rowIndex;
    let maxColumnIndex = columnIndex;

    pastedRows.forEach((rowText, pastedRowIndex) => {
      rowText.split('\t').forEach((cellValue, pastedColumnIndex) => {
        const targetRowIndex = rowIndex + pastedRowIndex;
        const targetColumnIndex = columnIndex + pastedColumnIndex;
        const cellId = getCellId(targetRowIndex, targetColumnIndex);
        const existingCell = nextCells[cellId] || { value: '' };
        const nextCell = cleanCell({ ...existingCell, value: cellValue });

        if (nextCell) {
          nextCells[cellId] = nextCell;
        } else {
          delete nextCells[cellId];
        }

        maxRowIndex = Math.max(maxRowIndex, targetRowIndex);
        maxColumnIndex = Math.max(maxColumnIndex, targetColumnIndex);
      });
    });

    setGridData({
      rowCount: Math.max(gridData.rowCount, maxRowIndex + 1),
      columnCount: Math.max(gridData.columnCount, maxColumnIndex + 1),
      cells: nextCells,
    });
  };

  const rows = Array.from({ length: gridData.rowCount });
  const columns = Array.from({ length: gridData.columnCount });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex h-8 min-w-16 items-center justify-center rounded border border-slate-200 bg-white px-2 font-mono text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {selectedCellId}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
          <Type className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            aria-label={`${selectedCellId} value`}
            value={selectedCell.value}
            onChange={(event) => updateCell(selectedCellId, { value: event.target.value })}
            className="h-8 min-w-40 flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none dark:text-slate-200"
          />
        </div>
        <div className="flex items-center overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => toggleSelectedCellStyle('bold')}
            className={cn(
              'flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              selectedCell.bold && 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
            )}
            title="Bold"
            aria-label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggleSelectedCellStyle('italic')}
            className={cn(
              'flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
              selectedCell.italic && 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
            )}
            title="Italic"
            aria-label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {[
            { align: 'left' as const, icon: AlignHorizontalJustifyStart, title: 'Align Left' },
            { align: 'center' as const, icon: AlignHorizontalJustifyCenter, title: 'Align Center' },
            { align: 'right' as const, icon: AlignHorizontalJustifyEnd, title: 'Align Right' },
          ].map(({ align, icon: Icon, title }, index) => (
            <button
              key={align}
              type="button"
              onClick={() => updateSelectedCellAlignment(align)}
              className={cn(
                'flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                index > 0 && 'border-l border-slate-200 dark:border-slate-700',
                selectedCell.align === align && 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
              )}
              title={title}
              aria-label={title}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          <Palette className="h-3.5 w-3.5 text-slate-400" />
          {TEXT_COLORS.map((color) => (
            <button
              key={`text-${color}`}
              type="button"
              onClick={() => updateSelectedCellStyle({ textColor: color })}
              className={cn(
                'h-5 w-5 rounded-full border border-slate-200 ring-offset-2 transition-all dark:border-slate-700 dark:ring-offset-slate-900',
                selectedCell.textColor === color && 'ring-2 ring-orange-500',
              )}
              style={{ backgroundColor: color }}
              title="Text Color"
              aria-label={`Text color ${color}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          <PaintBucket className="h-3.5 w-3.5 text-slate-400" />
          {FILL_COLORS.map((color) => (
            <button
              key={`fill-${color}`}
              type="button"
              onClick={() => updateSelectedCellStyle({ backgroundColor: color })}
              className={cn(
                'h-5 w-5 rounded border border-slate-200 ring-offset-2 transition-all dark:border-slate-700 dark:ring-offset-slate-900',
                selectedCell.backgroundColor === color && 'ring-2 ring-orange-500',
              )}
              style={{ backgroundColor: color }}
              title="Fill Color"
              aria-label={`Fill color ${color}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="flex h-8 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Rows3 className="h-3.5 w-3.5" />
          Row
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="flex h-8 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Columns3 className="h-3.5 w-3.5" />
          Column
        </button>
      </div>
      <div className="custom-scrollbar flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-8 w-12 border-b border-r border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              {columns.map((_, columnIndex) => (
                <th
                  key={getColumnLabel(columnIndex)}
                  className="sticky top-0 z-10 h-8 min-w-36 border-b border-r border-slate-200 bg-slate-100 px-2 text-center font-mono text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {getColumnLabel(columnIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <th className="sticky left-0 z-10 h-9 w-12 border-b border-r border-slate-200 bg-slate-100 text-center font-mono text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {rowIndex + 1}
                </th>
                {columns.map((_, columnIndex) => {
                  const cellId = getCellId(rowIndex, columnIndex);
                  const cell = gridData.cells[cellId] || { value: '' };
                  const isSelected = selectedCellId === cellId;

                  return (
                    <td
                      key={cellId}
                      className={cn(
                        'h-9 min-w-36 border-b border-r border-slate-200 p-0 dark:border-slate-700',
                        isSelected && 'relative z-[1] outline outline-2 outline-orange-500',
                      )}
                    >
                      <input
                        data-cell-id={cellId}
                        aria-label={`Cell ${cellId}`}
                        value={cell.value}
                        onFocus={() => setSelectedCellId(cellId)}
                        onChange={(event) => updateCell(cellId, { value: event.target.value })}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, columnIndex)}
                        onPaste={(event) => handlePaste(event, rowIndex, columnIndex)}
                        className="h-9 w-full bg-white px-2 text-xs font-medium text-slate-700 outline-none dark:bg-slate-900 dark:text-slate-200"
                        style={{
                          backgroundColor: cell.backgroundColor,
                          color: cell.textColor,
                          fontWeight: cell.bold ? 700 : 500,
                          fontStyle: cell.italic ? 'italic' : 'normal',
                          textAlign: cell.align || 'left',
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
