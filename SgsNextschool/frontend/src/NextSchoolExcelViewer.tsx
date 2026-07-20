import React from 'react';

interface GridData {
  cols: string[];
  row0: string[];
  row1: string[];
  data_rows: { student_id: string; cells: string[]; row_idx: number }[];
}

interface Highlight {
  page: number; // For Excel, this is row_idx
  bbox: { col_idx: number };
  color: string;
}

interface Props {
  gridData: GridData;
  highlights: Highlight[];
}

export default function NextSchoolExcelViewer({ gridData, highlights }: Props) {
  const getCellColor = (rowIdx: number, colIdx: number) => {
    // Find highlight matching this row and col
    const hl = highlights.find(h => h.page === rowIdx && h.bbox?.col_idx === colIdx);
    if (hl) {
      if (hl.color === 'red') return 'bg-rose-200 border-rose-500 text-rose-900 font-bold shadow-inner';
      if (hl.color === 'yellow') return 'bg-amber-200 border-amber-500 text-amber-900 font-bold shadow-inner';
      return 'bg-emerald-100 border-emerald-400 text-emerald-800 font-medium shadow-sm'; // default to green
    }
    return '';
  };

  return (
    <div className="p-4 w-full h-full overflow-auto bg-white rounded-lg shadow-inner">
      <table className="w-full text-xs text-left border-collapse border border-slate-300">
        <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
          <tr>
            {gridData.cols.map((col, idx) => (
              <th key={idx} className={`px-1 py-2 border border-slate-300 text-center font-bold whitespace-pre-wrap break-words min-w-[40px] max-w-[100px] leading-tight ${idx === 2 ? 'min-w-[140px]' : ''}`}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Row 0 (Subunit Names) */}
          <tr className="bg-slate-50">
            {gridData.row0.map((cell, idx) => (
              <td key={`r0-${idx}`} className={`px-1 py-1 border border-slate-300 text-center font-medium leading-tight whitespace-pre-wrap break-words ${getCellColor(0, idx)}`}>
                {cell}
              </td>
            ))}
          </tr>
          {/* Row 1 (Max Scores) */}
          <tr className="bg-orange-50 font-bold border-b-2 border-slate-400">
            {gridData.row1.map((cell, idx) => (
              <td key={`r1-${idx}`} className={`px-1 py-1 border border-slate-300 text-center text-orange-800 ${getCellColor(1, idx)}`}>
                {cell}
              </td>
            ))}
          </tr>
          {/* Data Rows */}
          {gridData.data_rows.map((row) => (
            <tr key={row.row_idx} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
              {row.cells.map((cell, idx) => (
                <td 
                  key={`r${row.row_idx}-${idx}`} 
                  className={`px-1 py-1 border border-slate-300 text-center whitespace-pre-wrap break-words ${idx === 2 ? 'text-left font-medium' : ''} ${getCellColor(row.row_idx, idx)}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
