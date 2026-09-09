import type { MetadataRoute } from "next"
import { SITE_DISPLAY_NAME, SITE_ORIGIN } from "@/lib/site-url"
import { LAYOUT_DESCRIPTION } from "@/lib/meta-description"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Login - ${SITE_DISPLAY_NAME}`,
    short_name: SITE_DISPLAY_NAME,
    description: LAYOUT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0069aa",
    icons: [
      {
        src: "/favicon.png",
        sizes: "33x33",
        type: "image/png",
      },
      {
        src: "/icon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    id: SITE_ORIGIN,
  }
}
