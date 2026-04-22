import type { MetadataRoute } from "next"
import { appConfig } from "@/lib/app-config"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.name,
    short_name: appConfig.shortName,
    description: `${appConfig.description} als installierbare App`,
    start_url: appConfig.startUrl,
    display: "standalone",
    orientation: "portrait",
    background_color: appConfig.backgroundColor,
    theme_color: appConfig.themeColor,
    lang: "de-DE",
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}