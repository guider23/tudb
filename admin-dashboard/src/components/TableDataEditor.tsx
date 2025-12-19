import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Edit2, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

interface ColumnSchema {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
}

interface TableData {
  tableName: string;
  schema: ColumnSchema[];
  data: Record<string, any>[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

interface EditingCell {
  rowIndex: number;
  columnName: string;
}

interface Props {
  tableName: string;
}

export default function TableDataEditor({ tableName }: Props) {
  const { getToken } = useAuth();
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editedRows, setEditedRows] = useState<Map<number, Record<string, any>>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 50;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    loadTableData();
  }, [tableName, page]);

  const loadTableData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const offset = page * limit;
      
      const response = await fetch(
        `${API_URL}/api/inspect/table/${tableName}?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load table data');
      }

      const data = await response.json();
      setTableData(data);
      setEditedRows(new Map()); // Clear edits when loading new data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPrimaryKeyValue = (row: Record<string, any>): Record<string, any> => {
    if (!tableData) return {};
    
    const primaryKey: Record<string, any> = {};
    tableData.schema.forEach((col) => {
      if (col.isPrimaryKey) {
        primaryKey[col.name] = row[col.name];
      }
    });
    return primaryKey;
  };

  const handleCellEdit = (rowIndex: number, columnName: string, value: any) => {
    const newEditedRows = new Map(editedRows);
    const currentRow = newEditedRows.get(rowIndex) || {};
    currentRow[columnName] = value;
    newEditedRows.set(rowIndex, currentRow);
    setEditedRows(newEditedRows);
  };

  const handleSaveRow = async (rowIndex: number) => {
    if (!tableData || !editedRows.has(rowIndex)) return;

    const originalRow = tableData.data[rowIndex];
    const updates = editedRows.get(rowIndex)!;
    const primaryKey = getPrimaryKeyValue(originalRow);

    if (Object.keys(primaryKey).length === 0) {
      setError('Cannot update row: No primary key found');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/inspect/table/${tableName}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            primaryKey,
            updates,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update row');
      }

      // Remove from edited rows
      const newEditedRows = new Map(editedRows);
      newEditedRows.delete(rowIndex);
      setEditedRows(newEditedRows);

      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Reload data to show updated values
      await loadTableData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (rowIndex: number) => {
    const newEditedRows = new Map(editedRows);
    newEditedRows.delete(rowIndex);
    setEditedRows(newEditedRows);
    setEditingCell(null);
  };

  const getCellValue = (row: Record<string, any>, rowIndex: number, columnName: string): any => {
    const editedRow = editedRows.get(rowIndex);
    if (editedRow && columnName in editedRow) {
      return editedRow[columnName];
    }
    return row[columnName];
  };

  const isRowEdited = (rowIndex: number): boolean => {
    return editedRows.has(rowIndex);
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div>
          <p className="font-medium text-red-900">Error</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No data found in this table.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success message */}
      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-900 font-medium">Changes saved successfully!</p>
        </div>
      )}

      {/* Table info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Showing {tableData.pagination.offset + 1} - {Math.min(tableData.pagination.offset + limit, tableData.pagination.total)} of {tableData.pagination.total} rows
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!tableData.pagination.hasMore}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              {tableData.schema.map((col) => (
                <th
                  key={col.name}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2">
                    {col.name}
                    {col.isPrimaryKey && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        PK
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 normal-case font-normal mt-0.5">
                    {col.type}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.data.map((row, rowIndex) => {
              const isEdited = isRowEdited(rowIndex);
              
              return (
                <tr
                  key={rowIndex}
                  className={isEdited ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isEdited ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSaveRow(rowIndex)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                          title="Save changes"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCancelEdit(rowIndex)}
                          disabled={saving}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingCell({ rowIndex, columnName: tableData.schema[0].name })}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit row"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                  {tableData.schema.map((col) => {
                    const cellValue = getCellValue(row, rowIndex, col.name);
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnName === col.name;
                    const isPrimaryKey = col.isPrimaryKey;

                    return (
                      <td
                        key={col.name}
                        className="px-4 py-3 text-sm text-gray-900"
                        onClick={() => {
                          if (!isPrimaryKey) {
                            setEditingCell({ rowIndex, columnName: col.name });
                          }
                        }}
                      >
                        {isEditing && !isPrimaryKey ? (
                          <input
                            type="text"
                            value={formatCellValue(cellValue)}
                            onChange={(e) => handleCellEdit(rowIndex, col.name, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div
                            className={`${!isPrimaryKey ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded' : 'px-2 py-1'} ${
                              isPrimaryKey ? 'text-gray-500 font-mono' : ''
                            }`}
                          >
                            {formatCellValue(cellValue)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">PK</span>
          <span>Primary Key (not editable)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">Row</span>
          <span>Edited row (click save to apply)</span>
        </div>
      </div>
    </div>
  );
}
