import type { AppProps } from "next/app";
import { Inter } from "@next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        * {
          padding: 0;
          margin: 0;
          color: rgb(65, 65, 65);
        }

        html {
          font-family: ${inter.style.fontFamily};
        }

        body {
          display: flex;
          flex-direction: column;
          background: linear-gradient(30deg, #22a7f0, #2263f0);
          height: 100vh;
        }

        #__next {
          height: 100%;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
