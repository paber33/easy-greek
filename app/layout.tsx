import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NavigationWrapper } from "@/components/navigation-wrapper";
import { ProfileProvider } from "@/app/providers/ProfileProvider";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Easy Greek - Spaced Repetition Learning",
  description: "Учите греческий язык с умным FSRS-lite алгоритмом повторений",
  keywords: "греческий язык, изучение языков, spaced repetition, FSRS",
  authors: [{ name: "Easy Greek Team" }],
  robots: "index, follow",
  openGraph: {
    title: "Easy Greek - Spaced Repetition Learning",
    description: "Учите греческий язык с умным FSRS-lite алгоритмом повторений",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ProfileProvider>
            <NavigationWrapper>{children}</NavigationWrapper>
            <Toaster />
          </ProfileProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
