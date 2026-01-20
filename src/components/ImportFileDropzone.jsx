'use client';

import { forwardRef } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * File dropzone component for CSV upload.
 * Shows file selection area with drag/drop support.
 */
const ImportFileDropzone = forwardRef(function ImportFileDropzone(
  { file, previewData, onFileChange, inputRef },
  ref
) {
  const t = useTranslations();

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
        transition-colors
        ${file ? 'border-success bg-success/5' : 'border-warm-gray/30 hover:border-accent hover:bg-accent/5'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={onFileChange}
        className="hidden"
      />

      {file ? (
        <div className="space-y-2">
          <FileSpreadsheet className="w-12 h-12 text-success mx-auto" />
          <p className="text-sm text-success font-medium">{file.name}</p>
          {previewData && (
            <p className="text-xs text-warm-gray">
              {previewData.totalRows} {t('unsorted.rowsFound') || 'rows found'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <FileSpreadsheet className="w-12 h-12 text-warm-gray mx-auto opacity-50" />
          <p className="text-warm-gray">{t('unsorted.dropOrClick')}</p>
          <p className="text-xs text-warm-gray/70">
            CSV {t('unsorted.filesOnly') || 'files only'}
          </p>
        </div>
      )}
    </div>
  );
});

export default ImportFileDropzone;
