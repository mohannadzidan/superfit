import { PlatformAdapter } from './types';

export class AdapterRegistry {
  private adapters: PlatformAdapter[] = [];

  /**
   * Register a new platform adapter
   */
  register(adapter: PlatformAdapter): void {
    if (this.adapters.some(a => a.name === adapter.name)) {
      console.warn(`Adapter with name ${adapter.name} is already registered.`);
      return;
    }
    this.adapters.push(adapter);
    console.log(`Registered adapter: ${adapter.name}`);
  }

  /**
   * Get the appropriate adapter for a given URL
   * @returns The matching adapter or null
   */
  getAdapter(url: string): PlatformAdapter | null {
    return this.adapters.find(adapter => adapter.matches(url)) || null;
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): PlatformAdapter[] {
    return [...this.adapters];
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();
