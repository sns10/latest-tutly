import { useState } from 'react';
import MaterialsManager from '@/components/MaterialsManager';

export default function MaterialsPage() {
  const [currentClass, setCurrentClass] = useState<string>('8th');

  return (
    <div className="w-full px-3 py-4 sm:px-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold">Study Materials</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Upload and manage notes and PYQs</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium">Class:</span>
            <select
              value={currentClass}
              onChange={(e) => setCurrentClass(e.target.value)}
              className="border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
            >
              <option value="8th">8th</option>
              <option value="9th">9th</option>
              <option value="10th">10th</option>
              <option value="11th">11th</option>
            </select>
          </div>
        </div>
        <MaterialsManager currentClass={currentClass} />
      </div>
    </div>
  );
}
