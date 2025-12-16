import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, FileCode, X } from 'lucide-react';

interface ExportModalProps {
  data: any[];
  columns: string[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export default function ExportModal({ data, columns, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const exportFormats = [
    { id: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel format' },
    { id: 'json', label: 'JSON', icon: FileJson, description: 'JavaScript Object Notation' },
    { id: 'pdf', label: 'PDF', icon: FileCode, description: 'Portable Document Format' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      switch (selectedFormat) {
        case 'csv':
          await exportToCSV();
          break;
        case 'excel':
          await exportToExcel();
          break;
        case 'json':
          await exportToJSON();
          break;
        case 'pdf':
          await exportToPDF();
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    let csvContent = '';
    
    // Add headers
    if (includeHeaders) {
      csvContent += columns.map(col => `"${col}"`).join(',') + '\n';
    }
    
    // Add rows
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '""';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `export-${Date.now()}.csv`);
  };

  const exportToExcel = async () => {
    // Import exceljs dynamically
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Query Results');
    
    // Add headers with styling
    const headerRow = worksheet.addRow(columns);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007AFF' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data
    data.forEach(row => {
      const values = columns.map(col => row[col]);
      worksheet.addRow(values);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const length = cell.value ? String(cell.value).length : 10;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadFile(blob, `export-${Date.now()}.xlsx`);
  };

  const exportToJSON = async () => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadFile(blob, `export-${Date.now()}.json`);
  };

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Query Results', 14, 15);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    // Prepare table data
    const tableData = data.map(row => columns.map(col => String(row[col] ?? '-')));
    
    // Add table
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 28,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 122, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 247],
      },
    });
    
    // Download
    doc.save(`export-${Date.now()}.pdf`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl mx-4 rounded-[24px] border border-black/[0.06] overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-black/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-semibold text-[#111111]">Export Data</h2>
              <p className="text-sm text-[#86868B] mt-1">{data.length} rows • {columns.length} columns</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#86868B]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#111111] mb-3">Select Format</label>
            <div className="grid grid-cols-2 gap-3">
              {exportFormats.map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  onClick={() => setSelectedFormat(id as ExportFormat)}
                  className={`p-4 rounded-[16px] border-2 text-left transition-all ${
                    selectedFormat === id
                      ? 'border-[#007AFF] bg-[#007AFF]/5'
                      : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedFormat === id ? 'bg-[#007AFF] text-white' : 'bg-black/5 text-[#86868B]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#111111]">{label}</div>
                      <div className="text-xs text-[#86868B] mt-0.5">{description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-semibold text-[#111111] mb-3">Options</label>
            <label className="flex items-center gap-3 p-4 rounded-[16px] border border-black/10 hover:bg-black/5 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                className="w-5 h-5 rounded border-black/20 text-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30"
              />
              <div>
                <div className="text-sm font-medium text-[#111111]">Include Headers</div>
                <div className="text-xs text-[#86868B]">Add column names to the first row</div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-black/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[22px] text-sm font-medium text-[#111111] hover:bg-black/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-[22px] text-sm font-semibold shadow-lg hover:bg-[#0051D5] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
