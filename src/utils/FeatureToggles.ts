/**
 * FeatureToggles - Singleton class for managing feature toggle configuration
 * 
 * Reads configuration from config.txt and provides access to feature toggle states.
 * Supports default values for development and production environments.
 */

interface FeatureToggleConfig {
  show_fps: boolean;
  show_mods: boolean;
  show_cli: boolean;
  enable_day_night_keys: boolean;
}

export class FeatureToggles {
  private static instance: FeatureToggles | null = null;
  private config: Map<string, boolean>;

  // Default configuration values
  private static readonly DEFAULT_CONFIG: FeatureToggleConfig = {
    show_fps: import.meta.env.DEV,  // On in dev, off in prod
    show_mods: true,
    show_cli: true,
    enable_day_night_keys: import.meta.env.DEV,  // On in dev, off in prod
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = new Map<string, boolean>();
    this.initializeDefaults();
  }

  /**
   * Get the singleton instance of FeatureToggles
   */
  public static getInstance(): FeatureToggles {
    if (FeatureToggles.instance === null) {
      FeatureToggles.instance = new FeatureToggles();
    }
    return FeatureToggles.instance;
  }

  /**
   * Initialize config Map with default values
   */
  private initializeDefaults(): void {
    this.config.set('show_fps', FeatureToggles.DEFAULT_CONFIG.show_fps);
    this.config.set('show_mods', FeatureToggles.DEFAULT_CONFIG.show_mods);
    this.config.set('show_cli', FeatureToggles.DEFAULT_CONFIG.show_cli);
    this.config.set('enable_day_night_keys', FeatureToggles.DEFAULT_CONFIG.enable_day_night_keys);
  }

  /**
   * Load configuration from config.txt file
   * Falls back to defaults if file is missing or cannot be read
   */
  public async load(): Promise<void> {
    try {
      const response = await fetch('/config.txt');
      
      // Handle 404 - file not found
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Feature toggles config not found, using defaults');
        } else {
          console.warn(`Failed to load config.txt (status ${response.status}), using defaults`);
        }
        return;
      }
      
      // Parse the config file
      const text = await response.text();
      this.parseConfig(text);
    } catch (error) {
      // Handle fetch errors (network issues, etc.)
      console.error('Error loading feature toggles:', error);
      // Continue with defaults - already initialized in constructor
    }
  }

  /**
   * Check if a feature toggle is enabled
   * Returns default value if key is not found
   */
  public isEnabled(key: string): boolean {
    // Check if key exists in config Map
    if (this.config.has(key)) {
      return this.config.get(key)!;
    }
    
    // Return default value if missing
    const defaultConfig: Record<string, boolean> = {
      show_fps: FeatureToggles.DEFAULT_CONFIG.show_fps,
      show_mods: FeatureToggles.DEFAULT_CONFIG.show_mods,
      show_cli: FeatureToggles.DEFAULT_CONFIG.show_cli,
      enable_day_night_keys: FeatureToggles.DEFAULT_CONFIG.enable_day_night_keys,
    };
    return defaultConfig[key] ?? false;
  }

  /**
   * Get all toggle states as an object (for debugging)
   */
  public getAll(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.config.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Parse configuration text and update config Map
   */
  private parseConfig(text: string): void {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (trimmedLine === '') {
        continue;
      }
      
      // Skip comment lines
      if (trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse key=value format
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue; // Skip lines without =
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Skip if key is empty
      if (key === '') {
        continue;
      }
      
      // Validate value is "on" or "off"
      if (value === 'on') {
        this.config.set(key, true);
      } else if (value === 'off') {
        this.config.set(key, false);
      } else {
        // Invalid value - default to false and log warning
        console.warn(`Invalid toggle value for ${key}: ${value}, using 'off'`);
        this.config.set(key, false);
      }
    }
  }
}
