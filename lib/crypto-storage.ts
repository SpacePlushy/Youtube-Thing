// Enhanced encrypted storage using Web Crypto API
export class CryptoStorage {
  private static readonly STORAGE_KEY = 'encrypted_app_data';
  private static readonly SALT_KEY = 'encryption_salt';
  
  // Generate encryption key from session token
  private static async generateKey(sessionToken: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionToken),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Get or create salt
    let salt: Uint8Array;
    const storedSalt = localStorage.getItem(this.SALT_KEY);
    if (storedSalt) {
      salt = new Uint8Array(JSON.parse(storedSalt));
    } else {
      salt = crypto.getRandomValues(new Uint8Array(16));
      localStorage.setItem(this.SALT_KEY, JSON.stringify(Array.from(salt)));
    }
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // Encrypt data
  private static async encrypt(data: unknown, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encoder.encode(JSON.stringify(data))
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  }
  
  // Decrypt data
  private static async decrypt(encryptedData: string, key: CryptoKey): Promise<unknown> {
    const decoder = new TextDecoder();
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encrypted
    );
    
    return JSON.parse(decoder.decode(decrypted));
  }
  
  // Public methods
  static async get(sessionToken: string): Promise<unknown | null> {
    if (typeof window === 'undefined' || !sessionToken) return null;
    
    try {
      const encrypted = localStorage.getItem(this.STORAGE_KEY);
      if (!encrypted) return null;
      
      const key = await this.generateKey(sessionToken);
      const decrypted = await this.decrypt(encrypted, key);
      const data = decrypted as {token: string, content: unknown, timestamp: number};
      
      // Verify token matches
      if (data.token !== sessionToken) return null;
      
      // Check expiration (24 hours)
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        this.clear();
        return null;
      }
      
      return data.content;
    } catch {
      // Silent fail for security
      console.error('Storage access failed');
      return null;
    }
  }
  
  static async set(sessionToken: string, content: unknown): Promise<void> {
    if (typeof window === 'undefined' || !sessionToken) return;
    
    try {
      const data = {
        token: sessionToken,
        content,
        timestamp: Date.now()
      };
      
      const key = await this.generateKey(sessionToken);
      const encrypted = await this.encrypt(data, key);
      
      localStorage.setItem(this.STORAGE_KEY, encrypted);
    } catch {
      // Silent fail for security
      console.error('Storage write failed');
    }
  }
  
  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SALT_KEY);
  }
}