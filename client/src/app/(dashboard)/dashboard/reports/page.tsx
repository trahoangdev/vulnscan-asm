'use client';

import { FileText, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download security reports.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-muted-foreground">Reports coming soon</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-2">
            PDF and CSV report generation will be available in a future update.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <Clock className="h-3 w-3" />
            Phase 2 feature
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
