import React, { useState, useRef } from 'react';
import { Download, Upload, FileDown, FileUp, AlertCircle, CheckCircle, X, Calendar, Package, BarChart3, Repeat, BookOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useStudyPacks } from '../context/StudyPackContext';
import { ExportService, type ExportOptions, type ImportValidationResult } from '../lib/exportService';

interface ExportImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportImportModal({ open, onOpenChange }: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importData, setImportData] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { studyPacks } = useStudyPacks();
  const { toast } = useToast();

  // Export options state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeStudyPacks: true,
    includeProgress: true,
    includeAnalytics: true,
    includeSpacedRepetition: true,
    includeJournal: true,
    selectedStudyPackIds: [],
    dateRange: undefined
  });

  const [selectAllStudyPacks, setSelectAllStudyPacks] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const handleExportOptionChange = (option: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleStudyPackSelection = (studyPackId: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      selectedStudyPackIds: checked
        ? [...(prev.selectedStudyPackIds || []), studyPackId]
        : (prev.selectedStudyPackIds || []).filter(id => id !== studyPackId)
    }));
  };

  const handleSelectAllStudyPacks = (checked: boolean) => {
    setSelectAllStudyPacks(checked);
    setExportOptions(prev => ({
      ...prev,
      selectedStudyPackIds: checked ? studyPacks.map(pack => pack.id) : []
    }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));

    if (useDateRange && dateRange.start && dateRange.end) {
      setExportOptions(prev => ({
        ...prev,
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        }
      }));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const finalOptions = { ...exportOptions };
      
      if (useDateRange && dateRange.start && dateRange.end) {
        finalOptions.dateRange = {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        };
      }

      const exportData = await ExportService.exportData(finalOptions);
      const filename = `study-forge-export-${new Date().toISOString().split('T')[0]}.json`;
      
      await ExportService.downloadExport(exportData, filename);
      
      toast({
        title: "Export successful!",
        description: `Your data has been exported to ${filename}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setImportData(content);
      
      const validation = await ExportService.validateImportData(content);
      setValidationResult(validation);
    } catch (error) {
      console.error('File read failed:', error);
      toast({
        title: "File read failed",
        description: "Could not read the selected file",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!importData || !validationResult?.isValid) return;

    setIsImporting(true);
    try {
      const result = await ExportService.importData(importData, overwriteExisting);
      
      if (result.success) {
        const totalImported = Object.values(result.imported).reduce((sum, count) => sum + count, 0);
        const totalSkipped = Object.values(result.skipped).reduce((sum, count) => sum + count, 0);
        
        toast({
          title: "Import successful!",
          description: `Imported ${totalImported} items${totalSkipped > 0 ? `, skipped ${totalSkipped} existing items` : ''}`,
        });

        // Refresh the page to show imported data
        window.location.reload();
      } else {
        toast({
          title: "Import completed with errors",
          description: `Some data could not be imported. Check the console for details.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setImportData('');
    setValidationResult(null);
    setOverwriteExisting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'studyPacks':
        return <Package className="h-4 w-4" />;
      case 'progress':
        return <BarChart3 className="h-4 w-4" />;
      case 'analytics':
        return <BarChart3 className="h-4 w-4" />;
      case 'spacedRepetition':
        return <Repeat className="h-4 w-4" />;
      case 'journal':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileDown className="h-5 w-5" />
            <span>Export & Import Data</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Data to Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeStudyPacks"
                      checked={exportOptions.includeStudyPacks}
                      onCheckedChange={(checked) => handleExportOptionChange('includeStudyPacks', checked)}
                    />
                    <Label htmlFor="includeStudyPacks" className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Study Packs ({studyPacks.length})</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeProgress"
                      checked={exportOptions.includeProgress}
                      onCheckedChange={(checked) => handleExportOptionChange('includeProgress', checked)}
                    />
                    <Label htmlFor="includeProgress" className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Progress Data</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeAnalytics"
                      checked={exportOptions.includeAnalytics}
                      onCheckedChange={(checked) => handleExportOptionChange('includeAnalytics', checked)}
                    />
                    <Label htmlFor="includeAnalytics" className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Analytics Data</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSpacedRepetition"
                      checked={exportOptions.includeSpacedRepetition}
                      onCheckedChange={(checked) => handleExportOptionChange('includeSpacedRepetition', checked)}
                    />
                    <Label htmlFor="includeSpacedRepetition" className="flex items-center space-x-2">
                      <Repeat className="h-4 w-4" />
                      <span>Spaced Repetition</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeJournal"
                      checked={exportOptions.includeJournal}
                      onCheckedChange={(checked) => handleExportOptionChange('includeJournal', checked)}
                    />
                    <Label htmlFor="includeJournal" className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4" />
                      <span>Journal Entries</span>
                    </Label>
                  </div>
                </div>

                {/* Study Pack Selection */}
                {exportOptions.includeStudyPacks && studyPacks.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Select Study Packs (optional)</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Leave empty to export all study packs
                    </p>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="selectAllPacks"
                        checked={selectAllStudyPacks}
                        onCheckedChange={handleSelectAllStudyPacks}
                      />
                      <Label htmlFor="selectAllPacks" className="text-sm">
                        Select All ({studyPacks.length})
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {studyPacks.map((pack) => (
                        <div key={pack.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pack-${pack.id}`}
                            checked={exportOptions.selectedStudyPackIds?.includes(pack.id) || false}
                            onCheckedChange={(checked) => handleStudyPackSelection(pack.id, checked as boolean)}
                          />
                          <Label htmlFor={`pack-${pack.id}`} className="text-sm truncate">
                            {pack.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range Selection */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="useDateRange"
                      checked={useDateRange}
                      onCheckedChange={setUseDateRange}
                    />
                    <Label htmlFor="useDateRange" className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Filter by Date Range</span>
                    </Label>
                  </div>

                  {useDateRange && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => handleDateRangeChange('start', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-sm">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => handleDateRangeChange('end', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!validationResult ? (
                  <div>
                    <Label htmlFor="importFile" className="text-sm font-medium">
                      Select Export File
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose a JSON file exported from AI Study Forge
                    </p>
                    <input
                      ref={fileInputRef}
                      id="importFile"
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Validation Results */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        {validationResult.isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <h4 className="font-medium">
                          {validationResult.isValid ? 'File Valid' : 'Validation Issues Found'}
                        </h4>
                      </div>

                      {/* Data Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                        {Object.entries(validationResult.dataStats).map(([key, count]) => (
                          <div key={key} className="text-center p-2 bg-muted rounded">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              {getDataTypeIcon(key)}
                              <span className="text-lg font-bold">{count}</span>
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Errors */}
                      {validationResult.errors.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-red-600 mb-2">Errors:</h5>
                          <ul className="text-sm text-red-600 space-y-1">
                            {validationResult.errors.map((error, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Warnings */}
                      {validationResult.warnings.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-yellow-600 mb-2">Warnings:</h5>
                          <ul className="text-sm text-yellow-600 space-y-1">
                            {validationResult.warnings.map((warning, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Compatibility Issues */}
                      {validationResult.compatibilityIssues.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-orange-600 mb-2">Compatibility Issues:</h5>
                          <ul className="text-sm text-orange-600 space-y-1">
                            {validationResult.compatibilityIssues.map((issue, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Import Options */}
                    {validationResult.isValid && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">Import Options</h4>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="overwriteExisting"
                            checked={overwriteExisting}
                            onCheckedChange={setOverwriteExisting}
                          />
                          <Label htmlFor="overwriteExisting" className="text-sm">
                            Overwrite existing data with same IDs
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          If unchecked, existing data will be preserved and only new items will be imported
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                {validationResult && (
                  <Button variant="outline" onClick={resetImport}>
                    Choose Different File
                  </Button>
                )}
              </div>
              
              {validationResult?.isValid && (
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
