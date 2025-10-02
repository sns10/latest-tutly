import { useState } from 'react';
import MaterialsManager from '@/components/MaterialsManager';

export default function MaterialsPage() {
  const [currentClass, setCurrentClass] = useState<string>('8th');

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Study Materials</h2>
            <p className="text-muted-foreground">Upload and manage notes and PYQs</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Class:</span>
            <select
              value={currentClass}
              onChange={(e) => setCurrentClass(e.target.value)}
              className="border rounded px-3 py-2"
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
