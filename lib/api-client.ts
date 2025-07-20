// Completely abstracted client library - no business logic exposed
interface ExtractOptions {
  language?: string;
  transcriptType?: 'auto' | 'manual';
}

interface FormatOptions {
  style: string;
  includeTimestamps?: boolean;
  paragraphLength?: string;
}

// Generic API client with no implementation details
export class TranscriptAPI {
  private static readonly ENDPOINT = '/api/v1/process';
  
  static async extract(url: string, options?: ExtractOptions) {
    const response = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extract',
        url,
        options: options || {}
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }
  
  static async format(data: Array<{text: string, timestamp?: string}>, options: FormatOptions) {
    const response = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'format',
        data,
        options
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Format failed');
    }
    
    // Handle streaming response for formatting
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return response;
    }
    
    return response.json();
  }
}