import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sakhi – Voice scheme friend | सखी | సఖి",
  description:
    "Talk in Telugu, Hindi or English and find the government schemes you qualify for. No login. Works offline.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "Sakhi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8590c",
};

/* Apply saved screen mode, text size and colour strength before first paint. */
const bootScript = `(function(){try{
var s=JSON.parse(localStorage.getItem('sakhi-settings')||'{}');
var d=document.documentElement;
var theme=s.theme||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
d.setAttribute('data-theme',theme);
d.style.fontSize=(s.fontScale||100)+'%';
if(s.saturation&&s.saturation!==100)d.style.filter='saturate('+s.saturation+'%)';
if(s.lang)d.lang=s.lang;
}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
