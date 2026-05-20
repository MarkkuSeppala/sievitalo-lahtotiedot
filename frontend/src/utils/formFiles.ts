export interface PendingFormFile {
  fieldName: string;
  file: File;
}

export function collectPendingFiles(fileInputs: Record<string, File[]>): PendingFormFile[] {
  const result: PendingFormFile[] = [];
  for (const [fieldName, fileList] of Object.entries(fileInputs)) {
    for (const file of fileList) {
      result.push({ fieldName, file });
    }
  }
  return result;
}

export function appendPendingFilesToFormData(formData: FormData, pendingFiles: PendingFormFile[]): void {
  const fileFields: string[] = [];
  for (const { fieldName, file } of pendingFiles) {
    formData.append('files', file);
    fileFields.push(fieldName);
  }
  formData.append('fileFields', JSON.stringify(fileFields));
}
