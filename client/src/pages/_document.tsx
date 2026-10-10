import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta http-equiv="Cross-Origin-Opener-Policy" content="unsafe-none" />
        <meta http-equiv="Cross-Origin-Embedder-Policy" content="unsafe-none" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" crossOrigin="anonymous"></script>
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
