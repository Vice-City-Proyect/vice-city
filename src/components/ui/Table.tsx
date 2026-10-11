import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  renderCard?: (row: T) => ReactNode;
  minWidth?: string;
}

export function Table<T>({ columns, data, rowKey, renderCard, minWidth = '48rem' }: TableProps<T>) {
  if (data.length === 0) {
    return null;
  }

  return (
    <>
      {renderCard && (
        <div className="flex flex-col gap-3 md:hidden">
          {data.map((row) => (
            <div key={rowKey(row)}>{renderCard(row)}</div>
          ))}
        </div>
      )}

      <div className={`${renderCard ? 'hidden md:block' : 'block'} overflow-x-auto`}>
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-text-main/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-text-main/5 transition-colors last:border-0 hover:bg-club-bg/60"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-4 align-middle text-sm text-text-main ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
