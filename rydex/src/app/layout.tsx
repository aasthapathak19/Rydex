import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Provider from "@/lib/Provider";
import ReduxProvider from "@/redux/ReduxProvider";
import InitUser from "@/InitUser";
import "./globals.css";
import "leaflet/dist/leaflet.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RYDEX - Smart Vehicle Booking Platform",
  description: "Rydex provides ride booking, partner onboarding, vehicle management, real-time tracking, payments and communication. Advanced verification is planned for a future production release.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Provider>
          <ReduxProvider>
            <InitUser/>
  {children}
          </ReduxProvider>
        </Provider>
        
      </body>
    </html>
  );
}
