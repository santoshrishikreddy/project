import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sakhi – Voice scheme friend",
    short_name: "Sakhi",
    description: "Talk in Telugu, Hindi or English and find the government schemes you qualify for. No login.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7ec",
    theme_color: "#e8590c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
