import { Permission } from "./Permission";

export interface Widget {
  // Generated
  id: string;                                     // Generated from filename
  fileName: string;                               // The filename for the widgetConfig, filled by WidgetFileSystemService

  // User given
  name: string                                    // A name for the widget, this does not have to be unique
  html: string                                    // The html page that should be loaded for a custom widget
  url: string;                                    // The url which should be loaded
  x: number;                                      // Horizontal postion of the upper left corner of the widget
  y: number;                                      // Vertical postion of the upper left corner of the widget
  width: number;                                  // Width of the widget
  height: number;                                 // Height of the widget
  touchEnabled: boolean;                          // Indicates whether touchcontrols are simulated, especially great in combination with a mobile user agent (will still allow normal controls as well)
  enabled: boolean;                               // Toggle widget on or off
  customUserAgent: { [domain: string]: string };  // Mapping of domains to custom user agents (Some widget will make calls to different websites, which might require different user agents. CloudFlare or Google Login requests for example)
  permissions: { [key in Permission]?: boolean }; // Mapping of permissions a widget may ask for which you want to always accept/decline. (Example: Geolocation)
  customScript: string                            // A custom JS script you want to be loaded on the widget webpage
  devTools: boolean                               // Enable developer tools for this widget
}
