import { LinkedInAdapter } from "./linkedin";
import { TokyoDevAdapter } from "./tokyodev";
import { PlatformAdapter } from "./platform-adapter";
import { AppWelcomeToTheJungleAdapter } from "./app-welcome-to-the-jungle";
import { WelcomeToTheJungleAdapter } from "./welcome-to-the-jungle";

export class AdapterRegistry {
  private adapters: PlatformAdapter[] = [];

  /**
   * Register a new platform adapter
   */
  register(adapter: PlatformAdapter): void {
    if (this.adapters.some((a) => a.name === adapter.name)) {
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
    return this.adapters.find((adapter) => adapter.matches(url)) || null;
  }

  /**
   * Get an adapter by its name
   */
  getAdapterByName(name: string): PlatformAdapter | null {
    return this.adapters.find((adapter) => adapter.name === name) || null;
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

adapterRegistry.register(new LinkedInAdapter());
adapterRegistry.register(new TokyoDevAdapter());
adapterRegistry.register(new AppWelcomeToTheJungleAdapter());
adapterRegistry.register(new WelcomeToTheJungleAdapter());
