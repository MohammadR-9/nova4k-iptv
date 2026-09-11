export interface SavedServer {
  url: string;
  name?: string;
  lastUsed: number;
}

export class UrlHistoryService {
  private static STORAGE_KEY = 'nova_server_history_urls';

  private static DEFAULT_PRESETS: SavedServer[] = [
    { url: 'http://look.5g.in:8080', name: 'Look 5G Official', lastUsed: Date.now() },
    { url: 'http://look4k.net:8080', name: 'Look 4K Portal', lastUsed: Date.now() - 1000 }
  ];

  public static getHistory(): SavedServer[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed: SavedServer[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading URL history:', e);
    }
    return this.DEFAULT_PRESETS;
  }

  public static saveUrl(url: string, name?: string): void {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl) return;

    try {
      const current = this.getHistory();
      // Remove existing duplicate
      const filtered = current.filter(s => s.url.toLowerCase() !== cleanUrl.toLowerCase());
      
      const newEntry: SavedServer = {
        url: cleanUrl,
        name: name || this.guessServerName(cleanUrl),
        lastUsed: Date.now()
      };

      // Keep up to 10 recent servers
      const updated = [newEntry, ...filtered].slice(0, 10);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

      // Also set as current master DNS
      localStorage.setItem('nova_master_dns', cleanUrl);
    } catch (e) {
      console.warn('Error saving URL history:', e);
    }
  }

  public static removeUrl(urlToRemove: string): SavedServer[] {
    try {
      const current = this.getHistory();
      const updated = current.filter(s => s.url.toLowerCase() !== urlToRemove.trim().toLowerCase());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return this.getHistory();
    }
  }

  private static guessServerName(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
      const host = parsed.hostname;
      if (host.includes('look')) return 'Look Server';
      if (host.includes('shamna')) return 'Shamna Server';
      if (host.includes('asmr')) return 'ASMR Server';
      return host;
    } catch {
      return url.replace(/^https?:\/\//, '').split(':')[0] || 'سيرفر مخصص';
    }
  }
}
